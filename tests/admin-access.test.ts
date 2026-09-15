// @vitest-environment node
/**
 * صلاحية النظام (access_role) — كيف تُمنح ومن يملك قرارها.
 *
 * القاعدة: تُشتقّ في كل طلب من توكن Firebase الموقَّع + إعداد الخادم
 * ADMIN_EMAIL. لا من جسم الطلب، ولا من الملف الشخصي، ولا من قيمة مخزَّنة
 * قابلة للتقادم.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { D1SqliteShim } from '../scripts/d1-sqlite-shim.mjs';
import { identityToken } from './helpers/test-token';
import { isPlatformAdmin, normalizeEmail, resolveAccessRole } from '../worker/lib/access';

const ADMIN_EMAIL = 'omrrran77435454@gmail.com';

/* ------------------------------ منطق القرار ------------------------------ */

describe('resolveAccessRole', () => {
  const env = { ADMIN_EMAIL };

  it('البريد المطابق والمؤكَّد ← admin', () => {
    expect(resolveAccessRole({ email: ADMIN_EMAIL, emailVerified: true }, env)).toBe('admin');
  });

  it('البريد المطابق وغير المؤكَّد ← user', () => {
    expect(resolveAccessRole({ email: ADMIN_EMAIL, emailVerified: false }, env)).toBe('user');
  });

  it('بريد آخر ولو كان مؤكَّداً ← user', () => {
    expect(resolveAccessRole({ email: 'someone@gmail.com', emailVerified: true }, env)).toBe('user');
  });

  it('يتجاهل فروق حالة الأحرف والمسافات', () => {
    expect(
      resolveAccessRole({ email: '  OMRRRAN77435454@Gmail.COM ', emailVerified: true }, env),
    ).toBe('admin');
  });

  it('لا يقبل بريداً يشبه بريد المدير دون أن يطابقه', () => {
    const lookalikes = [
      'omrrran77435454@gmail.com.attacker.com',
      'omrrran77435454+admin@gmail.com',
      'omrrran7743545@gmail.com',
      'xomrrran77435454@gmail.com',
      'omrrran77435454@googlemail.com',
    ];
    for (const email of lookalikes) {
      expect(resolveAccessRole({ email, emailVerified: true }, env), email).toBe('user');
    }
  });

  it('بريد فارغ ← user', () => {
    expect(resolveAccessRole({ email: '', emailVerified: true }, env)).toBe('user');
  });

  it('لا يُرقّي أحداً عندما يكون ADMIN_EMAIL غير مضبوط', () => {
    expect(
      resolveAccessRole({ email: ADMIN_EMAIL, emailVerified: true }, { ADMIN_EMAIL: '' }),
    ).toBe('user');
  });

  it('إعداد ناقص لا يسلب صلاحية مخزَّنة قائمة', () => {
    // سرّ لم يُرفع بعد: لا نُرقّي أحداً، لكن لا نُنزِّل مالك المنصّة أيضاً.
    expect(
      resolveAccessRole({ email: ADMIN_EMAIL, emailVerified: true }, { ADMIN_EMAIL: '' }, 'admin'),
    ).toBe('admin');
  });

  it('إعداد مضبوط لا يطابق ← user حتى لو كان المخزَّن admin', () => {
    expect(
      resolveAccessRole({ email: 'other@gmail.com', emailVerified: true }, env, 'admin'),
    ).toBe('user');
  });

  it('normalizeEmail يتعامل مع القيم الغائبة', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });

  it('isPlatformAdmin يطابق resolveAccessRole', () => {
    expect(isPlatformAdmin({ email: ADMIN_EMAIL, emailVerified: true }, env)).toBe(true);
    expect(isPlatformAdmin({ email: ADMIN_EMAIL, emailVerified: false }, env)).toBe(false);
  });
});

/* --------------------------- التكامل على الـ Worker --------------------------- */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const TEST_SECRET = 'e2e-secret-for-tests-only';
const ORIGIN = 'http://localhost:5173';

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

const post = (path: string, body?: unknown, token?: string) =>
  call(path, { method: 'POST', body: JSON.stringify(body ?? {}) }, token);

const tokenFor = (options: { uid: string; email: string; emailVerified?: boolean }) =>
  identityToken({ ...options, name: 'مستخدم' }, TEST_SECRET);

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
    TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-for-tests-only',
    TELEGRAM_API_BASE: 'https://telegram.test',
    ADMIN_TELEGRAM_ID: '5559869840',
    ADMIN_EMAIL,
    E2E_TEST_MODE: 'true',
    E2E_TEST_SECRET: TEST_SECRET,
  };

  vi.stubGlobal('fetch', async () =>
    new Response(JSON.stringify({ ok: true, result: { status: 'left' } }), {
      headers: { 'content-type': 'application/json' },
    }),
  );

  worker = (await import('../worker/index')).default as never;
});

afterAll(() => {
  vi.unstubAllGlobals();
  shim.close();
});

