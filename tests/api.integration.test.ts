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
import { identityToken, makeTestToken } from './helpers/test-token';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const TELEGRAM_BASE = 'https://telegram.test';
const WEBHOOK_SECRET = 'webhook-secret-for-tests-only';
const ADMIN_TELEGRAM_ID = '5559869840';
const TEST_SECRET = 'e2e-secret-for-tests-only';
const PROJECT_ID = 'teacher-tools-test';
const ORIGIN = 'http://localhost:5173';

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
/** مستخدم جديد = توكن جديد. الخادم ينشئ الصفّ تلقائياً عند أول طلب. */
function newUserToken(overrides: Partial<{ uid: string; email: string; name: string }> = {}): string {
  counter += 1;
  const uid = overrides.uid ?? `uid-${counter}-${Date.now()}`;
  return identityToken(
    { uid, email: overrides.email ?? `${uid}@example.com`, name: overrides.name ?? `معلّم ${counter}` },
    TEST_SECRET,
  );
}

async function linkTelegram(
  token: string,
  telegramUserId: number,
  status: 'member' | 'left' = 'member',
): Promise<Response> {
  memberStatuses.set(String(telegramUserId), status);
  const tokenResponse = await post('/api/telegram/link-token', undefined, token);
  const { deepLink } = (await tokenResponse.json()) as { deepLink: string };
  return webhook(deepLink.split('start=')[1], telegramUserId);
}

function webhook(linkToken: string | null, telegramUserId: number, secret = WEBHOOK_SECRET) {
  return call('/api/telegram/webhook', {
    method: 'POST',
    headers: { 'X-Telegram-Bot-Api-Secret-Token': secret },
    body: JSON.stringify({
      message: {
        text: linkToken ? `/start ${linkToken}` : '/start',
        chat: { id: telegramUserId },
        from: { id: telegramUserId, username: `user${telegramUserId}` },
      },
    }),
  });
}

beforeAll(async () => {
  shim = new D1SqliteShim(':memory:');
  applyMigrations(shim);

  env = {
    DB: shim,
    ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
    FIREBASE_PROJECT_ID: PROJECT_ID,
    TELEGRAM_BOT_TOKEN: 'test:token',
    TELEGRAM_BOT_USERNAME: 'test_bot',
    TELEGRAM_CHANNEL_ID: '-1001111111111',
    TELEGRAM_CHANNEL_JOIN_URL: 'https://t.me/+test',
    TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET,
    TELEGRAM_API_BASE: TELEGRAM_BASE,
    ADMIN_TELEGRAM_ID,
    E2E_TEST_MODE: 'true',
    E2E_TEST_SECRET: TEST_SECRET,
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
    expect(JSON.stringify(body)).not.toContain(WEBHOOK_SECRET);
    expect(JSON.stringify(body)).not.toContain(TEST_SECRET);
  });
});

describe('التحقّق من Firebase ID Token', () => {
  it('يرفض الطلب بلا توكن', async () => {
    const response = await call('/api/me');
    expect(response.status).toBe(401);
    const body = (await response.json()) as { code: string; error: string };
    expect(body.code).toBe('UNAUTHORIZED');
    expect(body.error).toMatch(/تسجيل الدخول/);
  });

  it('يرفض توكناً بتوقيع خاطئ', async () => {
    const forged = identityToken({ uid: 'attacker' }, 'wrong-secret');
    const response = await call('/api/me', {}, forged);
    expect(response.status).toBe(401);
  });

  it('يرفض توكناً مبتوراً أو مشوّهاً', async () => {
    for (const bad of ['', 'abc', 'test.only-two', 'Bearer', 'test..', 'test.x.y']) {
      const response = await call('/api/me', {}, bad);
      expect(response.status).toBe(401);
    }
  });

  it('يرفض توكناً منتهي الصلاحية', async () => {
    const expired = identityToken({ uid: 'expired-user', expiresInSeconds: -60 }, TEST_SECRET);
    const response = await call('/api/me', {}, expired);
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/انتهت صلاحية/);
  });

  it('يرفض توكناً بلا sub (بلا هوية)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const noSub = makeTestToken({ email: 'x@example.com', exp: now + 600 }, TEST_SECRET);
    const response = await call('/api/me', {}, noSub);
    expect(response.status).toBe(401);
  });

  it('ينشئ المستخدم تلقائياً عند أول طلب موثّق', async () => {
    const token = newUserToken({ name: 'سارة المعلمة' });
    const response = await call('/api/me', {}, token);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      user: { name: string; role: string; id: string };
      canUseTools: boolean;
    };
    expect(body.user.name).toBe('سارة المعلمة');
    expect(body.user.role).toBe('user');
    expect(body.canUseTools).toBe(false);

    const row = await shim
      .prepare('SELECT COUNT(*) AS c FROM users WHERE id = ?1')
      .bind(body.user.id)
      .first<{ c: number }>();
    expect(row?.c).toBe(1);
  });

  it('لا يكرّر المستخدم عند الطلبات التالية بنفس الـ uid', async () => {
    const token = newUserToken({ uid: 'stable-uid-1' });
    await call('/api/me', {}, token);
    await call('/api/me', {}, token);
    await call('/api/me', {}, token);

    const row = await shim
      .prepare('SELECT COUNT(*) AS c FROM users WHERE firebase_uid = ?1')
      .bind('stable-uid-1')
      .first<{ c: number }>();
    expect(row?.c).toBe(1);
  });

  it('لا يثق بأي دور يرسله العميل داخل التوكن', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeTestToken(
      { sub: 'role-faker', email: 'r@example.com', name: 'محاول', role: 'admin', exp: now + 600 },
      TEST_SECRET,
    );
    const response = await call('/api/me', {}, token);
    const body = (await response.json()) as { user: { role: string } };
    expect(body.user.role).toBe('user');
  });
});

