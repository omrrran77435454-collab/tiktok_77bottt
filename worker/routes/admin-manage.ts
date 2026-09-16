import { z } from 'zod';
import type { RouteContext } from '../lib/router';
import { errors, json, readJson } from '../lib/http';
import { requireAdmin } from '../lib/gate';
import { listAllTools, loadCatalog } from '../lib/catalog-repo';
import {
  listAudit,
  recordAudit,
  setReferenceEnabled,
  setToolOrder,
  setToolStatus,
  upsertCategory,
  upsertSubject,
  upsertTool,
} from '../lib/admin-repo';

/**
 * نقاط إدارة المحتوى.
 *
 * كل معالج هنا يبدأ بـ requireAdmin الذي يقرأ الدور من قاعدة البيانات
 * اعتماداً على التوكن — لا من أي حقل يرسله العميل. هذا هو الحاجز الحقيقي
 * ضد تصعيد الصلاحيات؛ إخفاء الزر في الواجهة ليس حماية.
 */

const ID = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/, 'المعرّف يجب أن يكون أحرفاً لاتينية صغيرة وأرقاماً وشرطات.');

const NAME = z.string().trim().min(1).max(120);
const DESCRIPTION = z.string().trim().max(400);
const AUDIENCE = z.enum(['teacher', 'student', 'both']);
const STATUS = z.enum(['draft', 'published', 'disabled']);

const toolSchema = z.object({
  id: ID.optional(),
  slug: ID,
  nameAr: NAME,
  descriptionAr: DESCRIPTION,
  icon: z.string().trim().min(1).max(40),
  categoryId: ID.nullable(),
  audience: AUDIENCE,
  status: STATUS,
  stages: z.array(ID).max(20),
  grades: z.array(ID).max(40),
  subjects: z.array(ID).max(40),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20),
  isFeatured: z.boolean(),
  isNew: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

/** GET /api/admin/catalog — كل الأدوات (بما فيها المسودّات) والبيانات المرجعية. */
export async function handleAdminCatalog({ request, env }: RouteContext): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const [catalog, tools, audit] = await Promise.all([
    loadCatalog(env.DB),
    listAllTools(env.DB),
    listAudit(env.DB, 40),
  ]);
  return json({ ...catalog, tools, audit });
}

/** POST /api/admin/tools — إنشاء أداة أو تعديلها. */
export async function handleAdminSaveTool({ request, env }: RouteContext): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const parsed = toolSchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('بيانات الأداة غير صحيحة.');

  const { id, ...input } = parsed.data;
  const toolId = await upsertTool(env.DB, id ?? null, input);

  await recordAudit(env.DB, auth.user.id, id ? 'update' : 'create', 'tool', toolId, {
    slug: input.slug,
    status: input.status,
    audience: input.audience,
  });

  return json({ id: toolId });
}

const statusSchema = z.object({ id: ID, status: STATUS });

/** POST /api/admin/tools/status — نشر أو إلغاء نشر أو تعطيل أداة. */
export async function handleAdminToolStatus({ request, env }: RouteContext): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const parsed = statusSchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('طلب تغيير الحالة غير صحيح.');

  const changed = await setToolStatus(env.DB, parsed.data.id, parsed.data.status);
  if (!changed) return errors.notFound();

  const action =
    parsed.data.status === 'published'
      ? 'publish'
      : parsed.data.status === 'disabled'
        ? 'disable'
        : 'unpublish';
  await recordAudit(env.DB, auth.user.id, action, 'tool', parsed.data.id, {
    status: parsed.data.status,
  });

  return json({ ok: true });
}

const orderSchema = z.object({
  items: z.array(z.object({ id: ID, sortOrder: z.number().int().min(0).max(9999) })).max(100),
});

/** POST /api/admin/tools/order — إعادة ترتيب الأدوات. */
export async function handleAdminToolOrder({ request, env }: RouteContext): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const parsed = orderSchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('طلب الترتيب غير صحيح.');

  for (const item of parsed.data.items) {
    await setToolOrder(env.DB, item.id, item.sortOrder);
  }
  await recordAudit(env.DB, auth.user.id, 'reorder', 'tool', 'batch', {
    count: parsed.data.items.length,
  });

  return json({ ok: true });
}

const categorySchema = z.object({
  id: ID,
  nameAr: NAME,
  descriptionAr: DESCRIPTION,
  icon: z.string().trim().min(1).max(40),
  audience: AUDIENCE,
  sortOrder: z.number().int().min(0).max(9999),
  enabled: z.boolean(),
});

/** POST /api/admin/categories — إضافة قسم أو تعديله. */
export async function handleAdminSaveCategory({ request, env }: RouteContext): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const parsed = categorySchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('بيانات القسم غير صحيحة.');

  await upsertCategory(env.DB, parsed.data);
  await recordAudit(env.DB, auth.user.id, 'update', 'category', parsed.data.id, {
    name: parsed.data.nameAr,
    enabled: parsed.data.enabled,
  });

  return json({ ok: true });
}

const subjectSchema = z.object({
  id: ID,
  nameAr: NAME,
  stageId: ID.nullable(),
  sortOrder: z.number().int().min(0).max(9999),
  enabled: z.boolean(),
});

/** POST /api/admin/subjects — إضافة مادة أو تعديلها. */
export async function handleAdminSaveSubject({ request, env }: RouteContext): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const parsed = subjectSchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('بيانات المادة غير صحيحة.');

  await upsertSubject(env.DB, parsed.data);
  await recordAudit(env.DB, auth.user.id, 'update', 'subject', parsed.data.id, {
    name: parsed.data.nameAr,
    enabled: parsed.data.enabled,
  });

  return json({ ok: true });
}

const referenceSchema = z.object({
  entity: z.enum(['stage', 'grade', 'track', 'subject', 'category']),
  id: ID,
  enabled: z.boolean(),
});

const TABLES = {
  stage: 'education_stages',
  grade: 'grades',
  track: 'tracks',
  subject: 'subjects',
  category: 'tool_categories',
} as const;

/**
 * POST /api/admin/reference/toggle — تفعيل أو تعطيل عنصر مرجعي.
 * لا حذف: التعطيل يحقّق الغرض بلا كسر أي مرجع قائم، وقابل للتراجع.
 */
export async function handleAdminToggleReference({ request, env }: RouteContext): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const parsed = referenceSchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('طلب التعديل غير صحيح.');

  const changed = await setReferenceEnabled(
    env.DB,
    TABLES[parsed.data.entity],
    parsed.data.id,
    parsed.data.enabled,
  );
  if (!changed) return errors.notFound();

  await recordAudit(
    env.DB,
    auth.user.id,
    parsed.data.enabled ? 'publish' : 'disable',
    parsed.data.entity,
    parsed.data.id,
    { enabled: parsed.data.enabled },
  );

  return json({ ok: true });
}
