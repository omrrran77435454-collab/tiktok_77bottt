import { z } from 'zod';
import type { RouteContext } from '../lib/router';
import { errors, json, readJson } from '../lib/http';
import { authenticate } from '../lib/gate';
import { existingIds, getProfile, loadCatalog, saveProfile } from '../lib/catalog-repo';

/** أقصى عدد مواد يختارها المستخدم — حاجز ضد إرسال قوائم ضخمة. */
const MAX_SUBJECTS = 20;

const ID = z
  .string()
  .trim()
  .min(1)
  .max(40)
  // معرّفات مرجعية فقط: أحرف لاتينية صغيرة وأرقام وشرطات.
  .regex(/^[a-z0-9-]+$/);

const profileSchema = z.object({
  role: z.enum(['teacher', 'student']),
  stageId: ID.nullable(),
  gradeId: ID.nullable(),
  trackId: ID.nullable(),
  subjects: z.array(ID).max(MAX_SUBJECTS),
  onboardingCompleted: z.boolean().optional(),
});

/**
 * GET /api/catalog — البيانات المرجعية للتهيئة والفلترة.
 * تتطلّب تسجيل دخول فقط: المستخدم يحتاجها قبل اجتياز بوابة تيليجرام.
 */
export async function handleCatalog({ request, env }: RouteContext): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  return json(await loadCatalog(env.DB));
}

/** GET /api/me/profile — ملف المستخدم الحالي. */
export async function handleGetProfile({ request, env }: RouteContext): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  return json({ profile: await getProfile(env.DB, auth.user.id) });
}

/**
 * POST /api/me/profile — حفظ ملف التهيئة.
 *
 * الأمان:
 *  - الحقول محصورة بمخطّط صارم (لا Mass assignment): لا يستطيع العميل
 *    إرسال role='admin' أو أي عمود آخر — حتى الاسم لا يُقرأ من هنا.
 *  - كل معرّف يُتحقَّق من وجوده في الجدول المرجعي قبل الحفظ.
 *  - المسار يعمل على المستخدم المستخرَج من التوكن فقط، لا من جسم الطلب،
 *    فلا يمكن تعديل ملف مستخدم آخر (IDOR).
 */
export async function handleSaveProfile({ request, env }: RouteContext): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  const parsed = profileSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return errors.badRequest('بيانات الملف غير صحيحة. أعد اختيار المرحلة والصف والمواد.');
  }

  const input = parsed.data;

  // التحقّق من أن المعرّفات موجودة فعلاً — لا نثق بأي معرّف من العميل.
  if (input.stageId) {
    const stages = await existingIds(env.DB, 'education_stages', [input.stageId]);
    if (!stages.has(input.stageId)) return errors.badRequest('المرحلة المختارة غير معروفة.');
  }
  if (input.gradeId) {
    const grades = await existingIds(env.DB, 'grades', [input.gradeId]);
    if (!grades.has(input.gradeId)) return errors.badRequest('الصف المختار غير معروف.');
  }
  if (input.trackId) {
    const tracks = await existingIds(env.DB, 'tracks', [input.trackId]);
    if (!tracks.has(input.trackId)) return errors.badRequest('المسار المختار غير معروف.');
  }

  let subjects: string[] = [];
  if (input.subjects.length) {
    const unique = [...new Set(input.subjects)];
    const known = await existingIds(env.DB, 'subjects', unique);
    subjects = unique.filter((id) => known.has(id));
    if (subjects.length !== unique.length) {
      return errors.badRequest('إحدى المواد المختارة غير معروفة.');
    }
  }

  const profile = await saveProfile(env.DB, auth.user.id, {
    role: input.role,
    stageId: input.stageId,
    gradeId: input.gradeId,
    trackId: input.trackId,
    subjects,
    onboardingCompleted: input.onboardingCompleted ?? true,
  });

  return json({ profile });
}
