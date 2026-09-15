/**
 * الجدول الأسبوعي — طبقة البيانات.
 *
 * كل استعلام مقيَّد بـ user_id المستخرَج من التوكن، فلا يستطيع مستخدم قراءة
 * أو تعديل أو حذف حصّة تخصّ غيره حتى لو خمّن المعرّف (حماية من IDOR).
 */
import type {
  FollowupStatus,
  PreparationStatus,
  ScheduleItem,
  ScheduleItemStatus,
  ScheduleSettings,
} from '@shared/types';
import { nowIso } from './repo';

const DEFAULT_SETTINGS: ScheduleSettings = {
  periodsPerDay: 7,
  startTime: '07:00',
  periodMinutes: 45,
};

interface ItemRow {
  id: string;
  day: number;
  period: number;
  start_time: string | null;
  end_time: string | null;
  subject_id: string | null;
  subject_label: string | null;
  grade_id: string | null;
  class_name: string | null;
  lesson_title: string | null;
  notes: string | null;
  homework: string | null;
  status: string;
  preparation_status: string;
  followup_status: string;
}

const ITEM_COLUMNS = `id, day, period, start_time, end_time, subject_id, subject_label,
  grade_id, class_name, lesson_title, notes, homework, status, preparation_status,
  followup_status`;

function asStatus(value: string): ScheduleItemStatus {
  return value === 'done' || value === 'cancelled' ? value : 'planned';
}

function asPreparation(value: string): PreparationStatus {
  return value === 'in_progress' || value === 'ready' ? value : 'not_started';
}

function asFollowup(value: string): FollowupStatus {
  return value === 'pending' || value === 'done' ? value : 'none';
}

function toItem(row: ItemRow): ScheduleItem {
  return {
    id: row.id,
    day: row.day,
    period: row.period,
    startTime: row.start_time,
    endTime: row.end_time,
    subjectId: row.subject_id,
    subjectLabel: row.subject_label,
    gradeId: row.grade_id,
    className: row.class_name,
    lessonTitle: row.lesson_title,
    notes: row.notes,
    homework: row.homework,
    status: asStatus(row.status),
    preparationStatus: asPreparation(row.preparation_status),
    followupStatus: asFollowup(row.followup_status),
  };
}

/** يحسب وقت بداية ونهاية الحصة من إعدادات الجدول. */
export function periodTimes(
  settings: ScheduleSettings,
  period: number,
): { startTime: string; endTime: string } {
  const [hours, minutes] = settings.startTime.split(':').map((part) => Number(part) || 0);
  const base = hours * 60 + minutes;
  const start = base + (period - 1) * settings.periodMinutes;
  const end = start + settings.periodMinutes;
  const format = (total: number) => {
    const wrapped = ((total % 1440) + 1440) % 1440;
    const hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
    const mm = String(wrapped % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };
  return { startTime: format(start), endTime: format(end) };
}

export async function getSettings(db: D1Database, userId: string): Promise<ScheduleSettings> {
  const row = await db
    .prepare(
      `SELECT periods_per_day, start_time, period_minutes
       FROM weekly_schedules WHERE user_id = ?1`,
    )
    .bind(userId)
    .first<{ periods_per_day: number; start_time: string; period_minutes: number }>();

  if (!row) return DEFAULT_SETTINGS;
  return {
    periodsPerDay: row.periods_per_day,
    startTime: row.start_time,
    periodMinutes: row.period_minutes,
  };
}

export async function saveSettings(
  db: D1Database,
  userId: string,
  settings: ScheduleSettings,
): Promise<ScheduleSettings> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO weekly_schedules
         (user_id, periods_per_day, start_time, period_minutes, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)
       ON CONFLICT (user_id) DO UPDATE SET
         periods_per_day = excluded.periods_per_day,
         start_time = excluded.start_time,
         period_minutes = excluded.period_minutes,
         updated_at = excluded.updated_at`,
    )
    .bind(userId, settings.periodsPerDay, settings.startTime, settings.periodMinutes, now)
    .run();
  return settings;
}

export async function listItems(db: D1Database, userId: string): Promise<ScheduleItem[]> {
  const result = await db
    .prepare(
      `SELECT ${ITEM_COLUMNS} FROM schedule_items
       WHERE user_id = ?1 ORDER BY day ASC, period ASC`,
    )
    .bind(userId)
    .all<ItemRow>();
  return (result.results ?? []).map(toItem);
}

export interface ItemValues {
  day: number;
  period: number;
  startTime: string | null;
  endTime: string | null;
  subjectId: string | null;
  subjectLabel: string | null;
  gradeId: string | null;
  className: string | null;
  lessonTitle: string | null;
  notes: string | null;
  homework: string | null;
  status: ScheduleItemStatus;
  preparationStatus: PreparationStatus;
  followupStatus: FollowupStatus;
}

export async function createItem(
  db: D1Database,
  userId: string,
  values: ItemValues,
): Promise<ScheduleItem> {
  const id = crypto.randomUUID();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO schedule_items
         (id, user_id, day, period, start_time, end_time, subject_id, subject_label,
          grade_id, class_name, lesson_title, notes, homework, status,
          preparation_status, followup_status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?17)`,
    )
    .bind(
      id,
      userId,
      values.day,
      values.period,
      values.startTime,
      values.endTime,
      values.subjectId,
      values.subjectLabel,
      values.gradeId,
      values.className,
      values.lessonTitle,
      values.notes,
      values.homework,
      values.status,
      values.preparationStatus,
      values.followupStatus,
      now,
    )
    .run();

  const row = await db
    .prepare(`SELECT ${ITEM_COLUMNS} FROM schedule_items WHERE id = ?1 AND user_id = ?2`)
    .bind(id, userId)
    .first<ItemRow>();
  if (!row) throw new Error('تعذّر إنشاء الحصة.');
  return toItem(row);
}