describe('البوابة والأدوات', () => {
  it('يمنع /api/tools قبل اجتياز البوابة', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    const response = await call('/api/tools', {}, token);
    expect(response.status).toBe(403);
  });

  it('يفتح الأدوات بعد الربط وتأكيد الاشتراك', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, 200001, 'member');

    const me = (await (await call('/api/me', {}, token)).json()) as { canUseTools: boolean };
    expect(me.canUseTools).toBe(true);

    const tools = await call('/api/tools', {}, token);
    expect(tools.status).toBe(200);
    const body = (await tools.json()) as { tools: { id: string }[] };
    // المستخدم الجديد بلا ملف شخصي ⇒ تجربة المعلم الافتراضية: أدوات المعلم فقط.
    const ids = body.tools.map((tool) => tool.id);
    expect(ids).toEqual(
      expect.arrayContaining(['student-followup', 'error-map', 'absence-plan']),
    );
    expect(ids).not.toContain('study-plan');
  });

  it('يبقي الأدوات مغلقة لغير المشترك', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, 200002, 'left');

    const me = (await (await call('/api/me', {}, token)).json()) as {
      canUseTools: boolean;
      telegram: { linked: boolean; isMember: boolean };
    };
    expect(me.telegram.linked).toBe(true);
    expect(me.telegram.isMember).toBe(false);
    expect(me.canUseTools).toBe(false);
  });

  it('التحقّق اليدوي يفتح الأدوات بعد الاشتراك', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, 200003, 'left');
    memberStatuses.set('200003', 'administrator');

    const verify = await post('/api/telegram/verify', undefined, token);
    expect(verify.status).toBe(200);
    expect(((await verify.json()) as { canUseTools: boolean }).canUseTools).toBe(true);
  });

  it('يمنع التحقّق المتكرّر السريع (حدّ معدّل مبني على قاعدة البيانات)', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, 200004, 'member');
    await post('/api/telegram/verify', undefined, token);
    const second = await post('/api/telegram/verify', undefined, token);
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
    const response = await webhook('anything', 210000, 'wrong-secret');
    expect(response.status).toBe(401);
  });

  it('التوكن يُستخدم مرة واحدة فقط', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    memberStatuses.set('210010', 'member');

    const tokenResponse = await post('/api/telegram/link-token', undefined, token);
    const { deepLink } = (await tokenResponse.json()) as { deepLink: string };
    const linkToken = deepLink.split('start=')[1];

    await webhook(linkToken, 210010);
    sentMessages.length = 0;
    await webhook(linkToken, 210011);

    expect(sentMessages[0]?.text).toMatch(/انتهت صلاحية|سبق استخدامه/);
    const connection = await shim
      .prepare('SELECT user_id FROM telegram_connections WHERE telegram_user_id = ?1')
      .bind('210011')
      .first();
    expect(connection).toBeNull();
  });

  it('يرفض التوكن المنتهي', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    const tokenResponse = await post('/api/telegram/link-token', undefined, token);
    const { deepLink } = (await tokenResponse.json()) as { deepLink: string };

    await shim
      .prepare('UPDATE telegram_link_tokens SET expires_at = ?1 WHERE used_at IS NULL')
      .bind(new Date(Date.now() - 1000).toISOString())
      .run();

    await webhook(deepLink.split('start=')[1], 210013);
    expect(sentMessages[0]?.text).toMatch(/انتهت صلاحية/);
  });

  it('حساب تيليجرام واحد لا يُربط بحسابَي منصّة', async () => {
    const first = newUserToken();
    await call('/api/me', {}, first);
    await linkTelegram(first, 210020, 'member');

    const second = newUserToken();
    await call('/api/me', {}, second);
    memberStatuses.set('210020', 'member');
    const tokenResponse = await post('/api/telegram/link-token', undefined, second);
    const { deepLink } = (await tokenResponse.json()) as { deepLink: string };
    sentMessages.length = 0;
    await webhook(deepLink.split('start=')[1], 210020);

    expect(sentMessages[0]?.text).toMatch(/مرتبط بحساب آخر/);
    const me = (await (await call('/api/me', {}, second)).json()) as {
      telegram: { linked: boolean };
    };
    expect(me.telegram.linked).toBe(false);
  });

  it('رسالة /start بلا توكن ترشد المستخدم ولا تربط شيئاً', async () => {
    await webhook(null, 210021);
    expect(sentMessages[0]?.text).toMatch(/ربط Telegram/);
  });

  it('لا يمكن للعميل ادّعاء معرّف تيليجرام عبر أي مسار عام', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    const response = await post(
      '/api/telegram/verify',
      { telegramUserId: ADMIN_TELEGRAM_ID },
      token,
    );
    expect(response.status).toBe(400);
  });
});

