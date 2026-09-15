// @vitest-environment node
/**
 * اختبارات تكامل للمنصّة الموسّعة: التهيئة، ترشيح الأدوات، الجدول الأسبوعي،
 * وصلاحيات الإدارة — على كود الـ Worker نفسه مقابل SQLite في الذاكرة.
 *
 * لا أسرار حقيقية ولا اتصال شبكة: Telegram محاكى باعتراض fetch.
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
const ADMIN_TELEGRAM_ID = '5559869840';
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
function newUserToken(): string {
  counter += 1;
  const uid = `platform-${counter}-${Date.now()}`;
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

/** مستخدم اجتاز بوابة تيليجرام ويستطيع فتح الأدوات. */
async function verifiedUser(telegramUserId: number): Promise<string> {
  const token = newUserToken();
  await call('/api/me', {}, token);
  memberStatuses.set(String(telegramUserId), 'member');
  const tokenResponse = await post('/api/telegram/link-token', undefined, token);
  const { deepLink } = (await tokenResponse.json()) as { deepLink: string };
  await webhook(deepLink.split('start=')[1], telegramUserId);
  return token;
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
    ADMIN_TELEGRAM_ID,
    E2E_TEST_MODE: 'true',
    E2E_TEST_SECRET: TEST_SECRET,
  };

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.startsWith(TELEGRAM_BASE)) throw new Error(`طلب شبكة غير متوقّع: ${url}`);

    if (url.includes('getChatMember')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as { user_id: number };
      const status = memberStatuses.get(String(body.user_id)) ?? 'left';
      return new Response(JSON.stringify({ ok: true, result: { status, is_member: status === 'member' } }), {
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, result: {} }), {
      headers: { 'content-type': 'application/json' },
    });
  });

  worker = (await import('../worker/index')).default as never;
});

beforeEach(() => {
  memberStatuses.clear();
});

afterAll(() => {
  vi.unstubAllGlobals();
  shim.close();
});

/* --------------------------------- الكتالوج -------------------------------- */

describe('الكتالوج', () => {
  it('يعرض البنية التعليمية لأي مستخدم مسجّل قبل بوابة تيليجرام', async () => {
    const token = newUserToken();
    const response = await call('/api/catalog', {}, token);

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      stages: { id: string }[];
      grades: { id: string; requiresTrack: boolean }[];
      tracks: { id: string }[];
      subjects: { id: string }[];
      categories: { id: string }[];
    };

    expect(body.stages.map((stage) => stage.id)).toEqual([
      'primary',
      'intermediate',
      'secondary',
    ]);
    expect(body.grades).toHaveLength(12);
    expect(body.tracks).toHaveLength(5);
    expect(body.subjects.length).toBeGreaterThan(10);
    expect(body.categories.length).toBeGreaterThan(5);
  });

  it('يعلّم الصفوف التي تحتاج مساراً فقط', async () => {
    const token = newUserToken();
    const body = (await (await call('/api/catalog', {}, token)).json()) as {
      grades: { id: string; requiresTrack: boolean }[];
    };

    const needsTrack = body.grades.filter((grade) => grade.requiresTrack).map((g) => g.id);
    expect(needsTrack).toEqual(['s2', 's3']);
  });

  it('يرفض الكتالوج لغير المسجّل', async () => {
    expect((await call('/api/catalog')).status).toBe(401);
  });
});

/* --------------------------------- التهيئة -------------------------------- */

