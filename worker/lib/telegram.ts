import type { Env } from '../env';

const DEFAULT_API_BASE = 'https://api.telegram.org';

/**
 * حالات العضوية التي تعني أن المستخدم "لا يزال داخل القناة".
 * المرجع: Telegram Bot API — ChatMember (creator | administrator | member |
 * restricted | left | kicked).
 * الحالة restricted تعني مقيَّد؛ وهو عضو فقط عندما تكون is_member = true.
 */
const ACTIVE_STATUSES = new Set(['creator', 'administrator', 'member']);

export interface ChatMemberResult {
  status: string;
  is_member?: boolean;
}

export type MembershipOutcome =
  | { ok: true; isMember: boolean; status: string }
  | { ok: false; reason: 'api_error' | 'not_configured' };

function apiBase(env: Env): string {
  return (env.TELEGRAM_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, '');
}

async function callTelegram<T>(
  env: Env,
  method: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true; result: T } | { ok: false }> {
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false };
  try {
    const response = await fetch(`${apiBase(env)}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await response.json()) as { ok?: boolean; result?: T };
    if (!response.ok || !data.ok) return { ok: false };
    return { ok: true, result: data.result as T };
  } catch {
    // لا نُسرّب تفاصيل الخطأ — الطبقة الأعلى تعرض رسالة عربية عامة.
    return { ok: false };
  }
}

/** يتحقّق من اشتراك مستخدم في القناة عبر getChatMember. */
export async function checkChannelMembership(
  env: Env,
  telegramUserId: string,
): Promise<MembershipOutcome> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHANNEL_ID) {
    return { ok: false, reason: 'not_configured' };
  }

  const response = await callTelegram<ChatMemberResult>(env, 'getChatMember', {
    chat_id: env.TELEGRAM_CHANNEL_ID,
    user_id: Number(telegramUserId),
  });

  if (!response.ok) return { ok: false, reason: 'api_error' };
  return {
    ok: true,
    isMember: isActiveMember(response.result),
    status: response.result.status,
  };
}

/** منطق تحويل نتيجة getChatMember إلى "عضو / غير عضو" — مُختبَر في الوحدات. */
export function isActiveMember(member: ChatMemberResult | null | undefined): boolean {
  if (!member || typeof member.status !== 'string') return false;
  if (ACTIVE_STATUSES.has(member.status)) return true;
  // المقيَّد لا يزال عضواً طالما is_member = true.
  if (member.status === 'restricted') return member.is_member === true;
  return false;
}

/** يرسل رسالة نصية للمستخدم في تيليجرام (تأكيد الربط مثلاً). */
export async function sendTelegramMessage(
  env: Env,
  chatId: number | string,
  text: string,
): Promise<boolean> {
  const response = await callTelegram(env, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
  return response.ok;
}

/** شكل تحديث تيليجرام الذي نهتم به فقط (رسالة نصية). */
export interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id: number; type?: string };
    from?: { id: number; is_bot?: boolean; username?: string; first_name?: string };
  };
}

/**
 * يستخرج توكن الربط من أمر /start.
 * يقبل: "/start ABC" و "/start@bot ABC" ويتجاهل ما عدا ذلك.
 */
export function parseStartCommand(text: string | undefined | null): string | null {
  if (typeof text !== 'string') return null;
  const match = /^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(\S+))?\s*$/.exec(text.trim());
  if (!match) return null;
  return match[1] ?? null;
}
