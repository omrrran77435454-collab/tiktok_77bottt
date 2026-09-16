// @vitest-environment node
/**
 * يحرس القرار الجديد: **تيليجرام ليس بوابة**.
 *
 * كانت المنصّة تشترط ربط حساب تيليجرام وتأكيد الاشتراك في القناة قبل فتح
 * الأدوات، وكان هذا الشرط يُنتج ارتداداً وحبساً للمستخدمين عند أي تأخّر أو
 * عطل. هذا الملف يثبّت السلوك المطلوب الآن: تسجيل الدخول وحده يفتح كل شيء،
 * ولا شيء في تيليجرام — ربطاً أو اشتراكاً أو عطلاً — يمنع أي مستخدم.
 *
 * (حلّ محلّ tests/telegram-routing.test.ts الذي كان يختبر البوابة نفسها.)
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { D1SqliteShim } from '../scripts/d1-sqlite-shim.mjs';
import { identityToken } from './helpers/test-token';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const TELEGRAM_BASE = 'https://telegram.test';
const WEBHOOK_SECRET = 'webhook-secret-for-tests-only';
const TEST_SECRET = 'e2e-secret-for-tests-only';
const ADMIN_EMAIL = 'platform.owner@example.test';
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
  return worker.fetch(
    new Request(`${ORIGIN}${path}`, { ...init, headers }),
    env as never,
    ctx as never,
  );
}

function post(path: string, body?: unknown, token?: string): Promise<Response> {
  return call(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, token);
}

let counter = 0;
function newUserToken(overrides: Partial<{ email: string; emailVerified: boolean }> = {}): string {
  counter += 1;
  const uid = `open-${counter}-${Date.now()}`;
  return identityToken(
    {
      uid,
      email: overrides.email ?? `${uid}@example.com`,
      name: `مستخدم ${counter}`,
      ...(overrides.emailVerified === undefined ? {} : { emailVerified: overrides.emailVerified }),
    },
    TEST_SECRET,
  );
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

/** يربط الحساب بحالة اشتراك محدّدة. */
async function link(token: string, telegramUserId: number, status: 'member' | 'left') {
  memberStatuses.set(String(telegramUserId), status);
  const response = await post('/api/telegram/link-token', undefined, token);
  const { deepLink } = (await response.json()) as { deepLink: string };
  await webhook(deepLink.split('start=')[1], telegramUserId);
}

/** يُكمل التهيئة حتى تصبح الوجهة الطبيعية هي اللوحة. */
async function onboard(token: string, role: 'teacher' | 'student') {
  const body =
    role === 'teacher'
      ? {
          role,
          stageId: null,
          gradeId: null,
          trackId: null,
          subjects: [],
          assignments: [{ stageId: 'primary', gradeId: 'p5', subjectId: 'arabic' }],
          onboardingCompleted: true,
        }
      : {
          role,
          stageId: 'primary',
          gradeId: 'p5',
          trackId: null,
          subjects: ['arabic'],
          onboardingCompleted: true,
        };
  return post('/api/me/profile', body, token);
}