describe('تهيئة الحساب', () => {
  it('المستخدم الجديد يبدأ بملف معلّم غير مكتمل', async () => {
    const token = newUserToken();
    const me = (await (await call('/api/me', {}, token)).json()) as {
      profile: { role: string; onboardingCompleted: boolean };
    };

    expect(me.profile.role).toBe('teacher');
    expect(me.profile.onboardingCompleted).toBe(false);
  });

  it('يحفظ ملف المعلّم ولا يطلب التهيئة مرة أخرى', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const saved = await post(
      '/api/me/profile',
      {
        role: 'teacher',
        stageId: 'intermediate',
        gradeId: 'm2',
        trackId: null,
        subjects: ['math', 'science'],
        onboardingCompleted: true,
      },
      token,
    );
    expect(saved.status).toBe(200);

    const me = (await (await call('/api/me', {}, token)).json()) as {
      profile: {
        role: string;
        stageId: string;
        gradeId: string;
        subjects: string[];
        onboardingCompleted: boolean;
      };
    };

    expect(me.profile).toMatchObject({
      role: 'teacher',
      stageId: 'intermediate',
      gradeId: 'm2',
      onboardingCompleted: true,
    });
    expect(me.profile.subjects.sort()).toEqual(['math', 'science']);
  });

  it('يحفظ ملف الطالب مع المسار الثانوي', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    await post(
      '/api/me/profile',
      {
        role: 'student',
        stageId: 'secondary',
        gradeId: 's3',
        trackId: 'health-life',
        subjects: ['biology'],
        onboardingCompleted: true,
      },
      token,
    );

    const me = (await (await call('/api/me', {}, token)).json()) as {
      profile: { role: string; trackId: string };
    };
    expect(me.profile.role).toBe('student');
    expect(me.profile.trackId).toBe('health-life');
  });

  it('يرفض معرّفاً غير معروف بدل حفظه', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const response = await post(
      '/api/me/profile',
      { role: 'teacher', stageId: 'mars', gradeId: null, trackId: null, subjects: [] },
      token,
    );
    expect(response.status).toBe(400);
  });

  it('يرفض مادة غير معروفة', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const response = await post(
      '/api/me/profile',
      { role: 'teacher', stageId: null, gradeId: null, trackId: null, subjects: ['quantum'] },
      token,
    );
    expect(response.status).toBe(400);
  });

  it('لا يسمح للعميل برفع صلاحيته عبر ملف التهيئة', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    await post(
      '/api/me/profile',
      {
        role: 'teacher',
        stageId: null,
        gradeId: null,
        trackId: null,
        subjects: [],
        // حقول دخيلة: يجب أن تُتجاهل تماماً.
        userRole: 'admin',
        onboardingCompleted: true,
      },
      token,
    );

    const me = (await (await call('/api/me', {}, token)).json()) as { user: { role: string } };
    expect(me.user.role).toBe('user');
  });
});

/* ------------------------------ ترشيح الأدوات ------------------------------ */

describe('ترشيح الأدوات', () => {
  it('المعلّم يرى أدوات المعلم فقط', async () => {
    const token = await verifiedUser(310001);
    await post(
      '/api/me/profile',
      { role: 'teacher', stageId: 'primary', gradeId: 'p5', trackId: null, subjects: ['arabic'] },
      token,
    );

    const body = (await (await call('/api/tools', {}, token)).json()) as {
      tools: { id: string; audience: string }[];
    };

    expect(body.tools.length).toBeGreaterThan(0);
    for (const tool of body.tools) expect(tool.audience).not.toBe('student');
    expect(body.tools.map((tool) => tool.id)).toContain('student-followup');
  });

  it('الطالب يرى أدوات الطالب فقط', async () => {
    const token = await verifiedUser(310002);
    await post(
      '/api/me/profile',
      { role: 'student', stageId: 'intermediate', gradeId: 'm1', trackId: null, subjects: ['math'] },
      token,
    );

    const body = (await (await call('/api/tools', {}, token)).json()) as {
      tools: { id: string; audience: string }[];
    };

    const ids = body.tools.map((tool) => tool.id);
    expect(ids).toEqual(
      expect.arrayContaining(['study-plan', 'homework-organizer', 'exam-prep', 'student-schedule']),
    );
    expect(ids).not.toContain('error-map');
  });

  it('لا يعرض أداة غير منفَّذة حتى لو كانت منشورة', async () => {
    const token = await verifiedUser(310003);

    shim.exec(`INSERT OR IGNORE INTO tools
      (id, slug, name_ar, description_ar, icon, enabled, sort_order, audience, status, is_implemented)
      VALUES ('ghost-tool', 'ghost-tool', 'أداة وهمية', 'لا تنفيذ لها', 'tools', 1, 900, 'teacher', 'published', 0)`);

    const body = (await (await call('/api/tools', {}, token)).json()) as { tools: { id: string }[] };
    expect(body.tools.map((tool) => tool.id)).not.toContain('ghost-tool');
  });

  it('لا يفتح الأدوات لمن لم يجتز بوابة تيليجرام', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    expect((await call('/api/tools', {}, token)).status).toBe(403);
  });
});

/* ----------------------------- الجدول الأسبوعي ----------------------------- */

