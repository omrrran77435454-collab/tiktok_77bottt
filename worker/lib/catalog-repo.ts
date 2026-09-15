/**
 * طبقة الوصول للبيانات المرجعية (المراحل، الصفوف، المسارات، المواد،
 * الأقسام، الأدوات) وملفّات المستخدمين.
 *
 * نفس قواعد repo.ts: كل الاستعلامات Parameterized، ولا SELECT *،
 * ولا يُبنى SQL بدمج نصوص قادمة من العميل.
 */
import type {
  CatalogResponse,
  GradeRef,
  ProfileRole,
  StageRef,
  SubjectRef,
  ToolCatalogItem,
  ToolCategoryRef,
  TrackRef,
  UserProfile,
} from '@shared/types';
import { nowIso } from './repo';

/* ----------------------------- بيانات مرجعية ----------------------------- */

export async function listStages(db: D1Database): Promise<StageRef[]> {
  const result = await db
    .prepare(
      `SELECT id, name_ar, sort_order FROM education_stages
       WHERE enabled = 1 ORDER BY sort_order ASC`,
    )
    .all<{ id: string; name_ar: string; sort_order: number }>();
  return (result.results ?? []).map((row) => ({ id: row.id, nameAr: row.name_ar }));
}

export async function listGrades(db: D1Database): Promise<GradeRef[]> {
  const result = await db
    .prepare(
      `SELECT id, stage_id, name_ar, requires_track, sort_order FROM grades
       WHERE enabled = 1 ORDER BY stage_id ASC, sort_order ASC`,
    )
    .all<{
      id: string;
      stage_id: string;
      name_ar: string;
      requires_track: number;
      sort_order: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    stageId: row.stage_id,
    nameAr: row.name_ar,
    requiresTrack: row.requires_track === 1,
  }));
}

export async function listTracks(db: D1Database): Promise<TrackRef[]> {
  const result = await db
    .prepare(`SELECT id, name_ar FROM tracks WHERE enabled = 1 ORDER BY sort_order ASC`)
    .all<{ id: string; name_ar: string }>();
  return (result.results ?? []).map((row) => ({ id: row.id, nameAr: row.name_ar }));
}

export async function listSubjects(db: D1Database): Promise<SubjectRef[]> {
  const result = await db
    .prepare(
      `SELECT id, name_ar, stage_id FROM subjects
       WHERE enabled = 1 ORDER BY sort_order ASC`,
    )
    .all<{ id: string; name_ar: string; stage_id: string | null }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    nameAr: row.name_ar,
    stageId: row.stage_id,
  }));
}

export async function listCategories(db: D1Database): Promise<ToolCategoryRef[]> {
  const result = await db
    .prepare(
      `SELECT id, name_ar, description_ar, icon, audience, sort_order
       FROM tool_categories WHERE enabled = 1 ORDER BY sort_order ASC`,
    )
    .all<{
      id: string;
      name_ar: string;
      description_ar: string;
      icon: string;
      audience: string;
      sort_order: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    nameAr: row.name_ar,
    descriptionAr: row.description_ar,
    icon: row.icon,
    audience: normalizeAudience(row.audience),
    sortOrder: row.sort_order,
  }));
}

function normalizeAudience(value: string): 'teacher' | 'student' | 'both' {
  return value === 'student' || value === 'both' ? value : 'teacher';
}

/** يحوّل قائمة مفصولة بفواصل إلى مصفوفة نظيفة. '' تعني «بلا قيد». */
export function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/* -------------------------------- الأدوات -------------------------------- */

interface ToolRow {
  id: string;
  slug: string;
  name_ar: string;
  description_ar: string;
  icon: string;
  sort_order: number;
  category_id: string | null;
  audience: string;
  status: string;
  stages: string | null;
  grades: string | null;
  subjects: string | null;
  keywords: string | null;
  is_featured: number;
  is_new: number;
  is_implemented: number;
  enabled: number;
}

const TOOL_COLUMNS = `id, slug, name_ar, description_ar, icon, sort_order, category_id,
  audience, status, stages, grades, subjects, keywords, is_featured, is_new,
  is_implemented, enabled`;

function toToolItem(row: ToolRow): ToolCatalogItem {
  return {
    id: row.id,
    slug: row.slug,
    nameAr: row.name_ar,
    descriptionAr: row.description_ar,
    icon: row.icon,
    categoryId: row.category_id,
    audience: normalizeAudience(row.audience),
    status: row.status === 'draft' || row.status === 'disabled' ? row.status : 'published',
    stages: splitList(row.stages),
    grades: splitList(row.grades),
    subjects: splitList(row.subjects),
    keywords: splitList(row.keywords),
    isFeatured: row.is_featured === 1,
    isNew: row.is_new === 1,
    isImplemented: row.is_implemented === 1,
    sortOrder: row.sort_order,
  };
}

/** الأدوات المنشورة والمنفَّذة فعلاً — ما يراه المستخدم العادي. */
export async function listPublishedTools(db: D1Database): Promise<ToolCatalogItem[]> {
  const result = await db
    .prepare(
      `SELECT ${TOOL_COLUMNS} FROM tools
       WHERE enabled = 1 AND status = 'published' AND is_implemented = 1
       ORDER BY sort_order ASC`,
    )
    .all<ToolRow>();
  return (result.results ?? []).map(toToolItem);
}

/** كل الأدوات بما فيها المسودّات والمعطّلة — للوحة الإدارة فقط. */
export async function listAllTools(db: D1Database): Promise<ToolCatalogItem[]> {
  const result = await db
    .prepare(`SELECT ${TOOL_COLUMNS} FROM tools ORDER BY sort_order ASC`)
    .all<ToolRow>();
  return (result.results ?? []).map(toToolItem);
}

