// @vitest-environment node
/**
 * نموذجان تعليميان مختلفان عمداً:
 *   المعلم  — عدة مراحل وصفوف ومواد وشُعب (teacher_assignments).
 *   الطالب  — مرحلة واحدة وصف واحد ومسار اختياري ومواد متعددة.
 *
 * كان النموذج واحداً للاثنين، وهو صحيح للطالب وخاطئ للمعلم.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { D1SqliteShim } from '../scripts/d1-sqlite-shim.mjs';
import { identityToken } from './helpers/test-token';
import {
  educationScope,
  filterToolsForProfile,
  scopeFromAssignments,
} from '../worker/lib/catalog-repo';
import type { TeacherAssignment, ToolCatalogItem } from '@shared/types';

/* ------------------------------ نطاق النصاب ------------------------------ */

const assignment = (
  stageId: string,
  gradeId: string,
  subjectId: string,
  className: string | null = null,
): TeacherAssignment => ({
  id: `${stageId}-${gradeId}-${subjectId}-${className ?? ''}`,
  stageId,
  gradeId,
  subjectId,
  className,
  section: null,
  isActive: true,
});

describe('نطاق المعلم يُشتقّ من نصابه', () => {
  // المثال الواقعي من المتطلّبات.
  const real = [
    assignment('primary', 'p4', 'arabic', 'رابع أ'),
    assignment('primary', 'p5', 'arabic', 'خامس ب'),
    assignment('intermediate', 'm1', 'islamic', 'أول أ'),
  ];

  it('يجمع المراحل بلا تكرار', () => {
    expect(scopeFromAssignments(real).stages.sort()).toEqual(['intermediate', 'primary']);
  });

  it('يجمع الصفوف بلا تكرار', () => {
    expect(scopeFromAssignments(real).grades.sort()).toEqual(['m1', 'p4', 'p5']);
  });

  it('يجمع المواد بلا تكرار', () => {
    expect(scopeFromAssignments(real).subjects.sort()).toEqual(['arabic', 'islamic']);
  });

  it('يدعم عدة شُعب لنفس المادة والصف', () => {
    const twoSections = [
      assignment('primary', 'p4', 'arabic', 'أ'),
      assignment('primary', 'p4', 'arabic', 'ب'),
    ];
    const scope = scopeFromAssignments(twoSections);
    expect(scope.grades).toEqual(['p4']);
    expect(scope.subjects).toEqual(['arabic']);
  });

  it('نصاب فارغ ← نطاق فارغ', () => {
    expect(scopeFromAssignments([])).toEqual({ stages: [], grades: [], subjects: [] });
  });
});

describe('educationScope يوحّد النموذجين', () => {
  it('المعلم: النطاق من النصاب لا من الحقول المفردة', () => {
    const scope = educationScope({
      role: 'teacher',
      stageId: null,
      gradeId: null,
      subjects: [],
      assignments: [assignment('primary', 'p4', 'arabic'), assignment('secondary', 's1', 'physics')],
    });

    expect(scope.stages.sort()).toEqual(['primary', 'secondary']);
    expect(scope.grades.sort()).toEqual(['p4', 's1']);
  });

  it('الطالب: النطاق من مرحلته وصفّه المفردين', () => {
    const scope = educationScope({
      role: 'student',
      stageId: 'intermediate',
      gradeId: 'm3',
      subjects: ['math', 'science'],
    });

    expect(scope.stages).toEqual(['intermediate']);
    expect(scope.grades).toEqual(['m3']);
    expect(scope.subjects).toEqual(['math', 'science']);
  });

  it('المعلم بلا نصاب لا ينهار — نطاق فارغ يعني بلا قيد', () => {
    const scope = educationScope({
      role: 'teacher',
      stageId: null,
      gradeId: null,
      subjects: [],
      assignments: [],
    });
    expect(scope).toEqual({ stages: [], grades: [], subjects: [] });
  });
});