describe('الجدول الأسبوعي', () => {
  it('ينشئ ويقرأ ويعدّل ويحذف حصة', async () => {
    const token = await verifiedUser(320001);

    const created = await post(
      '/api/schedule/items',
      { day: 0, period: 1, subjectId: 'math', className: 'أ', lessonTitle: 'الكسور' },
      token,
    );
    expect(created.status).toBe(200);
    const { item } = (await created.json()) as { item: { id: string; startTime: string } };
    // الأوقات محسوبة من إعدادات الجدول الافتراضية (07:00 + 45 دقيقة).
    expect(item.startTime).toBe('07:00');

    const listed = (await (await call('/api/schedule', {}, token)).json()) as {
      items: { id: string }[];
      settings: { periodsPerDay: number };
    };
    expect(listed.items).toHaveLength(1);
    expect(listed.settings.periodsPerDay).toBe(7);

    const updated = await post(
      '/api/schedule/items/update',
      { id: item.id, day: 0, period: 2, subjectId: 'math', lessonTitle: 'الكسور العشرية' },
      token,
    );
    expect(updated.status).toBe(200);
    const updatedBody = (await updated.json()) as {
      item: { lessonTitle: string; startTime: string };
    };
    expect(updatedBody.item.lessonTitle).toBe('الكسور العشرية');
    expect(updatedBody.item.startTime).toBe('07:45');

    const removed = await post('/api/schedule/items/delete', { id: item.id }, token);
    expect(removed.status).toBe(200);

    const after = (await (await call('/api/schedule', {}, token)).json()) as { items: unknown[] };
    expect(after.items).toHaveLength(0);
  });

  it('يحفظ إعدادات الجدول ويعيد حساب الأوقات عليها', async () => {
    const token = await verifiedUser(320002);

    await post(
      '/api/schedule/settings',
      { periodsPerDay: 6, startTime: '08:00', periodMinutes: 50 },
      token,
    );

    const created = await post('/api/schedule/items', { day: 1, period: 2 }, token);
    const { item } = (await created.json()) as { item: { startTime: string; endTime: string } };
    expect(item.startTime).toBe('08:50');
    expect(item.endTime).toBe('09:40');
  });

  it('يمسح يوماً واحداً دون بقيّة الأسبوع', async () => {
    const token = await verifiedUser(320003);

    await post('/api/schedule/items', { day: 0, period: 1 }, token);
    await post('/api/schedule/items', { day: 0, period: 2 }, token);
    await post('/api/schedule/items', { day: 2, period: 1 }, token);

    await post('/api/schedule/clear', { day: 0 }, token);

    const body = (await (await call('/api/schedule', {}, token)).json()) as {
      items: { day: number }[];
    };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].day).toBe(2);
  });

  it('لا يستطيع مستخدم تعديل أو حذف حصّة غيره', async () => {
    const owner = await verifiedUser(320004);
    const intruder = await verifiedUser(320005);

    const created = await post('/api/schedule/items', { day: 3, period: 1 }, owner);
    const { item } = (await created.json()) as { item: { id: string } };

    const update = await post(
      '/api/schedule/items/update',
      { id: item.id, day: 3, period: 5 },
      intruder,
    );
    expect(update.status).toBe(404);

    const remove = await post('/api/schedule/items/delete', { id: item.id }, intruder);
    expect(remove.status).toBe(404);

    // الحصة ما زالت سليمة عند صاحبها.
    const body = (await (await call('/api/schedule', {}, owner)).json()) as {
      items: { period: number }[];
    };
    expect(body.items[0].period).toBe(1);
  });

  it('يرفض مدخلات الجدول غير الصحيحة', async () => {
    const token = await verifiedUser(320006);

    expect((await post('/api/schedule/items', { day: 9, period: 1 }, token)).status).toBe(400);
    expect((await post('/api/schedule/items', { day: 0, period: 99 }, token)).status).toBe(400);
    expect(
      (await post('/api/schedule/settings', { periodsPerDay: 6, startTime: '99:99', periodMinutes: 50 }, token))
        .status,
    ).toBe(400);
  });

  it('يمنع الجدول عمّن لم يجتز بوابة تيليجرام', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);
    expect((await call('/api/schedule', {}, token)).status).toBe(403);
  });
});

/* ------------------------------ صلاحيات الإدارة ----------------------------- */

