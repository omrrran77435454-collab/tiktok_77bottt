// @vitest-environment node
/**
 * اختبارات تكامل حقيقية لواجهة الـ API.
 *
 * نُشغّل كود الـ Worker نفسه (worker/index.ts) مقابل قاعدة SQLite في الذاكرة
 * تحاكي واجهة D1، مع محاكاة Telegram عبر اعتراض fetch.
 * لا تُستخدم أي أسرار حقيقية ولا أي اتصال بالشبكة.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { D1SqliteShim } from '../scripts/d1-sqlite-shim.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const TELEGRAM_BASE = 'https://telegram.test';
const WEBHOOK_SECRET = 'webhook-secret-for-tests-only';
const ADMIN_TELEGRAM_ID = '5559869840';
const ORIGIN = 'http://localhost:5173';

/** حالات العضوية التي يُرجعها Telegram الوهمي. */
const memberStatuses = new Map<string, string>();
const sentMessages: { chatId: number | string; text: string }[] = [];

let shim: InstanceType<typeof D1SqliteShim>;
let env: Record<string, unknown>;
let worker: { fetch: (request: Request, env: never, ctx: never) => Promise<Response> };

const ctx = { waitUntil: () => {}, passThroughOnException: () => {} };

function applyMigrations(database: InstanceType<typeof D1SqliteShim>) {
  const dir = join(root, 'migrations');
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()) {
    database.exec(readFileSync(join(dir, file), 'utf8'));
  }
}

function call(path: string, init: RequestInit = {}, cookies = ''): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Origin', ORIGIN);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (cookies) headers.set('cookie', cookies);
  return worker.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }), env as never, ctx as never);
}

function post(path: string, body?: unknown, cookies = ''): Promise<Response> {
  return call(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, cookies);
}

/** يستخرج قيمة الكوكي من ردّ الخادم لإعادة إرسالها في الطلبات التالية. */
function extractCookies(response: Response): string {
  const raw = response.headers.getSetCookie?.() ?? [];
  return raw.map((entry) => entry.split(';')[0]).join('; ');
}

let counter = 0;
async function signUp(): Promise<{ cookies: string; email: string }> {
  counter += 1;
  const email = `teacher-${counter}-${Date.now()}@example.com`;
  const response = await post('/api/auth/sign-up/email', {
    email,
    password: 'Str0ngPass!2026',
    name: `معلّم ${counter}`,
  });
  expect(response.status).toBe(200);
  return { cookies: extractCookies(response), email };
}

async function linkTelegram(
  cookies: string,
  telegramUserId: number,
  status: 'member' | 'left' = 'member',
): Promise<Response> {
  memberStatuses.set(String(telegramUserId), status);
  const tokenResponse = await post('/api/telegram/link-token', undefined, cookies);
  const { deepLink } = (await tokenResponse.json()) as { deepLink: string };
  const token = deepLink.split('start=')[1];
  return webhook(token, telegramUserId);
}

function webhook(token: string | null, telegramUserId: number, secret = WEBHOOK_SECRET) {
  return call(
    '/api/telegram/webhook',
    {
      method: 'POST',
      headers: { 'X-Telegram-Bot-Api-Secret-Token': secret },
      body: JSON.stringify({
        message: {
          text: token ? `/start ${token}` : '/start',
          chat: { id: telegramUserId },
          from: { id: telegramUserId, username: `user${telegramUserId}` },
        },
      }),
    },
  );
}

beforeAll(async () => {
  shim = new D1SqliteShim(':memory:');
  applyMigrations(shim);

  env = {
    DB: shim,
    ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    BETTER_AUTH_SECRET: 'test-secret-value-that-is-long-enough-0123456789',
    BETTER_AUTH_URL: ORIGIN,
    TELEGRAM_BOT_TOKEN: 'test:token',
    TELEGRAM_BOT_USERNAME: 'test_bot',
    TELEGRAM_CHANNEL_ID: '-1001111111111',
    TELEGRAM_CHANNEL_JOIN_URL: 'https://t.me/+test',
    TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET,
    TELEGRAM_API_BASE: TELEGRAM_BASE,
    ADMIN_TELEGRAM_ID,
    E2E_TEST_MODE: 'true',
    E2E_TEST_SECRET: 'test-mode-secret',
  };

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(TELEGRAM_BASE)) {
      throw new Error(`طلب شبكة غير متوقّع في الاختبار: ${url}`);
    }
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    if (url.endsWith('/getChatMember')) {
      const status = memberStatuses.get(String(body.user_id)) ?? 'left';
      return new Response(JSON.stringify({ ok: true, result: { status } }), { status: 200 });
    }
    if (url.endsWith('/sendMessage')) {
      sentMessages.push({ chatId: body.chat_id as number, text: String(body.text) });
      return new Response(JSON.stringify({ ok: true, result: {} }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  });

  worker = (await import('../worker/index')).default as typeof worker;
});