describe('ترشيح الأدوات بنطاق متعدّد', () => {
  const tool = (overrides: Partial<ToolCatalogItem>): ToolCatalogItem => ({
    id: 'x',
    slug: 'x',
    nameAr: 'أداة',
    descriptionAr: '',
    icon: 'tools',
    categoryId: null,
    audience: 'teacher',
    status: 'published',
    stages: [],
    grades: [],
    subjects: [],
    keywords: [],
    isFeatured: false,
    isNew: false,
    isImplemented: true,
    sortOrder: 1,
    ...overrides,
  });

  const teacher = {
    role: 'teacher' as const,
    stageId: null,
    gradeId: null,
    subjects: [],
    assignments: [assignment('primary', 'p4', 'arabic'), assignment('intermediate', 'm1', 'islamic')],
  };

  it('معلّم متعدّد المراحل يرى أداة تخصّ إحداها', () => {
    const tools = [
      tool({ id: 'primary-only', stages: ['primary'] }),
      tool({ id: 'intermediate-only', stages: ['intermediate'] }),
      tool({ id: 'secondary-only', stages: ['secondary'] }),
    ];

    const visible = filterToolsForProfile(tools, teacher).map((entry) => entry.id);
    expect(visible).toEqual(['primary-only', 'intermediate-only']);
  });

  it('يرى أداة تخصّ أحد صفوفه', () => {
    const tools = [tool({ id: 'p4', grades: ['p4'] }), tool({ id: 'p6', grades: ['p6'] })];
    expect(filterToolsForProfile(tools, teacher).map((e) => e.id)).toEqual(['p4']);
  });

  it('يرى أداة تخصّ إحدى مواد نصابه', () => {
    const tools = [
      tool({ id: 'arabic', subjects: ['arabic'] }),
      tool({ id: 'math', subjects: ['math'] }),
    ];
    expect(filterToolsForProfile(tools, teacher).map((e) => e.id)).toEqual(['arabic']);
  });

  it('الطالب يُرشَّح بمرحلته الواحدة', () => {
    const student = {
      role: 'student' as const,
      stageId: 'intermediate',
      gradeId: 'm1',
      subjects: ['math'],
    };
    const tools = [
      tool({ id: 'inter', audience: 'student', stages: ['intermediate'] }),
      tool({ id: 'primary', audience: 'student', stages: ['primary'] }),
    ];
    expect(filterToolsForProfile(tools, student).map((e) => e.id)).toEqual(['inter']);
  });
});

/* --------------------------- التكامل والملكية --------------------------- */

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

let counter = 0;
function newUserToken(): string {
  counter += 1;
  const uid = `model-${counter}-${Date.now()}`;
  return identityToken({ uid, email: `${uid}@example.com` }, TEST_SECRET);
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
    TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-for-tests-only',
    TELEGRAM_API_BASE: 'https://telegram.test',
    ADMIN_TELEGRAM_ID: '5559869840',
    ADMIN_EMAIL: 'owner@example.com',
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

interface ProfileBody {
  profile: {
    role: string;
    stageId: string | null;
    gradeId: string | null;
    trackId: string | null;
    subjects: string[];
    assignments: { stageId: string; gradeId: string; subjectId: string; className: string | null }[];
  };
}

describe('نموذج المعلم عبر الـ API', () => {
  it('يحفظ عدة مراحل وصفوف ومواد وشُعب معاً', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const response = await post(
      '/api/me/profile',
      {
        role: 'teacher',
        stageId: null,
        gradeId: null,
        trackId: null,
        subjects: [],
        assignments: [
          { stageId: 'primary', gradeId: 'p4', subjectId: 'arabic', className: 'رابع أ' },
          { stageId: 'primary', gradeId: 'p5', subjectId: 'arabic', className: 'خامس ب' },
          { stageId: 'intermediate', gradeId: 'm1', subjectId: 'islamic', className: 'أول أ' },
        ],
      },
      token,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as ProfileBody;
    expect(body.profile.assignments).toHaveLength(3);
    expect([...new Set(body.profile.assignments.map((a) => a.stageId))].sort()).toEqual([
      'intermediate',
      'primary',
    ]);
    expect(body.profile.assignments.map((a) => a.className)).toContain('رابع أ');
  });

  it('حفظ النصاب يستبدله كاملاً ولا يراكمه', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const save = (assignments: unknown[]) =>
      post(
        '/api/me/profile',
        { role: 'teacher', stageId: null, gradeId: null, trackId: null, subjects: [], assignments },
        token,
      );

    await save([
      { stageId: 'primary', gradeId: 'p4', subjectId: 'arabic' },
      { stageId: 'primary', gradeId: 'p5', subjectId: 'arabic' },
    ]);
    const second = await save([{ stageId: 'secondary', gradeId: 's1', subjectId: 'physics' }]);

    const body = (await second.json()) as ProfileBody;
    expect(body.profile.assignments).toHaveLength(1);
    expect(body.profile.assignments[0].subjectId).toBe('physics');
  });

  it('يرفض تكليفاً بمعرّف غير معروف', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const response = await post(
      '/api/me/profile',
      {
        role: 'teacher',
        stageId: null,
        gradeId: null,
        trackId: null,
        subjects: [],
        assignments: [{ stageId: 'mars', gradeId: 'p4', subjectId: 'arabic' }],
      },
      token,
    );
    expect(response.status).toBe(400);
  });
});