describe('فكّ ربط تيليجرام', () => {
  it('يفكّ الربط ويسمح بربط حساب آخر بعده', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, 220001, 'member');

    const unlink = await post('/api/telegram/unlink', undefined, token);
    expect(unlink.status).toBe(200);

    const me = (await (await call('/api/me', {}, token)).json()) as {
      telegram: { linked: boolean };
      canUseTools: boolean;
      user: { id: string };
    };
    expect(me.telegram.linked).toBe(false);
    expect(me.canUseTools).toBe(false);

    // الحساب نفسه لم يُحذف.
    const stillThere = await shim
      .prepare('SELECT COUNT(*) AS c FROM users WHERE id = ?1')
      .bind(me.user.id)
      .first<{ c: number }>();
    expect(stillThere?.c).toBe(1);

    // ومعرّف تيليجرام صار متاحاً لحساب آخر.
    const other = newUserToken();
    await call('/api/me', {}, other);
    await linkTelegram(other, 220001, 'member');
    const otherMe = (await (await call('/api/me', {}, other)).json()) as {
      telegram: { linked: boolean };
    };
    expect(otherMe.telegram.linked).toBe(true);
  });

  it('يرفض فكّ ربط غير موجود', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    const response = await post('/api/telegram/unlink', undefined, token);
    expect(response.status).toBe(400);
  });

  it('يسجّل حدث telegram_unlinked', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, 220005, 'member');
    await post('/api/telegram/unlink', undefined, token);

    const row = await shim
      .prepare(`SELECT COUNT(*) AS c FROM usage_events WHERE event_type = 'telegram_unlinked'`)
      .first<{ c: number }>();
    expect((row?.c ?? 0) > 0).toBe(true);
  });
});

