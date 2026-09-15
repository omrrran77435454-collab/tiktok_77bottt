// @vitest-environment node
/**
 * يحرس الخطأ الحقيقي الذي ظهر على الإنتاج:
 * «بعد الاشتراك في القناة، الموقع يُعيدني إلى بوابة تيليجرام».
 *
 * السبب: نتيجة الفحص السلبية («غير مشترك») كانت تُخزَّن بنفس مهلة النتيجة
 * الإيجابية (24 ساعة). وبما أن الفحص يقع لحظة الربط — قبل أن يشترك المستخدم
 * عادةً — كان الجواب «غير مشترك» يبقى صالحاً يوماً كاملاً بعد اشتراكه الفعلي.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { D1SqliteShim } from '../scripts/d1-sqlite-shim.mjs';
import { identityToken } from './helpers/test-token';
import { MEMBERSHIP_TTL_MS, NOT_MEMBER_TTL_MS, membershipIsStale } from '../worker/lib/gate';

/* ------------------- الوحدة: متى نعيد سؤال Telegram؟ ------------------- */

describe('membershipIsStale', () => {
  const now = Date.parse('2026-04-01T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('المشترك المؤكَّد لا يُسأل مجدداً قبل 24 ساعة', () => {
    expect(
      membershipIsStale({ is_member: 1, last_checked_at: ago(60 * 60 * 1000) }, now),
    ).toBe(false);
  });

  it('المشترك المؤكَّد يُسأل بعد 24 ساعة', () => {
    expect(
      membershipIsStale({ is_member: 1, last_checked_at: ago(MEMBERSHIP_TTL_MS + 1000) }, now),
    ).toBe(true);
  });

  it('غير المشترك يُسأل من جديد بعد دقيقة — لا بعد يوم', () => {
    expect(
      membershipIsStale({ is_member: 0, last_checked_at: ago(NOT_MEMBER_TTL_MS + 1000) }, now),
    ).toBe(true);

    // نفس المدة بالضبط لا تكفي لإعادة سؤال المشترك المؤكَّد.
    expect(
      membershipIsStale({ is_member: 1, last_checked_at: ago(NOT_MEMBER_TTL_MS + 1000) }, now),
    ).toBe(false);
  });

  it('غير المشترك لا يُسأل في كل طلب خلال الدقيقة الواحدة', () => {
    expect(membershipIsStale({ is_member: 0, last_checked_at: ago(5000) }, now)).toBe(false);
  });

  it('الاتصال الذي لم يُفحص قطّ يُسأل فوراً', () => {
    expect(membershipIsStale({ is_member: 0, last_checked_at: null }, now)).toBe(true);
    expect(membershipIsStale({ is_member: 1, last_checked_at: 'ليس تاريخاً' }, now)).toBe(true);
  });
});

/* --------------------------- التكامل على الـ Worker --------------------------- */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const TELEGRAM_BASE = 'https://telegram.test';
const WEBHOOK_SECRET = 'webhook-secret-for-tests-only';
const TEST_SECRET = 'e2e-secret-for-tests-only';
const ORIGIN = 'http://localhost:5173';

const memberStatuses = new Map<string, string>();

let shim: InstanceType<typeof D1SqliteShim>;
let env: Record<string, unknown>;
let worker: { fetch: (request: Request, env: never, ctx: never) => Promise<Response> };

const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };

function call(path: string, init: RequestInit = {}, token?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Origin', ORIGIN);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  return worker.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }), env as never, ctx as never);
}

function post(path: string, body?: unknown, token?: string): Promise<Response> {
  return call(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, token);
}

let counter = 0;
function newUserToken(): string {
  counter += 1;
  const uid = `routing-${counter}-${Date.now()}`;
  return identityToken({ uid, email: `${uid}@example.com`, name: `مستخدم ${counter}` }, TEST_SECRET);
}

