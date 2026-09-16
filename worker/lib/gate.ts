import type { Env } from '../env';
import { errors } from './http';
import { readBearerToken, verifyIdToken } from './firebase-auth';
import { channelUrl } from './telegram-messages';
import {
  getTelegramConnectionByUser,
  syncAccessRole,
  upsertUserFromIdentity,
  type TelegramConnectionRow,
  type UserRow,
} from './repo';
import { resolveAccessRole } from './access';
import type { AccessRole, TelegramLinkState } from '@shared/types';

/**
 * المصادقة وحالة الجلسة.
 *
 * لا توجد هنا بوابة تيليجرام: الاشتراك في القناة وربط الحساب اختياريان
 * بالكامل ولا يدخلان في أي قرار وصول. لذلك لا يُستدعى Telegram API إطلاقاً
 * في مسار طلب المستخدم، فلا يستطيع عطل في تيليجرام أن يمنع أحداً من الدخول.
 */

export interface AuthedContext {
  user: UserRow;
  /** صلاحية النظام المشتقّة من التوكن في هذا الطلب — لا من جسم الطلب. */
  role: AccessRole;
  /** هوية موثوقة مستخرَجة من التوكن (للبريد وحالة تأكيده). */
  emailVerified: boolean;
}

export interface SessionResult extends AuthedContext {
  connection: TelegramConnectionRow | null;
  telegram: TelegramLinkState;
}

function buildLinkState(env: Env, connection: TelegramConnectionRow | null): TelegramLinkState {
  return {
    linked: !!connection,
    telegramUsername: connection?.telegram_username ?? null,
    // مصدر واحد للرابط: نفس ما يظهر في رسائل البوت وفي بطاقة القناة.
    channelUrl: channelUrl(env),
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

/**
 * الجلسة الكاملة: الهوية + الصلاحية + حالة ربط تيليجرام للعرض.
 *
 * قراءة قاعدة بيانات واحدة إضافية فقط؛ لا نداء خارجي ولا قرار وصول.
 */
export async function loadSession(
  request: Request,
  env: Env,
): Promise<SessionResult | Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  const connection = await getTelegramConnectionByUser(env.DB, auth.user.id);
  return { ...auth, connection, telegram: buildLinkState(env, connection) };
}

/**
 * يتحقق أن المستخدم إدمن فعلاً حسب التوكن الموقَّع (وليس حسب ما يرسله العميل).
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