describe('منح الصلاحية عبر الـ API', () => {
  it('حساب المدير ببريد مؤكَّد يحصل على admin', async () => {
    const token = tokenFor({ uid: 'owner-1', email: ADMIN_EMAIL, emailVerified: true });
    const me = (await (await call('/api/me', {}, token)).json()) as {
      user: { role: string; emailVerified: boolean };
    };

    expect(me.user.role).toBe('admin');
    expect(me.user.emailVerified).toBe(true);
  });

  it('نفس البريد بلا تأكيد لا يحصل على admin', async () => {
    const token = tokenFor({ uid: 'owner-unverified', email: ADMIN_EMAIL, emailVerified: false });
    const me = (await (await call('/api/me', {}, token)).json()) as { user: { role: string } };

    expect(me.user.role).toBe('user');
  });

  it('بريد آخر يحصل على user', async () => {
    const token = tokenFor({ uid: 'teacher-1', email: 'teacher@example.com' });
    const me = (await (await call('/api/me', {}, token)).json()) as { user: { role: string } };

    expect(me.user.role).toBe('user');
  });

  it('العميل لا يمنح نفسه admin عبر ملف التهيئة', async () => {
    const token = tokenFor({ uid: 'climber-1', email: 'climber@example.com' });
    await call('/api/me', {}, token);

    await post(
      '/api/me/profile',
      {
        role: 'teacher',
        stageId: null,
        gradeId: null,
        trackId: null,
        subjects: [],
        // محاولات صريحة لرفع الصلاحية عبر حقول دخيلة.
        access_role: 'admin',
        accessRole: 'admin',
        userRole: 'admin',
        admin: true,
      },
      token,
    );

    const me = (await (await call('/api/me', {}, token)).json()) as { user: { role: string } };
    expect(me.user.role).toBe('user');
    expect((await call('/api/admin/catalog', {}, token)).status).toBe(403);
  });

  it('persona = teacher لا يعني صلاحية، و access_role = admin لا يعني persona', async () => {
    const token = tokenFor({ uid: 'owner-2', email: ADMIN_EMAIL, emailVerified: true });
    await call('/api/me', {}, token);

    // المدير يستخدم المنصّة كمعلم — الصلاحية لا تتأثّر.
    await post(
      '/api/me/profile',
      { role: 'teacher', stageId: 'primary', gradeId: 'p4', trackId: null, subjects: ['arabic'] },
      token,
    );

    const me = (await (await call('/api/me', {}, token)).json()) as {
      user: { role: string };
      profile: { role: string };
    };
    expect(me.user.role).toBe('admin');
    expect(me.profile.role).toBe('teacher');
  });

  it('المدير يستطيع أن يكون طالباً في التجربة دون فقد صلاحيته', async () => {
    const token = tokenFor({ uid: 'owner-3', email: ADMIN_EMAIL, emailVerified: true });
    await call('/api/me', {}, token);

    await post(
      '/api/me/profile',
      { role: 'student', stageId: 'secondary', gradeId: 's1', trackId: null, subjects: ['physics'] },
      token,
    );

    const me = (await (await call('/api/me', {}, token)).json()) as {
      user: { role: string };
      profile: { role: string };
    };
    expect(me.user.role).toBe('admin');
    expect(me.profile.role).toBe('student');
  });
});

describe('حماية نقاط الإدارة في الخادم', () => {
  const ADMIN_GET = ['/api/admin/stats', '/api/admin/catalog'];
  const ADMIN_POST: [string, unknown][] = [
    [
      '/api/admin/tools',
      {
        slug: 'x',
        nameAr: 'x',
        descriptionAr: '',
        icon: 'tools',
        categoryId: null,
        audience: 'teacher',
        status: 'draft',
        stages: [],
        grades: [],
        subjects: [],
        keywords: [],
        isFeatured: false,
        isNew: false,
        sortOrder: 1,
      },
    ],
    ['/api/admin/tools/status', { id: 'error-map', status: 'disabled' }],
    ['/api/admin/tools/order', { items: [{ id: 'error-map', sortOrder: 2 }] }],
    [
      '/api/admin/categories',
      { id: 'x', nameAr: 'x', descriptionAr: '', icon: 'tools', audience: 'teacher', sortOrder: 1, enabled: true },
    ],
    ['/api/admin/subjects', { id: 'x', nameAr: 'x', stageId: null, sortOrder: 1, enabled: true }],
    ['/api/admin/reference/toggle', { entity: 'stage', id: 'primary', enabled: false }],
  ];

  it('المستخدم العادي يُمنع من كل نقاط الإدارة (403)', async () => {
    const token = tokenFor({ uid: 'plain-user', email: 'plain@example.com' });
    await call('/api/me', {}, token);

    for (const path of ADMIN_GET) {
      expect((await call(path, {}, token)).status, path).toBe(403);
    }
    for (const [path, body] of ADMIN_POST) {
      expect((await post(path, body, token)).status, path).toBe(403);
    }
  });

  it('غير المسجّل يُمنع (401)', async () => {
    for (const path of ADMIN_GET) {
      expect((await call(path)).status, path).toBe(401);
    }
    for (const [path, body] of ADMIN_POST) {
      expect((await post(path, body)).status, path).toBe(401);
    }
  });

  it('طريقة HTTP غير المدعومة لا تلتفّ حول الحماية', async () => {
    const token = tokenFor({ uid: 'method-user', email: 'method@example.com' });
    for (const method of ['PATCH', 'DELETE', 'PUT']) {
      const response = await call('/api/admin/tools', { method }, token);
      expect([400, 403, 404]).toContain(response.status);
      expect(response.status).not.toBe(200);
    }
  });

  it('المدير مسموح له', async () => {
    const token = tokenFor({ uid: 'owner-4', email: ADMIN_EMAIL, emailVerified: true });
    for (const path of ADMIN_GET) {
      expect((await call(path, {}, token)).status, path).toBe(200);
    }
  });

  it('المدير يخضع لبوابة تيليجرام في الأدوات لا في لوحته', async () => {
    const token = tokenFor({ uid: 'owner-5', email: ADMIN_EMAIL, emailVerified: true });
    // لم يربط تيليجرام: الأدوات ممنوعة…
    expect((await call('/api/tools', {}, token)).status).toBe(403);
    // …ولوحة الإدارة مفتوحة، لأنه مالك المنصّة.
    expect((await call('/api/admin/stats', {}, token)).status).toBe(200);
  });
});