beforeEach(() => {
  sentMessages.length = 0;
});

afterAll(() => {
  vi.unstubAllGlobals();
  shim.close();
});

describe('GET /api/health', () => {
  it('يؤكّد اكتمال الإعداد بدون كشف أي قيمة', async () => {
    const response = await call('/api/health');
    const body = (await response.json()) as { ok: boolean; missingConfig: string[] };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.missingConfig).toEqual([]);
    expect(JSON.stringify(body)).not.toContain('test-client-secret');
    expect(JSON.stringify(body)).not.toContain(WEBHOOK_SECRET);
  });
});

describe('المصادقة والبوابة', () => {
  it('يرفض /api/me بدون جلسة برسالة عربية', async () => {
    const response = await call('/api/me');
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string; code: string };
    expect(body.code).toBe('UNAUTHORIZED');
    expect(body.error).toMatch(/تسجيل الدخول/);
  });

  it('المستخدم الجديد لا يستطيع فتح الأدوات قبل الربط', async () => {
    const { cookies } = await signUp();
    const response = await call('/api/me', {}, cookies);
    const body = (await response.json()) as {
      canUseTools: boolean;
      telegram: { linked: boolean };
      user: { role: string };
    };
    expect(response.status).toBe(200);
    expect(body.canUseTools).toBe(false);
    expect(body.telegram.linked).toBe(false);
    expect(body.user.role).toBe('user');
  });

  it('يمنع /api/tools قبل اجتياز البوابة', async () => {
    const { cookies } = await signUp();
    const response = await call('/api/tools', {}, cookies);
    expect(response.status).toBe(403);
  });

  it('يفتح الأدوات بعد الربط وتأكيد الاشتراك', async () => {
    const { cookies } = await signUp();
    await linkTelegram(cookies, 100001, 'member');

    const me = (await (await call('/api/me', {}, cookies)).json()) as { canUseTools: boolean };
    expect(me.canUseTools).toBe(true);

    const tools = await call('/api/tools', {}, cookies);
    expect(tools.status).toBe(200);
    const body = (await tools.json()) as { tools: { id: string }[] };
    expect(body.tools).toHaveLength(3);
  });

  it('يبقي الأدوات مغلقة إذا لم يكن مشتركاً', async () => {
    const { cookies } = await signUp();
    await linkTelegram(cookies, 100002, 'left');
    const me = (await (await call('/api/me', {}, cookies)).json()) as {
      canUseTools: boolean;
      telegram: { linked: boolean; isMember: boolean };
    };
    expect(me.telegram.linked).toBe(true);
    expect(me.telegram.isMember).toBe(false);
    expect(me.canUseTools).toBe(false);
  });

  it('التحقق اليدوي يفتح الأدوات بعد الاشتراك', async () => {
    const { cookies } = await signUp();
    await linkTelegram(cookies, 100003, 'left');
    memberStatuses.set('100003', 'administrator');

    const verify = await post('/api/telegram/verify', undefined, cookies);
    expect(verify.status).toBe(200);
    const body = (await verify.json()) as { canUseTools: boolean };
    expect(body.canUseTools).toBe(true);
  });

  it('يمنع التحقق المتكرّر السريع (حد معدّل)', async () => {
    const { cookies } = await signUp();
    await linkTelegram(cookies, 100004, 'member');
    await post('/api/telegram/verify', undefined, cookies);
    const second = await post('/api/telegram/verify', undefined, cookies);
    expect(second.status).toBe(429);
  });
});