function webhook(linkToken: string | null, telegramUserId: number) {
  return call('/api/telegram/webhook', {
    method: 'POST',
    headers: { 'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET },
    body: JSON.stringify({
      message: {
        text: linkToken ? `/start ${linkToken}` : '/start',
        chat: { id: telegramUserId },
        from: { id: telegramUserId, username: `user${telegramUserId}` },
      },
    }),
  });
}

/** يربط الحساب بينما المستخدم **غير** مشترك — وهو الحال الطبيعي. */
async function linkWhileNotSubscribed(telegramUserId: number): Promise<string> {
  const token = newUserToken();
  await call('/api/me', {}, token);
  memberStatuses.set(String(telegramUserId), 'left');
  const response = await post('/api/telegram/link-token', undefined, token);
  const { deepLink } = (await response.json()) as { deepLink: string };
  await webhook(deepLink.split('start=')[1], telegramUserId);
  return token;
}

/** يرجّع آخر فحص إلى الماضي لتجاوز مهلة الدقيقة في الاختبار. */
function ageLastCheck(telegramUserId: number, ms: number) {
  const past = new Date(Date.now() - ms).toISOString();
  shim.exec(
    `UPDATE telegram_connections SET last_checked_at = '${past}' WHERE telegram_user_id = '${telegramUserId}'`,
  );
}

beforeAll(async () => {
  shim = new D1SqliteShim(':memory:');
  const dir = join(root, 'migrations');
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()) {
    shim.exec(readFileSync(join(dir, file), 'utf8'));
  }

  env = {
    DB: shim,
    ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
    FIREBASE_PROJECT_ID: 'teacher-tools-test',
    TELEGRAM_BOT_TOKEN: 'test:token',
    TELEGRAM_BOT_USERNAME: 'test_bot',
    TELEGRAM_CHANNEL_ID: '-1001111111111',
    TELEGRAM_CHANNEL_JOIN_URL: 'https://t.me/+test',
    TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET,
    TELEGRAM_API_BASE: TELEGRAM_BASE,
    ADMIN_TELEGRAM_ID: '5559869840',
    E2E_TEST_MODE: 'true',
    E2E_TEST_SECRET: TEST_SECRET,
  };

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.startsWith(TELEGRAM_BASE)) throw new Error(`طلب شبكة غير متوقّع: ${url}`);
    if (url.includes('getChatMember')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as { user_id: number };
      const status = memberStatuses.get(String(body.user_id)) ?? 'left';
      return new Response(
        JSON.stringify({ ok: true, result: { status, is_member: status === 'member' } }),
        { headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ ok: true, result: {} }), {
      headers: { 'content-type': 'application/json' },
    });
  });

  worker = (await import('../worker/index')).default as never;
});

beforeEach(() => memberStatuses.clear());

afterAll(() => {
  vi.unstubAllGlobals();
  shim.close();
});