interface Session {
  user: { id: string; role: string };
  telegram: { linked: boolean; channelUrl: string; botUsername: string };
  profile: { role: string; onboardingCompleted: boolean };
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
    ADMIN_EMAIL,
    E2E_TEST_MODE: 'true',
    E2E_TEST_SECRET: TEST_SECRET,
  };

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.startsWith(TELEGRAM_BASE)) throw new Error(`طلب شبكة غير متوقّع: ${url}`);
    if (url.includes('getChatMember')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as { user_id: number };
      const status = memberStatuses.get(String(body.user_id)) ?? 'left';
      return new Response(JSON.stringify({ ok: true, result: { status } }), {
        headers: { 'content-type': 'application/json' },
      });
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

describe('الوصول بلا تيليجرام', () => {
  it('مستخدم غير مربوط بتيليجرام يستخدم المنصّة كاملةً', async () => {
    const token = newUserToken();
    await onboard(token, 'teacher');

    const me = (await (await call('/api/me', {}, token)).json()) as Session;
    expect(me.telegram.linked).toBe(false);

    expect((await call('/api/tools', {}, token)).status).toBe(200);
    expect((await call('/api/schedule', {}, token)).status).toBe(200);
    expect((await call('/api/catalog', {}, token)).status).toBe(200);
  });

  it('مستخدم مربوط لكنه غير مشترك في القناة يستخدم المنصّة كاملةً', async () => {
    const token = newUserToken();
    await onboard(token, 'teacher');
    await link(token, 430001, 'left');

    const me = (await (await call('/api/me', {}, token)).json()) as Session;
    expect(me.telegram.linked).toBe(true);

    expect((await call('/api/tools', {}, token)).status).toBe(200);
    expect((await call('/api/schedule', {}, token)).status).toBe(200);
    expect(
      (await post('/api/schedule/settings', { periodsPerDay: 6, startTime: '07:00', periodMinutes: 45 }, token)).status,
    ).toBe(200);
  });

  it('فشل Telegram API لا يمنع الدخول ولا يلمس أي مسار للمستخدم', async () => {
    const token = newUserToken();
    await onboard(token, 'student');

    // أي نداء شبكة الآن يفشل. المسارات أدناه يجب ألّا تحتاجه أصلاً.
    const original = globalThis.fetch;
    vi.stubGlobal('fetch', async () => {
      throw new Error('Telegram down');
    });

    expect((await call('/api/me', {}, token)).status).toBe(200);
    expect((await call('/api/tools', {}, token)).status).toBe(200);
    expect((await call('/api/schedule', {}, token)).status).toBe(200);

    vi.stubGlobal('fetch', original);
  });

  it('فكّ الربط لا يغلق أي شيء', async () => {
    const token = newUserToken();
    await onboard(token, 'teacher');
    await link(token, 430002, 'member');

    expect((await post('/api/telegram/unlink', undefined, token)).status).toBe(200);

    const me = (await (await call('/api/me', {}, token)).json()) as Session;
    expect(me.telegram.linked).toBe(false);
    expect((await call('/api/tools', {}, token)).status).toBe(200);
  });
});

describe('الوجهة الطبيعية بعد الدخول', () => {
  it('المعلم يصل إلى بيانات لوحة المعلم', async () => {
    const token = newUserToken();
    await onboard(token, 'teacher');

    const me = (await (await call('/api/me', {}, token)).json()) as Session;
    expect(me.profile.role).toBe('teacher');
    expect(me.profile.onboardingCompleted).toBe(true);

    const tools = (await (await call('/api/tools', {}, token)).json()) as {
      tools: { audience: string }[];
    };
    expect(tools.tools.some((tool) => tool.audience === 'student')).toBe(false);
  });

  it('الطالب يصل إلى بيانات لوحة الطالب', async () => {
    const token = newUserToken();
    await onboard(token, 'student');

    const me = (await (await call('/api/me', {}, token)).json()) as Session;
    expect(me.profile.role).toBe('student');

    const tools = (await (await call('/api/tools', {}, token)).json()) as {
      tools: { audience: string }[];
    };
    expect(tools.tools.length).toBeGreaterThan(0);
    expect(tools.tools.every((tool) => tool.audience !== 'teacher')).toBe(true);
  });

  it('المدير يصل إلى لوحة الإدارة بـ access_role وحده — بلا تيليجرام إطلاقاً', async () => {
    const token = newUserToken({ email: ADMIN_EMAIL });
    await onboard(token, 'teacher');

    const me = (await (await call('/api/me', {}, token)).json()) as Session;
    expect(me.user.role).toBe('admin');
    // persona مستقلّة عن الصلاحية: مدير وهو معلّم في نفس الوقت.
    expect(me.profile.role).toBe('teacher');

    const stats = await call('/api/admin/stats', {}, token);
    expect(stats.status).toBe(200);
  });
});

describe('زيارة القناة اختيارية ولا تغيّر شيئاً', () => {
  it('رابط القناة يأتي من إعداد الخادم لا من العميل', async () => {
    const token = newUserToken();
    const me = (await (await call('/api/me', {}, token)).json()) as Session;
    expect(me.telegram.channelUrl).toBe('https://t.me/+test');
  });

  it('لا يوجد في الرد أي حقل يقيّد الوصول', async () => {
    const token = newUserToken();
    const me = (await (await call('/api/me', {}, token)).json()) as Record<string, unknown>;
    expect(me).not.toHaveProperty('canUseTools');
    expect(me.telegram).not.toHaveProperty('isMember');
  });

  it('مسارا البوابة القديمان لم يعودا موجودين', async () => {
    const token = newUserToken();
    expect((await post('/api/telegram/status', undefined, token)).status).toBe(404);
    expect((await post('/api/telegram/verify', undefined, token)).status).toBe(404);
  });

  it('الربط لا يغيّر صلاحية المستخدم ولا دوره', async () => {
    const token = newUserToken();
    await onboard(token, 'student');
    const before = (await (await call('/api/me', {}, token)).json()) as Session;

    // نربط بمعرّف تيليجرام الخاص بالإدمن: لا ترقية ولا تغيير persona.
    await link(token, 5559869840, 'member');

    const after = (await (await call('/api/me', {}, token)).json()) as Session;
    expect(after.user.role).toBe(before.user.role);
    expect(after.user.role).toBe('user');
    expect(after.profile.role).toBe('student');
  });
});