describe('أمان Webhook تيليجرام', () => {
  it('يرفض الطلب بلا سرّ', async () => {
    const response = await call('/api/telegram/webhook', {
      method: 'POST',
      body: JSON.stringify({ message: { text: '/start x', chat: { id: 1 }, from: { id: 1 } } }),
    });
    expect(response.status).toBe(401);
  });

  it('يرفض السرّ الخاطئ', async () => {
    const response = await webhook('anything', 123, 'wrong-secret');
    expect(response.status).toBe(401);
  });

  it('التوكن يُستخدم مرة واحدة فقط', async () => {
    const { cookies } = await signUp();
    memberStatuses.set('100010', 'member');
    const tokenResponse = await post('/api/telegram/link-token', undefined, cookies);
    const { deepLink } = (await tokenResponse.json()) as { deepLink: string };
    const token = deepLink.split('start=')[1];

    await webhook(token, 100010);
    sentMessages.length = 0;
    await webhook(token, 100011);

    expect(sentMessages[0]?.text).toMatch(/انتهت صلاحية|سبق استخدامه/);
    const connection = await shim
      .prepare('SELECT user_id FROM telegram_connections WHERE telegram_user_id = ?1')
      .bind('100011')
      .first();
    expect(connection).toBeNull();
  });

  it('يرفض توكناً غير موجود', async () => {
    await webhook('token-that-never-existed', 100012);
    expect(sentMessages[0]?.text).toMatch(/انتهت صلاحية|سبق استخدامه/);
  });

  it('يرفض التوكن المنتهي', async () => {
    const { cookies } = await signUp();
    const tokenResponse = await post('/api/telegram/link-token', undefined, cookies);
    const { deepLink } = (await tokenResponse.json()) as { deepLink: string };
    const token = deepLink.split('start=')[1];

    await shim
      .prepare('UPDATE telegram_link_tokens SET expires_at = ?1 WHERE used_at IS NULL')
      .bind(new Date(Date.now() - 1000).toISOString())
      .run();

    await webhook(token, 100013);
    expect(sentMessages[0]?.text).toMatch(/انتهت صلاحية/);
  });

  it('حساب تيليجرام واحد لا يُربط بحسابَي موقع', async () => {
    const first = await signUp();
    await linkTelegram(first.cookies, 100020, 'member');

    const second = await signUp();
    memberStatuses.set('100020', 'member');
    const tokenResponse = await post('/api/telegram/link-token', undefined, second.cookies);
    const { deepLink } = (await tokenResponse.json()) as { deepLink: string };
    sentMessages.length = 0;
    await webhook(deepLink.split('start=')[1], 100020);

    expect(sentMessages[0]?.text).toMatch(/مرتبط بحساب آخر/);
    const me = (await (await call('/api/me', {}, second.cookies)).json()) as {
      telegram: { linked: boolean };
    };
    expect(me.telegram.linked).toBe(false);
  });

  it('رسالة /start بلا توكن ترشد المستخدم ولا تربط شيئاً', async () => {
    await webhook(null, 100021);
    expect(sentMessages[0]?.text).toMatch(/ربط Telegram/);
  });

  it('لا يمكن للعميل ادّعاء معرّف تيليجرام عبر أي مسار عام', async () => {
    const { cookies } = await signUp();
    const response = await post(
      '/api/telegram/verify',
      { telegramUserId: ADMIN_TELEGRAM_ID },
      cookies,
    );
    // لا يوجد ربط بعد، لذلك يُرفض بغضّ النظر عمّا أرسله العميل.
    expect(response.status).toBe(400);
  });
});

describe('صلاحيات الإدمن', () => {
  it('المستخدم العادي يحصل على 403 من /api/admin/stats', async () => {
    const { cookies } = await signUp();
    await linkTelegram(cookies, 100030, 'member');
    const response = await call('/api/admin/stats', {}, cookies);
    expect(response.status).toBe(403);
  });

  it('الزائر غير المسجّل يحصل على 401', async () => {
    const response = await call('/api/admin/stats');
    expect(response.status).toBe(401);
  });

  it('صاحب معرّف تيليجرام الإدمن يُرقّى تلقائياً عبر Webhook فقط', async () => {
    const { cookies } = await signUp();
    await linkTelegram(cookies, Number(ADMIN_TELEGRAM_ID), 'member');

    const me = (await (await call('/api/me', {}, cookies)).json()) as { user: { role: string } };
    expect(me.user.role).toBe('admin');

    const stats = await call('/api/admin/stats', {}, cookies);
    expect(stats.status).toBe(200);
    const body = (await stats.json()) as { users: { total: number }; telegram: { linked: number } };
    expect(body.users.total).toBeGreaterThan(0);
    expect(body.telegram.linked).toBeGreaterThan(0);
  });

  it('لا يستطيع المستخدم ترقية نفسه عبر تسجيل حساب بدور admin', async () => {
    const response = await post('/api/auth/sign-up/email', {
      email: `sneaky-${Date.now()}@example.com`,
      password: 'Str0ngPass!2026',
      name: 'محاول',
      role: 'admin',
    });
    const cookies = extractCookies(response);
    const me = (await (await call('/api/me', {}, cookies)).json()) as { user: { role: string } };
    expect(me.user.role).toBe('user');
  });
});

