import type { RouteContext } from '../lib/router';
import { errors, json, readJson } from '../lib/http';
import { authenticate } from '../lib/gate';
import { generateSecureToken, sha256Hex, timingSafeEqual } from '../lib/crypto';
import {
  checkChannelMembership,
  parseStartCommand,
  sendTelegramMessage,
  type TelegramUpdate,
} from '../lib/telegram';
import { botMessages } from '../lib/telegram-messages';
import {
  consumeLinkToken,
  createLinkToken,
  deleteTelegramConnection,
  findLinkTokenByHash,
  getTelegramConnectionByTelegramId,
  getTelegramConnectionByUser,
  insertUsageEvent,
  purgeExpiredLinkTokens,
  upsertTelegramConnection,
} from '../lib/repo';
import type { LinkTokenResponse } from '@shared/types';

/** صلاحية توكن الربط: 10 دقائق. */
const LINK_TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * POST /api/telegram/link-token
 * ينشئ توكن ربط لمرة واحدة ويُرجع رابط تيليجرام العميق.
 * التوكن نفسه لا يُخزَّن — نخزّن بصمة SHA-256 فقط.
 */
export async function handleCreateLinkToken({ request, env }: RouteContext): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  const user = auth.user;

  if (!env.TELEGRAM_BOT_USERNAME) return errors.notConfigured();

  const existing = await getTelegramConnectionByUser(env.DB, user.id);
  if (existing) {
    return errors.badRequest('حساب تيليجرام مربوط بالفعل بهذا الحساب.');
  }

  const token = generateSecureToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS).toISOString();

  await createLinkToken(env.DB, user.id, tokenHash, expiresAt);

  const body: LinkTokenResponse = {
    deepLink: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${token}`,
    expiresAt,
  };
  return json(body);
}

/**
 * POST /api/telegram/webhook
 *
 * نقطة الدخول الوحيدة التي يُسمح فيها بربط حساب تيليجرام.
 * العميل لا يستطيع إطلاقاً إرسال telegram_user_id والادّعاء أنه حسابه.
 *
 * الحماية:
 *  1) التحقق من ترويسة X-Telegram-Bot-Api-Secret-Token بمقارنة ثابتة الزمن.
 *  2) التوكن لمرة واحدة فقط (UPDATE ذرّي بشرط used_at IS NULL).
 *  3) انتهاء الصلاحية بعد 10 دقائق.
 *  4) حساب تيليجرام واحد لا يفتح أكثر من حساب موقع.
 */
export async function handleTelegramWebhook({ request, env }: RouteContext): Promise<Response> {
  const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
  if (!env.TELEGRAM_WEBHOOK_SECRET || !timingSafeEqual(secretHeader, env.TELEGRAM_WEBHOOK_SECRET)) {
    // لا نكشف السبب — أي طلب بلا السر الصحيح يُرفض كأن المسار غير موجود.
    return errors.unauthorized();
  }

  const update = (await readJson(request)) as TelegramUpdate | null;
  const message = update?.message;
  const from = message?.from;

  // نرد دائماً 200 لتيليجرام حتى لا يعيد إرسال التحديث بلا فائدة.
  const ok = () => json({ ok: true });

  if (!from || from.is_bot || !message?.chat) return ok();

  const telegramUserId = String(from.id);
  const chatId = message.chat.id;
  const token = parseStartCommand(message.text);

  if (!token) {
    // الحساب مربوط مسبقاً؟ لا نطلب منه الربط من جديد.
    const linked = await getTelegramConnectionByTelegramId(env.DB, telegramUserId);
    await sendTelegramMessage(
      env,
      chatId,
      linked ? botMessages.alreadyLinked(env) : botMessages.welcome(env),
    );
    return ok();
  }

  const tokenHash = await sha256Hex(token);
  const row = await findLinkTokenByHash(env.DB, tokenHash);

  if (!row || row.used_at || Date.parse(row.expires_at) < Date.now()) {
    await sendTelegramMessage(env, chatId, botMessages.expiredToken(env));
    return ok();
  }

  // حساب تيليجرام واحد = حساب موقع واحد.
  const alreadyLinked = await getTelegramConnectionByTelegramId(env.DB, telegramUserId);
  if (alreadyLinked && alreadyLinked.user_id !== row.user_id) {
    await sendTelegramMessage(env, chatId, botMessages.linkedToAnotherAccount(env));
    return ok();
  }

  const consumed = await consumeLinkToken(env.DB, row.id);
  if (!consumed) {
    await sendTelegramMessage(env, chatId, botMessages.expiredToken(env));
    return ok();
  }

  /*
   * نسأل تيليجرام عن العضوية مرّة واحدة هنا لأغراض إحصاءات الإدارة فقط.
   * لا أثر لها إطلاقاً على وصول المستخدم: فشل السؤال أو كونه غير مشترك
   * لا يمنعه من شيء، والمسار كله خادم-إلى-خادم لا يمرّ به طلب المستخدم.
   */
  const membership = await checkChannelMembership(env, telegramUserId);
  const isMember = membership.ok ? membership.isMember : false;

  await upsertTelegramConnection(env.DB, {
    userId: row.user_id,
    telegramUserId,
    telegramUsername: from.username ?? null,
    isMember,
    lastCheckedAt: membership.ok ? new Date().toISOString() : null,
  });

  /*
   * لا ترقية إدارية هنا.
   * كانت الصلاحية تُمنح سابقاً لمن يطابق معرّف تيليجرام، وهذا مسار أضعف:
   * معرّف تيليجرام لا يثبت ملكية حساب المنصّة. الصلاحية الآن تُشتقّ في كل
   * طلب من بريد مؤكَّد في توكن Firebase مطابق لـ ADMIN_EMAIL، ولا شيء غيره.
   */

  await insertUsageEvent(env.DB, {
    userId: row.user_id,
    eventType: 'telegram_linked',
    toolId: null,
    templateId: null,
    primaryColor: null,
  });

  await sendTelegramMessage(env, chatId, botMessages.linked(env));

  // تنظيف انتهازي للتوكنات المنتهية (عملية خفيفة وغير متكرّرة).
  await purgeExpiredLinkTokens(env.DB);

  return ok();
}

/**
 * POST /api/telegram/unlink
 * يفكّ ربط تيليجرام فقط — لا يمسّ حساب Google ولا يحذف المستخدم ولا يؤثّر
 * في وصوله إلى المنصّة (الربط اختياري أصلاً). بعدها يستطيع ربط حساب تيليجرام
 * آخر، ويصبح الحساب القديم متاحاً للربط بحساب منصّة آخر.
 */
export async function handleUnlinkTelegram({ request, env }: RouteContext): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  const removed = await deleteTelegramConnection(env.DB, auth.user.id);
  if (!removed) {
    return errors.badRequest('لا يوجد حساب تيليجرام مرتبط بحسابك.');
  }

  await insertUsageEvent(env.DB, {
    userId: auth.user.id,
    eventType: 'telegram_unlinked',
    toolId: null,
    templateId: null,
    primaryColor: null,
  });

  return json({ ok: true });
}
