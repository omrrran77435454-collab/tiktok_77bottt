/**
 * إدارة البيانات المرجعية + سجل الإجراءات.
 *
 * كل دالة هنا تُستدعى فقط بعد requireAdmin في طبقة المسارات — التحقّق من
 * الصلاحية يقع في الخادم دائماً، وإخفاء الزر في الواجهة ليس حماية.
 *
 * ممنوع تخزين أي سرّ هنا: metadata نصّ JSON من حقول العرض فقط.
 */
import type { AdminAuditEntry, AdminToolInput, ToolAudience, ToolStatus } from '@shared/types';
import { nowIso } from './repo';

/* ------------------------------- سجل الإدارة ------------------------------- */

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'disable'
  | 'reorder';

export type AuditEntity = 'tool' | 'category' | 'subject' | 'stage' | 'grade' | 'track' | 'user';

/** مفاتيح يُمنع تسجيلها إطلاقاً حتى لو وصلت بالخطأ. */
const FORBIDDEN_METADATA_KEYS = new Set([
  'token',
  'secret',
  'password',
  'apikey',
  'api_key',
  'authorization',
  'bot_token',
  'id_token',
  'access_token',
]);

/** ينظّف بيانات السجل: قيم قصيرة فقط، وبلا أي مفتاح حسّاس. */
export function sanitizeMetadata(input: Record<string, unknown>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase())) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') continue;
    safe[key] = String(value).slice(0, 120);
  }
  return safe;
}

export async function recordAudit(
  db: D1Database,
  actorUserId: string,
  action: AuditAction,
  entityType: AuditEntity,
  entityId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO admin_audit_logs
         (id, actor_user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      crypto.randomUUID(),
      actorUserId,
      action,
      entityType,
      entityId,
      JSON.stringify(sanitizeMetadata(metadata)),
      nowIso(),
    )
    .run();
}

export async function listAudit(db: D1Database, limit = 50): Promise<AdminAuditEntry[]> {
  const result = await db
    .prepare(
      `SELECT logs.id, logs.action, logs.entity_type, logs.entity_id, logs.created_at,
              users.name AS actor_name
       FROM admin_audit_logs AS logs
       JOIN users ON users.id = logs.actor_user_id
       ORDER BY logs.created_at DESC
       LIMIT ?1`,
    )
    .bind(Math.min(Math.max(limit, 1), 200))
    .all<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      created_at: string;
      actor_name: string;
    }>();

  return (result.results ?? []).map((row) => ({
    id: row.id,
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
  }));
}

/* --------------------------------- الأدوات -------------------------------- */

function joinList(values: string[]): string {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].join(',');
}

export async function upsertTool(
  db: D1Database,
  toolId: string | null,
  input: AdminToolInput,
): Promise<string> {
  const now = nowIso();
  const id = toolId ?? input.slug;

  await db
    .prepare(
      `INSERT INTO tools
         (id, slug, name_ar, description_ar, icon, enabled, sort_order, category_id,
          audience, status, stages, grades, subjects, keywords, is_featured, is_new,
          is_implemented, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
               COALESCE((SELECT is_implemented FROM tools WHERE id = ?1), 0), ?16, ?16)
       ON CONFLICT (id) DO UPDATE SET
         slug = excluded.slug,
         name_ar = excluded.name_ar,
         description_ar = excluded.description_ar,
         icon = excluded.icon,
         sort_order = excluded.sort_order,
         category_id = excluded.category_id,
         audience = excluded.audience,
         status = excluded.status,
         stages = excluded.stages,
         grades = excluded.grades,
         subjects = excluded.subjects,
         keywords = excluded.keywords,
         is_featured = excluded.is_featured,
         is_new = excluded.is_new,
         updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      input.slug,
      input.nameAr,
      input.descriptionAr,
      input.icon,
      input.sortOrder,
      input.categoryId,
      input.audience,
      input.status,
      joinList(input.stages),
      joinList(input.grades),
      joinList(input.subjects),
      joinList(input.keywords),
      input.isFeatured ? 1 : 0,
      input.isNew ? 1 : 0,
      now,
    )
    .run();

  return id;
}

/**
 * تغيير حالة الأداة (نشر / إلغاء نشر / تعطيل).
 * لا نحذف صفوف الأدوات إطلاقاً: الحذف يفقد إحصاءات الاستخدام المرتبطة بها،
 * و«التعطيل» يحقّق نفس الغرض بأمان ويمكن التراجع عنه.
 */
export async function setToolStatus(
  db: D1Database,
  toolId: string,
  status: ToolStatus,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE tools SET status = ?1, enabled = ?2, updated_at = ?3 WHERE id = ?4`,
    )
    .bind(status, status === 'published' ? 1 : 0, nowIso(), toolId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function setToolOrder(
  db: D1Database,
  toolId: string,
  sortOrder: number,
): Promise<boolean> {
  const result = await db
    .prepare(`UPDATE tools SET sort_order = ?1, updated_at = ?2 WHERE id = ?3`)
    .bind(sortOrder, nowIso(), toolId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

/* --------------------------- الأقسام والمواد --------------------------- */

export interface CategoryInput {
  id: string;
  nameAr: string;
  descriptionAr: string;
  icon: string;
  audience: ToolAudience;
  sortOrder: number;
  enabled: boolean;
}

export async function upsertCategory(db: D1Database, input: CategoryInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO tool_categories
         (id, name_ar, description_ar, icon, audience, sort_order, enabled)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT (id) DO UPDATE SET
         name_ar = excluded.name_ar,
         description_ar = excluded.description_ar,
         icon = excluded.icon,
         audience = excluded.audience,
         sort_order = excluded.sort_order,
         enabled = excluded.enabled`,
    )
    .bind(
      input.id,
      input.nameAr,
      input.descriptionAr,
      input.icon,
      input.audience,
      input.sortOrder,
      input.enabled ? 1 : 0,
    )
    .run();
}

export interface SubjectInput {
  id: string;
  nameAr: string;
  stageId: string | null;
  sortOrder: number;
  enabled: boolean;
}

export async function upsertSubject(db: D1Database, input: SubjectInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO subjects (id, name_ar, stage_id, sort_order, enabled)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT (id) DO UPDATE SET
         name_ar = excluded.name_ar,
         stage_id = excluded.stage_id,
         sort_order = excluded.sort_order,
         enabled = excluded.enabled`,
    )
    .bind(input.id, input.nameAr, input.stageId, input.sortOrder, input.enabled ? 1 : 0)
    .run();
}

/** تعطيل/تفعيل صفّ مرجعي — بدل الحذف الذي قد يكسر مراجع قائمة. */
export async function setReferenceEnabled(
  db: D1Database,
  table: 'education_stages' | 'grades' | 'tracks' | 'subjects' | 'tool_categories',
  id: string,
  enabled: boolean,
): Promise<boolean> {
  // اسم الجدول من اتحاد ثابت في النوع، لا من إدخال المستخدم.
  const result = await db
    .prepare(`UPDATE ${table} SET enabled = ?1 WHERE id = ?2`)
    .bind(enabled ? 1 : 0, id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