describe('أحداث الاستخدام', () => {
  it('يقبل الأحداث المعروفة فقط', async () => {
    const { cookies } = await signUp();
    await linkTelegram(cookies, 100040, 'member');

    const good = await post(
      '/api/events',
      { eventType: 'tool_opened', toolId: 'student-followup' },
      cookies,
    );
    expect(good.status).toBe(202);

    const bad = await post('/api/events', { eventType: 'drop_table' }, cookies);
    expect(bad.status).toBe(400);

    const badColor = await post(
      '/api/events',
      { eventType: 'export_pdf', primaryColor: 'javascript:alert(1)' },
      cookies,
    );
    expect(badColor.status).toBe(400);
  });

  it('لا يحفظ أي حقل خارج القائمة المعروفة', async () => {
    const { cookies } = await signUp();
    await linkTelegram(cookies, 100041, 'member');
    await post(
      '/api/events',
      {
        eventType: 'export_png',
        toolId: 'error-map',
        studentName: 'اسم طالب حقيقي',
        notes: 'ملاحظات سرية',
      },
      cookies,
    );

    const row = (await shim
      .prepare("SELECT * FROM usage_events WHERE tool_id = 'error-map' LIMIT 1")
      .first()) as Record<string, unknown> | null;
    expect(row).not.toBeNull();
    expect(Object.keys(row as object)).toEqual([
      'id',
      'user_id',
      'tool_id',
      'event_type',
      'template_id',
      'primary_color',
      'created_at',
    ]);
    expect(JSON.stringify(row)).not.toContain('اسم طالب حقيقي');
    expect(JSON.stringify(row)).not.toContain('ملاحظات سرية');
  });

  it('يرفض الأحداث من غير المسجّلين', async () => {
    const response = await post('/api/events', { eventType: 'tool_opened' });
    expect(response.status).toBe(401);
  });
});

describe('التفضيلات', () => {
  it('يرفض الألوان غير الصالحة ويحفظ الصالحة', async () => {
    const { cookies } = await signUp();
    await linkTelegram(cookies, 100050, 'member');

    const bad = await post(
      '/api/me/preferences',
      {
        defaultTemplateId: 'formal',
        primaryColor: 'red',
        secondaryColor: '#648A6D',
        accentColor: '#B8761C',
        backgroundColor: '#FDFBF6',
      },
      cookies,
    );
    expect(bad.status).toBe(400);

    const good = await post(
      '/api/me/preferences',
      {
        defaultTemplateId: 'academic',
        primaryColor: '#11554F',
        secondaryColor: '#648A6D',
        accentColor: '#B8761C',
        backgroundColor: '#FDFBF6',
      },
      cookies,
    );
    expect(good.status).toBe(200);

    const me = (await (await call('/api/me', {}, cookies)).json()) as {
      preferences: { defaultTemplateId: string } | null;
    };
    expect(me.preferences?.defaultTemplateId).toBe('academic');
  });
});

describe('سلوك عام للـ API', () => {
  it('يُرجع 404 عربية للمسار غير الموجود', async () => {
    const response = await call('/api/does-not-exist');
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/غير موجود/);
  });

  it('يرفض طريقة الطلب غير المدعومة', async () => {
    const response = await call('/api/me', { method: 'DELETE' });
    expect(response.status).toBe(400);
  });

  it('لا يسرّب أي سرّ في الردود', async () => {
    const { cookies } = await signUp();
    const response = await call('/api/me', {}, cookies);
    const text = await response.text();
    for (const secret of [
      'test-client-secret',
      WEBHOOK_SECRET,
      'test:token',
      'test-secret-value-that-is-long-enough-0123456789',
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it('كوكي الجلسة HttpOnly ومحمي بـ SameSite', async () => {
    const response = await post('/api/auth/sign-up/email', {
      email: `cookie-${Date.now()}@example.com`,
      password: 'Str0ngPass!2026',
      name: 'كوكي',
    });
    const setCookie = (response.headers.getSetCookie?.() ?? []).join(' | ');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie.toLowerCase()).toContain('path=/');
  });
});
