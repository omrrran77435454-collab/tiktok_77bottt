import { z } from 'zod';
import type { RouteContext } from '../lib/router';
import { errors, json, readJson } from '../lib/http';
import { evaluateGate } from '../lib/gate';
import {
  clearSchedule,
  countItems,
  createItem,
  deleteItem,
  getSettings,
  listItems,
  periodTimes,
  saveSettings,
  updateItem,
  type ItemValues,
} from '../lib/schedule-repo';
import type { ScheduleResponse } from '@shared/types';

/** حدّ أعلى لعدد الحصص لكل مستخدم — حاجز ضد الإغراق. */
const MAX_ITEMS = 300;

const TEXT = z.string().trim().max(200);
const LONG_TEXT = z.string().trim().max(1000);

const settingsSchema = z.object({
  periodsPerDay: z.number().int().min(1).max(12),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'صيغة الوقت يجب أن تكون HH:MM'),
  periodMinutes: z.number().int().min(15).max(120),
});

const itemSchema = z.object({
  // 0=الأحد … 6=السبت
  day: z.number().int().min(0).max(6),
  period: z.number().int().min(1).max(12),
  subjectId: z.string().trim().max(40).nullable().optional(),
  subjectLabel: TEXT.nullable().optional(),
  gradeId: z.string().trim().max(40).nullable().optional(),
  className: TEXT.nullable().optional(),
  lessonTitle: TEXT.nullable().optional(),
  notes: LONG_TEXT.nullable().optional(),
  homework: LONG_TEXT.nullable().optional(),
  status: z.enum(['planned', 'done', 'cancelled']).optional(),
  preparationStatus: z.enum(['not_started', 'in_progress', 'ready']).optional(),
  followupStatus: z.enum(['none', 'pending', 'done']).optional(),
});

/** يحوّل المدخلات إلى قيم جاهزة للتخزين، مع حساب أوقات الحصة. */
function toValues(
  input: z.infer<typeof itemSchema>,
  settings: { periodsPerDay: number; startTime: string; periodMinutes: number },
): ItemValues {
  const times = periodTimes(settings, input.period);
  const clean = (value: string | null | undefined) => (value ? value : null);
  return {
    day: input.day,
    period: input.period,
    startTime: times.startTime,
    endTime: times.endTime,
    subjectId: clean(input.subjectId),
    subjectLabel: clean(input.subjectLabel),
    gradeId: clean(input.gradeId),
    className: clean(input.className),
    lessonTitle: clean(input.lessonTitle),
    notes: clean(input.notes),
    homework: clean(input.homework),
    status: input.status ?? 'planned',
    preparationStatus: input.preparationStatus ?? 'not_started',
    followupStatus: input.followupStatus ?? 'none',
  };
}

/**
 * معرّف الحصة يأتي في جسم الطلب لا في المسار.
 * الموجّه هنا يطابق المسارات تطابقاً تامّاً (أبسط وأخفّ من مطابقة الأنماط)،
 * والمعرّف على أي حال يُتحقَّق منه مقروناً بـ user_id في الاستعلام نفسه.
 */
const itemIdSchema = z.object({ id: z.string().trim().min(1).max(64) });

/** GET /api/schedule — الإعدادات وكل الحصص. */
export async function handleGetSchedule({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;
  if (!gate.canUseTools) return errors.forbidden();

  const [settings, items] = await Promise.all([
    getSettings(env.DB, gate.user.id),
    listItems(env.DB, gate.user.id),
  ]);
  const body: ScheduleResponse = { settings, items };
  return json(body);
}

/** POST /api/schedule/settings — عدد الحصص ووقت البداية ومدة الحصة. */
export async function handleSaveScheduleSettings({
  request,
  env,
}: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;
  if (!gate.canUseTools) return errors.forbidden();

  const parsed = settingsSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return errors.badRequest('إعدادات الجدول غير صحيحة. تأكد من عدد الحصص ووقت البداية.');
  }

  const settings = await saveSettings(env.DB, gate.user.id, parsed.data);
  return json({ settings });
}

/** POST /api/schedule/items — إضافة حصة. */
export async function handleCreateScheduleItem({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;
  if (!gate.canUseTools) return errors.forbidden();

  const parsed = itemSchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('بيانات الحصة غير صحيحة.');

  const total = await countItems(env.DB, gate.user.id);
  if (total >= MAX_ITEMS) {
    return errors.badRequest('وصلت إلى الحد الأقصى لعدد الحصص. احذف بعض الحصص ثم أعد المحاولة.');
  }

  const settings = await getSettings(env.DB, gate.user.id);
  const item = await createItem(env.DB, gate.user.id, toValues(parsed.data, settings));
  return json({ item });
}

/** POST /api/schedule/items/update — تعديل حصة (المعرّف في الجسم). */
export async function handleUpdateScheduleItem({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;
  if (!gate.canUseTools) return errors.forbidden();

  const body = await readJson(request);
  const identified = itemIdSchema.safeParse(body);
  const parsed = itemSchema.safeParse(body);
  if (!identified.success || !parsed.success) return errors.badRequest('بيانات الحصة غير صحيحة.');

  const settings = await getSettings(env.DB, gate.user.id);
  const item = await updateItem(
    env.DB,
    gate.user.id,
    identified.data.id,
    toValues(parsed.data, settings),
  );
  // نفس الرد للحصة غير الموجودة وللحصة التي تخصّ غيره: لا نكشف وجودها.
  if (!item) return errors.notFound();
  return json({ item });
}

/** POST /api/schedule/items/delete — حذف حصة. */
export async function handleDeleteScheduleItem({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;
  if (!gate.canUseTools) return errors.forbidden();

  const parsed = itemIdSchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('طلب الحذف غير صحيح.');

  const removed = await deleteItem(env.DB, gate.user.id, parsed.data.id);
  if (!removed) return errors.notFound();
  return json({ ok: true });
}

const clearSchema = z.object({ day: z.number().int().min(0).max(6).nullable() });

/** POST /api/schedule/clear — مسح يوم أو الأسبوع كله. */
export async function handleClearSchedule({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;
  if (!gate.canUseTools) return errors.forbidden();

  const parsed = clearSchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('طلب المسح غير صحيح.');

  const removed = await clearSchedule(env.DB, gate.user.id, parsed.data.day);
  return json({ removed });
}