describe('صلاحيات الإدمن', () => {
  it('المستخدم العادي يحصل على 403', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, 230001, 'member');
    const response = await call('/api/admin/stats', {}, token);
    expect(response.status).toBe(403);
  });

  it('الزائر بلا توكن يحصل على 401', async () => {
    const response = await call('/api/admin/stats');
    expect(response.status).toBe(401);
  });

  it('صاحب معرّف تيليجرام الإدمن يُرقّى عبر Webhook فقط', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, Number(ADMIN_TELEGRAM_ID), 'member');

    const me = (await (await call('/api/me', {}, token)).json()) as { user: { role: string } };
    expect(me.user.role).toBe('admin');

    const stats = await call('/api/admin/stats', {}, token);
    expect(stats.status).toBe(200);
    const body = (await stats.json()) as { users: { total: number } };
    expect(body.users.total).toBeGreaterThan(0);
  });

  it('الإدمن يدخل لوحته حتى لو لم يُؤكَّد اشتراكه في القناة', async () => {
    // نفكّ الربط ثم نعيده بحالة "غير مشترك"
    await shim
      .prepare('DELETE FROM telegram_connections WHERE telegram_user_id = ?1')
      .bind(ADMIN_TELEGRAM_ID)
      .run();

    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, Number(ADMIN_TELEGRAM_ID), 'left');

    const me = (await (await call('/api/me', {}, token)).json()) as {
      user: { role: string };
      canUseTools: boolean;
    };
    expect(me.user.role).toBe('admin');
    expect(me.canUseTools).toBe(false);

    // ومع ذلك لوحة الإدارة مفتوحة له.
    const stats = await call('/api/admin/stats', {}, token);
    expect(stats.status).toBe(200);
  });
});

describe('أحداث الاستخدام', () => {
  it('يقبل الأحداث المعروفة فقط', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const good = await post(
      '/api/events',
      { eventType: 'tool_opened', toolId: 'student-followup' },
      token,
    );
    expect(good.status).toBe(202);

    expect((await post('/api/events', { eventType: 'drop_table' }, token)).status).toBe(400);
    expect(
      (await post('/api/events', { eventType: 'export_pdf', primaryColor: 'javascript:1' }, token))
        .status,
    ).toBe(400);
  });

  it('لا يحفظ أي حقل خارج القائمة المعروفة', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await post(
      '/api/events',
      {
        eventType: 'export_png',
        toolId: 'error-map',
        studentName: 'اسم طالب حقيقي',
        notes: 'ملاحظات سرية',
      },
      token,
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

  it('يرفض الأحداث بلا توكن', async () => {
    expect((await post('/api/events', { eventType: 'tool_opened' })).status).toBe(401);
  });
});

describe('التفضيلات', () => {
  it('يرفض الألوان غير الصالحة ويحفظ الصالحة', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    await linkTelegram(token, 240001, 'member');

    const bad = await post(
      '/api/me/preferences',
      {
        defaultTemplateId: 'formal',
        primaryColor: 'red',
        secondaryColor: '#648A6D',
        accentColor: '#B8761C',
        backgroundColor: '#FDFBF6',
      },
      token,
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
      token,
    );
    expect(good.status).toBe(200);

    const me = (await (await call('/api/me', {}, token)).json()) as {
      preferences: { defaultTemplateId: string } | null;
    };
    expect(me.preferences?.defaultTemplateId).toBe('academic');
  });
});

describe('سلوك عام للـ API', () => {
  it('يُرجع 404 عربية للمسار غير الموجود', async () => {
    const response = await call('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: string }).error).toMatch(/غير موجود/);
  });

  it('يرفض طريقة الطلب غير المدعومة', async () => {
    expect((await call('/api/me', { method: 'DELETE' })).status).toBe(400);
  });

  it('لا يسرّب أي سرّ في الردود', async () => {
    const token = newUserToken();
    const text = await (await call('/api/me', {}, token)).text();
    for (const secret of [WEBHOOK_SECRET, 'test:token', TEST_SECRET]) {
      expect(text).not.toContain(secret);
    }
  });

  it('لا يضع أي كوكي جلسة (المصادقة عبر Bearer فقط)', async () => {
    const token = newUserToken();
    const response = await call('/api/me', {}, token);
    expect(response.headers.getSetCookie?.() ?? []).toEqual([]);
  });

  it('POST /api/me/login يسجّل الدخول ويحدّث last_login_at', async () => {
    const token = newUserToken();
    const me = (await (await call('/api/me', {}, token)).json()) as { user: { id: string } };
    expect((await post('/api/me/login', undefined, token)).status).toBe(200);

    const row = await shim
      .prepare('SELECT last_login_at FROM users WHERE id = ?1')
      .bind(me.user.id)
      .first<{ last_login_at: string | null }>();
    expect(row?.last_login_at).toBeTruthy();

    const events = await shim
      .prepare(`SELECT COUNT(*) AS c FROM usage_events WHERE event_type = 'login'`)
      .first<{ c: number }>();
    expect((events?.c ?? 0) > 0).toBe(true);
  });
});
