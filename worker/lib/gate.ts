import type { Env } from '../env';
import { getSessionUser, type AuthedUser } from '../auth';
import { errors } from './http';
import { checkChannelMembership } from './telegram';
import {
  getTelegramConnectionByUser,
  getUserRole,
  updateMembership,
  type TelegramConnectionRow,
} from './repo';
import type { TelegramGateState, UserRole } from '@shared/types';

/** مدة صلاحية نتيجة التحقق من الاشتراك قبل إعادة السؤال (24 ساعة). */
export const MEMBERSHIP_TTL_MS = 24 * 60 * 60 * 1000;

export interface GateResult {
  user: AuthedUser;
  role: UserRole;
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
    channelJoinUrl: env.TELEGRAM_CHANNEL_JOIN_URL ?? '',
    botUsername: env.TELEGRAM_BOT_USERNAME ?? '',
  };
}

/**
 * يحسب حالة البوابة للمستخدم الحالي.
 *
 * سياسة التحقق: لا نستدعي Telegram في كل طلب. نعيد التحقق فقط عندما تمضي
 * أكثر من 24 ساعة على آخر فحص (أو عند طلب صريح من المستخدم).
 * إذا فشل Telegram نُبقي آخر حالة معروفة ولا نحدّث last_checked_at
 * حتى نعيد المحاولة لاحقاً بدل حرمان المستخدم بسبب عطل مؤقت.
 */
export async function evaluateGate(
  request: Request,
  env: Env,
  options: { forceCheck?: boolean } = {},
): Promise<GateResult | Response> {
  const user = await getSessionUser(request, env);
  if (!user) return errors.unauthorized();

  const role = await getUserRole(env.DB, user.id);
  let connection = await getTelegramConnectionByUser(env.DB, user.id);

  if (connection) {
    const lastChecked = connection.last_checked_at ? Date.parse(connection.last_checked_at) : 0;
    const isStale = !lastChecked || Date.now() - lastChecked > MEMBERSHIP_TTL_MS;

    if (options.forceCheck || isStale) {
      const outcome = await checkChannelMembership(env, connection.telegram_user_id);
      if (outcome.ok) {
        await updateMembership(env.DB, user.id, outcome.isMember);
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
    user,
    role,
    connection,
    state,
    // الإدمن يخضع لنفس البوابة تماماً — لا استثناء غير آمن.
    canUseTools: state.linked && state.isMember,
  };
}

/** يتحقق أن المستخدم إدمن فعلاً حسب قاعدة البيانات (وليس حسب ما يرسله العميل). */
export async function requireAdmin(
  request: Request,
  env: Env,
): Promise<{ user: AuthedUser } | Response> {
  const user = await getSessionUser(request, env);
  if (!user) return errors.unauthorized();
  const role = await getUserRole(env.DB, user.id);
  if (role !== 'admin') return errors.forbidden();
  return { user };
}