describe('صلاحيات الإدارة', () => {
  /**
   * توكن الإدمن يُنشأ مرة واحدة ويُعاد استخدامه.
   * الترقية تحدث عبر ربط حساب تيليجرام الإدمن، وحساب تيليجرام واحد لا يُربط
   * بأكثر من مستخدم — فإنشاء إدمن جديد لكل اختبار يفشل بحكم التصميم.
   */
  let cachedAdminToken: string | null = null;

  async function adminToken(): Promise<string> {
    if (cachedAdminToken) {
      memberStatuses.set(ADMIN_TELEGRAM_ID, 'member');
      return cachedAdminToken;
    }
    const token = newUserToken();
    await call('/api/me', {}, token);
    memberStatuses.set(ADMIN_TELEGRAM_ID, 'member');
    const response = await post('/api/telegram/link-token', undefined, token);
    const { deepLink } = (await response.json()) as { deepLink: string };
    await webhook(deepLink.split('start=')[1], Number(ADMIN_TELEGRAM_ID));
    cachedAdminToken = token;
    return token;
  }

  it('يمنع غير الإدمن من كل نقاط الإدارة', async () => {
    const token = await verifiedUser(330001);

    const endpoints: [string, unknown][] = [
      ['/api/admin/tools', { slug: 'x', nameAr: 'x', descriptionAr: '', icon: 'tools', categoryId: null, audience: 'teacher', status: 'draft', stages: [], grades: [], subjects: [], keywords: [], isFeatured: false, isNew: false, sortOrder: 1 }],
      ['/api/admin/tools/status', { id: 'error-map', status: 'disabled' }],
      ['/api/admin/tools/order', { items: [{ id: 'error-map', sortOrder: 5 }] }],
      ['/api/admin/categories', { id: 'x', nameAr: 'x', descriptionAr: '', icon: 'tools', audience: 'teacher', sortOrder: 1, enabled: true }],
      ['/api/admin/subjects', { id: 'x', nameAr: 'x', stageId: null, sortOrder: 1, enabled: true }],
      ['/api/admin/reference/toggle', { entity: 'stage', id: 'primary', enabled: false }],
    ];

    for (const [path, body] of endpoints) {
      expect((await post(path, body, token)).status, path).toBe(403);
    }
    expect((await call('/api/admin/catalog', {}, token)).status).toBe(403);
  });

  it('يمنع غير المسجّل تماماً', async () => {
    expect((await call('/api/admin/catalog')).status).toBe(401);
    expect((await post('/api/admin/tools', {})).status).toBe(401);
  });

  it('الإدمن ينشئ أداة ويغيّر حالتها ويُسجَّل ذلك في سجل الإدارة', async () => {
    const token = await adminToken();

    const created = await post(
      '/api/admin/tools',
      {
        slug: 'lesson-goals',
        nameAr: 'أهداف الدرس',
        descriptionAr: 'صياغة أهداف قابلة للقياس.',
        icon: 'target',
        categoryId: 'planning',
        audience: 'teacher',
        status: 'draft',
        stages: [],
        grades: [],
        subjects: [],
        keywords: ['أهداف', 'تحضير'],
        isFeatured: false,
        isNew: true,
        sortOrder: 20,
      },
      token,
    );
    expect(created.status).toBe(200);

    const statusChange = await post(
      '/api/admin/tools/status',
      { id: 'lesson-goals', status: 'published' },
      token,
    );
    expect(statusChange.status).toBe(200);

    const catalog = (await (await call('/api/admin/catalog', {}, token)).json()) as {
      tools: { id: string; status: string; isImplemented: boolean }[];
      audit: { action: string; entityType: string; entityId: string }[];
    };

    const tool = catalog.tools.find((entry) => entry.id === 'lesson-goals');
    expect(tool?.status).toBe('published');
    // منشورة لكن بلا تنفيذ ⇒ لا تظهر للمستخدم.
    expect(tool?.isImplemented).toBe(false);

    expect(catalog.audit.some((entry) => entry.action === 'create' && entry.entityId === 'lesson-goals')).toBe(true);
    expect(catalog.audit.some((entry) => entry.action === 'publish' && entry.entityId === 'lesson-goals')).toBe(true);
  });

  it('الإدمن يعطّل مادة فتختفي من الكتالوج العام', async () => {
    const token = await adminToken();

    await post(
      '/api/admin/reference/toggle',
      { entity: 'subject', id: 'geology', enabled: false },
      token,
    );

    const body = (await (await call('/api/catalog', {}, token)).json()) as {
      subjects: { id: string }[];
    };
    expect(body.subjects.map((subject) => subject.id)).not.toContain('geology');
  });

  it('يرفض مدخلات إدارية غير صحيحة', async () => {
    const token = await adminToken();

    // معرّف بأحرف غير مسموحة.
    expect(
      (await post('/api/admin/subjects', { id: 'مادة', nameAr: 'مادة', stageId: null, sortOrder: 1, enabled: true }, token)).status,
    ).toBe(400);

    // جمهور غير معروف.
    expect(
      (await post('/api/admin/categories', { id: 'x', nameAr: 'x', descriptionAr: '', icon: 'tools', audience: 'aliens', sortOrder: 1, enabled: true }, token)).status,
    ).toBe(400);
  });
});