describe('نموذج الطالب عبر الـ API', () => {
  it('يحفظ مرحلة واحدة وصفاً واحداً ومواد متعددة', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const response = await post(
      '/api/me/profile',
      {
        role: 'student',
        stageId: 'intermediate',
        gradeId: 'm3',
        trackId: null,
        subjects: ['math', 'science', 'arabic'],
      },
      token,
    );

    const body = (await response.json()) as ProfileBody;
    expect(body.profile.stageId).toBe('intermediate');
    expect(body.profile.gradeId).toBe('m3');
    expect(body.profile.subjects.sort()).toEqual(['arabic', 'math', 'science']);
  });

  it('يحفظ المسار عندما يتطلّبه صفّه', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const response = await post(
      '/api/me/profile',
      {
        role: 'student',
        stageId: 'secondary',
        gradeId: 's3',
        trackId: 'cs-engineering',
        subjects: ['physics'],
      },
      token,
    );

    const body = (await response.json()) as ProfileBody;
    expect(body.profile.trackId).toBe('cs-engineering');
  });

  it('لا يُمنح الطالب نصاباً حتى لو أرسله', async () => {
    const token = newUserToken();
    await call('/api/me', {}, token);

    const response = await post(
      '/api/me/profile',
      {
        role: 'student',
        stageId: 'primary',
        gradeId: 'p3',
        trackId: null,
        subjects: ['math'],
        // الطالب لا يملك نصاباً — يُتجاهل تماماً.
        assignments: [{ stageId: 'primary', gradeId: 'p4', subjectId: 'arabic' }],
      },
      token,
    );

    const body = (await response.json()) as ProfileBody;
    expect(body.profile.assignments).toEqual([]);
  });

  it('التحوّل من معلّم إلى طالب يمسح النصاب السابق', async () => {
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
        assignments: [{ stageId: 'primary', gradeId: 'p4', subjectId: 'arabic' }],
      },
      token,
    );

    const asStudent = await post(
      '/api/me/profile',
      { role: 'student', stageId: 'primary', gradeId: 'p4', trackId: null, subjects: ['arabic'] },
      token,
    );

    const body = (await asStudent.json()) as ProfileBody;
    expect(body.profile.role).toBe('student');
    expect(body.profile.assignments).toEqual([]);
  });
});

describe('ملكية البيانات', () => {
  it('معلّم لا يرى ولا يعدّل نصاب معلّم آخر', async () => {
    const first = newUserToken();
    const second = newUserToken();
    await call('/api/me', {}, first);
    await call('/api/me', {}, second);

    await post(
      '/api/me/profile',
      {
        role: 'teacher',
        stageId: null,
        gradeId: null,
        trackId: null,
        subjects: [],
        assignments: [{ stageId: 'primary', gradeId: 'p4', subjectId: 'arabic', className: 'سرّي' }],
      },
      first,
    );

    // الثاني يحفظ نصابه هو — لا أثر على الأول.
    await post(
      '/api/me/profile',
      {
        role: 'teacher',
        stageId: null,
        gradeId: null,
        trackId: null,
        subjects: [],
        assignments: [{ stageId: 'secondary', gradeId: 's1', subjectId: 'physics' }],
      },
      second,
    );

    const firstProfile = (await (await call('/api/me/profile', {}, first)).json()) as ProfileBody;
    const secondProfile = (await (await call('/api/me/profile', {}, second)).json()) as ProfileBody;

    expect(firstProfile.profile.assignments).toHaveLength(1);
    expect(firstProfile.profile.assignments[0].className).toBe('سرّي');
    expect(secondProfile.profile.assignments[0].subjectId).toBe('physics');
  });

  it('المسار يعمل على صاحب التوكن فقط — لا يقبل معرّف مستخدم من الجسم', async () => {
    const victim = newUserToken();
    const attacker = newUserToken();
    await call('/api/me', {}, victim);
    await call('/api/me', {}, attacker);

    const victimProfile = (await (await call('/api/me', {}, victim)).json()) as {
      user: { id: string };
    };

    await post(
      '/api/me/profile',
      {
        role: 'student',
        stageId: 'primary',
        gradeId: 'p1',
        trackId: null,
        subjects: [],
        // محاولة استهداف مستخدم آخر.
        userId: victimProfile.user.id,
        user_id: victimProfile.user.id,
      },
      attacker,
    );

    const victimAfter = (await (await call('/api/me', {}, victim)).json()) as {
      profile: { onboardingCompleted: boolean; gradeId: string | null };
    };
    // ملف الضحية لم يتغيّر.
    expect(victimAfter.profile.onboardingCompleted).toBe(false);
    expect(victimAfter.profile.gradeId).toBeNull();
  });
});
