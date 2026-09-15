import type { Env } from '../env';
import { errors } from './http';
import { readBearerToken, verifyIdToken } from './firebase-auth';
import { checkChannelMembership } from './telegram';
import { channelUrl } from './telegram-messages';
import {
  getTelegramConnectionByUser,
  updateMembership,
  upsertUserFromIdentity,
  type TelegramConnectionRow,
  type UserRow,
} from './repo';
import type { TelegramGateState, UserRole } from '@shared/types';

/** مدة صلاحية نتيجة التحقّق من الاشتراك قبل إعادة السؤال (24 ساعة). */
export const MEMBERSHIP_TTL_MS = 24 * 60 * 60 * 1000;

export interface AuthedContext {
  user: UserRow;
  role: UserRole;
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
  return { user, role: user.role };
}

/**
 * يحسب حالة البوابة للمستخدم الحالي.
 *
 * سياسة التحقّق: لا نستدعي Telegram في كل طلب. نعيد التحقّق فقط عندما تمضي
 * أكثر من 24 ساعة على آخر فحص (أو عند طلب صريح من المستخدم).
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
    const lastChecked = connection.last_checked_at ? Date.parse(connection.last_checked_at) : 0;
    const isStale = !lastChecked || Date.now() - lastChecked > MEMBERSHIP_TTL_MS;

    if (options.forceCheck || isStale) {
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