describe('الاشتراك بعد الربط', () => {
  it('الخطأ الأصلي: الاشتراك بعد الربط يُعترف به ولا يُحبس يوماً كاملاً', async () => {
    const telegramId = 410001;
    const token = await linkWhileNotSubscribed(telegramId);

    // بعد الربط مباشرةً: مربوط وغير مشترك — وهو الصحيح.
    let me = (await (await call('/api/me', {}, token)).json()) as {
      telegram: { linked: boolean; isMember: boolean };
      canUseTools: boolean;
    };
    expect(me.telegram.linked).toBe(true);
    expect(me.canUseTools).toBe(false);

    // المستخدم يشترك الآن في القناة.
    memberStatuses.set(String(telegramId), 'member');

    // تمرّ دقيقة (المهلة السلبية) — ولا نقترب من الـ 24 ساعة إطلاقاً.
    ageLastCheck(telegramId, NOT_MEMBER_TTL_MS + 5_000);

    me = (await (await call('/api/me', {}, token)).json()) as typeof me;
    expect(me.telegram.isMember).toBe(true);
    expect(me.canUseTools).toBe(true);
  });

  it('حدّث الحالة يقرأ من الخادم فوراً بلا انتظار أي مهلة', async () => {
    const telegramId = 410002;
    const token = await linkWhileNotSubscribed(telegramId);

    memberStatuses.set(String(telegramId), 'member');

    // بلا تقادم: /api/me ما زال يعتمد النتيجة المخزّنة خلال الدقيقة.
    const cached = (await (await call('/api/me', {}, token)).json()) as { canUseTools: boolean };
    expect(cached.canUseTools).toBe(false);

    // الزر يفرض السؤال الآن.
    const response = await post('/api/telegram/status', undefined, token);
    expect(response.status).toBe(200);
    const session = (await response.json()) as {
      canUseTools: boolean;
      telegram: { isMember: boolean };
      profile: { onboardingCompleted: boolean };
    };

    expect(session.telegram.isMember).toBe(true);
    expect(session.canUseTools).toBe(true);
    // يُرجع حالة الجلسة كاملة فيعرف العميل وجهته التالية.
    expect(session.profile).toBeDefined();
  });

  it('حدّث الحالة يعكس فكّ الاشتراك أيضاً', async () => {
    const telegramId = 410003;
    const token = newUserToken();
    await call('/api/me', {}, token);
    memberStatuses.set(String(telegramId), 'member');
    const created = await post('/api/telegram/link-token', undefined, token);
    const { deepLink } = (await created.json()) as { deepLink: string };
    await webhook(deepLink.split('start=')[1], telegramId);

    expect(
      ((await (await call('/api/me', {}, token)).json()) as { canUseTools: boolean }).canUseTools,
    ).toBe(true);

    memberStatuses.set(String(telegramId), 'left');
    const session = (await (await post('/api/telegram/status', undefined, token)).json()) as {
      canUseTools: boolean;
    };
    expect(session.canUseTools).toBe(false);
  });

  it('المشترك المؤكَّد لا يفقد وصوله بسبب عطل مؤقت في Telegram', async () => {
    const telegramId = 410004;
    const token = newUserToken();
    await call('/api/me', {}, token);
    memberStatuses.set(String(telegramId), 'member');
    const created = await post('/api/telegram/link-token', undefined, token);
    const { deepLink } = (await created.json()) as { deepLink: string };
    await webhook(deepLink.split('start=')[1], telegramId);

    // تجاوز مهلة الـ 24 ساعة ثم تعطّل Telegram.
    ageLastCheck(telegramId, MEMBERSHIP_TTL_MS + 5_000);
    const original = globalThis.fetch;
    vi.stubGlobal('fetch', async () => new Response('boom', { status: 500 }));

    const me = (await (await call('/api/me', {}, token)).json()) as { canUseTools: boolean };
    // نُبقي آخر حالة معروفة بدل حرمانه.
    expect(me.canUseTools).toBe(true);

    vi.stubGlobal('fetch', original);
  });

  it('/api/telegram/status يتطلّب تسجيل دخول', async () => {
    expect((await post('/api/telegram/status')).status).toBe(401);
  });
});

describe('/api/telegram/verify يُرجع حالة الجلسة كاملة', () => {
  it('يشمل الملف الشخصي وحالة البوابة معاً', async () => {
    const telegramId = 420001;
    const token = await linkWhileNotSubscribed(telegramId);
    memberStatuses.set(String(telegramId), 'member');

    const session = (await (await post('/api/telegram/verify', undefined, token)).json()) as {
      canUseTools: boolean;
      user: { id: string };
      profile: { onboardingCompleted: boolean };
      telegram: { isMember: boolean };
    };

    expect(session.canUseTools).toBe(true);
    expect(session.telegram.isMember).toBe(true);
    expect(session.user.id).toBeTruthy();
    expect(session.profile.onboardingCompleted).toBe(false);
  });
});
