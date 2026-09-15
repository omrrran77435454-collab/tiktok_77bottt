import type { Env } from '../env';
import { errors } from './http';
import { readBearerToken, verifyIdToken } from './firebase-auth';
import { checkChannelMembership } from './telegram';
import { channelUrl } from './telegram-messages';
import {
  getTelegramConnectionByUser,
  syncAccessRole,
  updateMembership,
  upsertUserFromIdentity,
  type TelegramConnectionRow,
  type UserRow,
} from './repo';
import { resolveAccessRole } from './access';
import type { AccessRole, TelegramGateState } from '@shared/types';

/**
 * مدة صلاحية نتيجة التحقّق **الإيجابية** قبل إعادة السؤال (24 ساعة).
 * تنطبق على من تأكّد اشتراكه فقط، حتى لا نُرهق Telegram بلا فائدة.
 */
export const MEMBERSHIP_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * مدة صلاحية النتيجة **السلبية** (دقيقة واحدة).
 *
 * هذا هو جوهر إصلاح خطأ «يرجعني إلى بوابة تيليجرام بعد الاشتراك»:
 * عند الربط نسأل Telegram فوراً، والمستخدم غالباً لم يشترك بعد، فتُخزَّن
 * النتيجة «غير مشترك». لو طبّقنا عليها نفس مهلة الـ 24 ساعة لبقي الجواب
 * «غير مشترك» يوماً كاملاً حتى بعد اشتراكه الفعلي، فيُعاد إلى البوابة في كل
 * مرة. النتيجة السلبية إذن قصيرة العمر، والإيجابية طويلة.
 */
export const NOT_MEMBER_TTL_MS = 60 * 1000;

export interface AuthedContext {
  user: UserRow;
  /** صلاحية النظام المشتقّة من التوكن في هذا الطلب — لا من جسم الطلب. */
  role: AccessRole;
  /** هوية موثوقة مستخرَجة من التوكن (للبريد وحالة تأكيده). */
  emailVerified: boolean;
}

export interface GateResult extends AuthedContext {
  connection: TelegramConnectionRow | null;
  state: TelegramGateState;
  canUseTools: boolean;
}

function buildState(env: Env, connection: TelegramConnectionRow | null): TelegramGateState {
  return {
    linked: !!connection,
    isMember: connection ? connection.is_member === 1 : false,
    lastCheckedAt: connection?.last_checked_at ?? null,
    telegramUsername: connection?.telegram_username ?? null,
    // مصدر واحد للرابط: نفس ما يظهر في رسائل البوت.
    channelJoinUrl: channelUrl(env),
    botUsername: env.TELEGRAM_BOT_USERNAME ?? '',
  };
}

/**
 * يتحقّق من Firebase ID Token ويضمن وجود صفّ للمستخدم في D1.
 *
 * هذه هي النقطة الوحيدة التي تُشتقّ منها هوية المستخدم في النظام كله.
 */
export async function authenticate(
  request: Request,
  env: Env,
): Promise<AuthedContext | Response> {
  const result = await verifyIdToken(readBearerToken(request), env);

  if (!result.ok) {
    if (result.reason === 'unavailable') {
      return errors.serviceUnavailable('تعذّر التحقق من هويتك حالياً. حاول بعد قليل.');
    }
    if (result.reason === 'expired') {
      return errors.unauthorized('انتهت صلاحية جلستك. سجّل الدخول مرة أخرى.');
    }
    return errors.unauthorized();
  }

  const { user } = await upsertUserFromIdentity(env.DB, result.identity);

  /*
   * الصلاحية تُحسب هنا في كل طلب من التوكن الموقَّع + ADMIN_EMAIL، لا من
   * العمود المخزَّن ولا من أي شيء يرسله العميل. العمود يُزامَن بعدها ليبقى
   * أثراً صحيحاً للمراجعة والإحصاءات.
   */
  const role = resolveAccessRole(result.identity, env, user.access_role);
  if (user.access_role !== role) {
    await syncAccessRole(env.DB, user.id, role);
  }

  return {
    user: { ...user, access_role: role, role },
    role,
    emailVerified: result.identity.emailVerified,
  };
}

/** هل حان وقت إعادة سؤال Telegram عن هذا الاشتراك؟ */
export function membershipIsStale(
  connection: Pick<TelegramConnectionRow, 'is_member' | 'last_checked_at'>,
  now = Date.now(),
): boolean {
  const lastChecked = connection.last_checked_at ? Date.parse(connection.last_checked_at) : 0;
  if (!lastChecked || Number.isNaN(lastChecked)) return true;

  const ttl = connection.is_member === 1 ? MEMBERSHIP_TTL_MS : NOT_MEMBER_TTL_MS;
  return now - lastChecked > ttl;
}

/**
 * يحسب حالة البوابة للمستخدم الحالي.
 *
 * سياسة التحقّق: لا نستدعي Telegram في كل طلب.
 *   - المشترك المؤكَّد: نعيد السؤال بعد 24 ساعة.
 *   - غير المشترك: نعيد السؤال بعد دقيقة، فيظهر اشتراكه الجديد فوراً تقريباً.
 *   - عند طلب صريح من المستخدم (forceCheck): نسأل الآن بلا أي مهلة.
 *
 * إذا فشل Telegram نُبقي آخر حالة معروفة ولا نحدّث last_checked_at
 * حتى نعيد المحاولة لاحقاً بدل حرمان المستخدم بسبب عطل مؤقت.
 */
export async function evaluateGate(
  request: Request,
  env: Env,
  options: { forceCheck?: boolean } = {},
): Promise<GateResult | Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  let connection = await getTelegramConnectionByUser(env.DB, auth.user.id);

  if (connection) {
    if (options.forceCheck || membershipIsStale(connection)) {
      const outcome = await checkChannelMembership(env, connection.telegram_user_id);
      if (outcome.ok) {
        await updateMembership(env.DB, auth.user.id, outcome.isMember);
        connection = {
          ...connection,
          is_member: outcome.isMember ? 1 : 0,
          last_checked_at: new Date().toISOString(),
        };
      }
    }
  }

  const state = buildState(env, connection);
  return {
    ...auth,
    connection,
    state,
    // الإدمن يخضع لنفس البوابة عند استخدام الأدوات — الاستثناء للوحة الإدارة فقط.
    canUseTools: state.linked && state.isMember,
  };
}

/**
 * يتحقق أن المستخدم إدمن فعلاً حسب قاعدة البيانات (وليس حسب ما يرسله العميل).
 *
 * الإدمن مالك المنصّة، فلا تمنعه بوابة الاشتراك من دخول لوحة الإدارة.
 */
export async function requireAdmin(
  request: Request,
  env: Env,
): Promise<AuthedContext | Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'admin') return errors.forbidden();
  return auth;
}