/**
 * يرشّح الأدوات حسب ملف المستخدم.
 *
 * القاعدة: قائمة فارغة تعني «بلا قيد». نطبّق القيد فقط عندما تكون القائمة
 * غير فارغة وقيمة المستخدم معروفة — فلا يختفي شيء بسبب ملف ناقص.
 */
export function filterToolsForProfile(
  tools: ToolCatalogItem[],
  profile: { role: ProfileRole; stageId: string | null; gradeId: string | null; subjects: string[] },
): ToolCatalogItem[] {
  return tools.filter((tool) => {
    if (tool.audience !== 'both' && tool.audience !== profile.role) return false;
    if (tool.stages.length && profile.stageId && !tool.stages.includes(profile.stageId)) return false;
    if (tool.grades.length && profile.gradeId && !tool.grades.includes(profile.gradeId)) return false;
    if (tool.subjects.length && profile.subjects.length) {
      const overlap = tool.subjects.some((subject) => profile.subjects.includes(subject));
      if (!overlap) return false;
    }
    return true;
  });
}

/* ------------------------------ ملف المستخدم ------------------------------ */

interface ProfileRow {
  user_id: string;
  role: string;
  stage_id: string | null;
  grade_id: string | null;
  track_id: string | null;
  onboarding_completed: number;
  completed_at: string | null;
}

/** الملف الافتراضي لمستخدم لم يُكمل التهيئة بعد: تجربة معلّم. */
export const DEFAULT_PROFILE: UserProfile = {
  role: 'teacher',
  stageId: null,
  gradeId: null,
  trackId: null,
  subjects: [],
  onboardingCompleted: false,
  completedAt: null,
};

export async function getProfile(db: D1Database, userId: string): Promise<UserProfile> {
  const row = await db
    .prepare(
      `SELECT user_id, role, stage_id, grade_id, track_id, onboarding_completed, completed_at
       FROM profiles WHERE user_id = ?1`,
    )
    .bind(userId)
    .first<ProfileRow>();

  if (!row) return DEFAULT_PROFILE;

  const subjects = await listUserSubjects(db, userId);
  return {
    role: row.role === 'student' ? 'student' : 'teacher',
    stageId: row.stage_id,
    gradeId: row.grade_id,
    trackId: row.track_id,
    subjects,
    onboardingCompleted: row.onboarding_completed === 1,
    completedAt: row.completed_at,
  };
}

export async function listUserSubjects(db: D1Database, userId: string): Promise<string[]> {
  const result = await db
    .prepare(`SELECT subject_id FROM user_subjects WHERE user_id = ?1`)
    .bind(userId)
    .all<{ subject_id: string }>();
  return (result.results ?? []).map((row) => row.subject_id);
}

export interface ProfileInput {
  role: ProfileRole;
  stageId: string | null;
  gradeId: string | null;
  trackId: string | null;
  subjects: string[];
  onboardingCompleted: boolean;
}

/**
 * يحفظ ملف المستخدم ومواده.
 *
 * كل المعرّفات تُتحقَّق من وجودها في الجداول المرجعية قبل الحفظ، فلا يستطيع
 * العميل حقن قيم عشوائية (Mass assignment). أي معرّف غير معروف يُرفض.
 */
export async function saveProfile(
  db: D1Database,
  userId: string,
  input: ProfileInput,
): Promise<UserProfile> {
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO profiles
         (user_id, role, stage_id, grade_id, track_id, onboarding_completed, completed_at,
          created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
       ON CONFLICT (user_id) DO UPDATE SET
         role = excluded.role,
         stage_id = excluded.stage_id,
         grade_id = excluded.grade_id,
         track_id = excluded.track_id,
         onboarding_completed = excluded.onboarding_completed,
         completed_at = COALESCE(profiles.completed_at, excluded.completed_at),
         updated_at = excluded.updated_at`,
    )
    .bind(
      userId,
      input.role,
      input.stageId,
      input.gradeId,
      input.trackId,
      input.onboardingCompleted ? 1 : 0,
      input.onboardingCompleted ? now : null,
      now,
    )
    .run();

  await db.prepare(`DELETE FROM user_subjects WHERE user_id = ?1`).bind(userId).run();

  if (input.subjects.length) {
    const statements = input.subjects.map((subjectId) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO user_subjects (user_id, subject_id, created_at)
           VALUES (?1, ?2, ?3)`,
        )
        .bind(userId, subjectId, now),
    );
    await db.batch(statements);
  }

  return getProfile(db, userId);
}

/** يُرجع المعرّفات الموجودة فعلاً من بين المطلوبة (تحقّق من صحّة المدخلات). */
export async function existingIds(
  db: D1Database,
  table: 'education_stages' | 'grades' | 'tracks' | 'subjects',
  ids: string[],
): Promise<Set<string>> {
  if (!ids.length) return new Set();
  // أسماء الجداول من اتحاد ثابت في النوع، لا من إدخال المستخدم.
  const placeholders = ids.map((_id, index) => `?${index + 1}`).join(', ');
  const result = await db
    .prepare(`SELECT id FROM ${table} WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<{ id: string }>();
  return new Set((result.results ?? []).map((row) => row.id));
}

/* -------------------------------- الكتالوج -------------------------------- */

export async function loadCatalog(db: D1Database): Promise<CatalogResponse> {
  const [stages, grades, tracks, subjects, categories] = await Promise.all([
    listStages(db),
    listGrades(db),
    listTracks(db),
    listSubjects(db),
    listCategories(db),
  ]);
  return { stages, grades, tracks, subjects, categories };
}