/** يعدّل حصّة — يُرجع null إن لم تكن للمستخدم نفسه. */
export async function updateItem(
  db: D1Database,
  userId: string,
  itemId: string,
  values: ItemValues,
): Promise<ScheduleItem | null> {
  const result = await db
    .prepare(
      `UPDATE schedule_items SET
         day = ?1, period = ?2, start_time = ?3, end_time = ?4, subject_id = ?5,
         subject_label = ?6, grade_id = ?7, class_name = ?8, lesson_title = ?9,
         notes = ?10, homework = ?11, status = ?12, preparation_status = ?13,
         followup_status = ?14, updated_at = ?15
       WHERE id = ?16 AND user_id = ?17`,
    )
    .bind(
      values.day,
      values.period,
      values.startTime,
      values.endTime,
      values.subjectId,
      values.subjectLabel,
      values.gradeId,
      values.className,
      values.lessonTitle,
      values.notes,
      values.homework,
      values.status,
      values.preparationStatus,
      values.followupStatus,
      nowIso(),
      itemId,
      userId,
    )
    .run();

  if (!result.meta.changes) return null;

  const row = await db
    .prepare(`SELECT ${ITEM_COLUMNS} FROM schedule_items WHERE id = ?1 AND user_id = ?2`)
    .bind(itemId, userId)
    .first<ItemRow>();
  return row ? toItem(row) : null;
}

export async function deleteItem(
  db: D1Database,
  userId: string,
  itemId: string,
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM schedule_items WHERE id = ?1 AND user_id = ?2`)
    .bind(itemId, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

/** يمسح يوماً كاملاً أو الأسبوع كله (day = null). */
export async function clearSchedule(
  db: D1Database,
  userId: string,
  day: number | null,
): Promise<number> {
  const statement =
    day === null
      ? db.prepare(`DELETE FROM schedule_items WHERE user_id = ?1`).bind(userId)
      : db.prepare(`DELETE FROM schedule_items WHERE user_id = ?1 AND day = ?2`).bind(userId, day);
  const result = await statement.run();
  return result.meta.changes ?? 0;
}

/** عدد حصص المستخدم — لحماية الحساب من إنشاء صفوف بلا حدّ. */
export async function countItems(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS total FROM schedule_items WHERE user_id = ?1`)
    .bind(userId)
    .first<{ total: number }>();
  return row?.total ?? 0;
}
