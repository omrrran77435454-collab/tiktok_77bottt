/**
 * منطق أداة "منظّم الواجبات".
 *
 * المبدأ: الترتيب حسب الأقرب تسليماً — لا حسب ترتيب الإدخال. والأداة تُبرز
 * المتأخّر والمستحق اليوم بوضوح، لأنهما ما يحتاج قراراً الآن.
 */
import type { ToolIssue } from '../types';

export type HomeworkStatus = 'todo' | 'in-progress' | 'done';

export const STATUS_LABELS: Record<HomeworkStatus, string> = {
  todo: 'لم يبدأ',
  'in-progress': 'جارٍ',
  done: 'تم',
};

export interface HomeworkItem {
  title: string;
  subject: string;
  /** تاريخ التسليم بصيغة YYYY-MM-DD. */
  dueDate: string;
  status: HomeworkStatus;
  /** الدقائق التقديرية لإنجازه. */
  minutes: string;
}

export interface HomeworkData {
  studentName: string;
  grade: string;
  /** تاريخ اليوم المرجعي للحسابات. */
  today: string;
  items: HomeworkItem[];
}

export function createEmptyItem(): HomeworkItem {
  return { title: '', subject: '', dueDate: '', status: 'todo', minutes: '' };
}

export interface HomeworkEntry extends HomeworkItem {
  /** الأيام المتبقّية: سالب = متأخّر، 0 = اليوم. */
  daysLeft: number | null;
  bucket: 'overdue' | 'today' | 'soon' | 'later' | 'done';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** فرق الأيام بين تاريخين بصيغة YYYY-MM-DD (بلا تأثير المنطقة الزمنية). */
export function daysBetween(from: string, to: string): number | null {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / DAY_MS);
}

function bucketOf(status: HomeworkStatus, daysLeft: number | null): HomeworkEntry['bucket'] {
  if (status === 'done') return 'done';
  if (daysLeft === null) return 'later';
  if (daysLeft < 0) return 'overdue';
  if (daysLeft === 0) return 'today';
  if (daysLeft <= 3) return 'soon';
  return 'later';
}

const BUCKET_ORDER: Record<HomeworkEntry['bucket'], number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  later: 3,
  done: 4,
};

export interface HomeworkResult {
  entries: HomeworkEntry[];
  overdue: HomeworkEntry[];
  today: HomeworkEntry[];
  upcoming: HomeworkEntry[];
  done: HomeworkEntry[];
  totalMinutes: number;
}

export function organizeHomework(data: HomeworkData): HomeworkResult {
  const named = data.items.filter((item) => item.title.trim() !== '');

  const entries: HomeworkEntry[] = named
    .map((item) => {
      const daysLeft = item.dueDate ? daysBetween(data.today, item.dueDate) : null;
      return { ...item, daysLeft, bucket: bucketOf(item.status, daysLeft) };
    })
    .sort((a, b) => {
      const order = BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket];
      if (order !== 0) return order;
      // داخل نفس المجموعة: الأقرب تسليماً أولاً.
      const left = a.daysLeft ?? Number.MAX_SAFE_INTEGER;
      const right = b.daysLeft ?? Number.MAX_SAFE_INTEGER;
      return left - right;
    });

  const pending = entries.filter((entry) => entry.status !== 'done');

  return {
    entries,
    overdue: entries.filter((entry) => entry.bucket === 'overdue'),
    today: entries.filter((entry) => entry.bucket === 'today'),
    upcoming: entries.filter((entry) => entry.bucket === 'soon' || entry.bucket === 'later'),
    done: entries.filter((entry) => entry.bucket === 'done'),
    totalMinutes: pending.reduce((sum, entry) => sum + (Number(entry.minutes) || 0), 0),
  };
}

/** وصف عربي للمهلة المتبقّية. */
export function dueLabel(entry: HomeworkEntry): string {
  if (entry.daysLeft === null) return 'بلا موعد';
  if (entry.daysLeft < 0) return `متأخّر ${Math.abs(entry.daysLeft)} يوم`;
  if (entry.daysLeft === 0) return 'اليوم';
  if (entry.daysLeft === 1) return 'غداً';
  return `بعد ${entry.daysLeft} أيام`;
}

export function validateHomework(data: HomeworkData): ToolIssue[] {
  const issues: ToolIssue[] = [];

  const named = data.items.filter((item) => item.title.trim() !== '');
  if (!named.length) {
    issues.push({ field: 'items', message: 'أضف واجباً واحداً على الأقل.' });
  }

  named.forEach((item, index) => {
    if (item.dueDate && daysBetween(data.today, item.dueDate) === null) {
      issues.push({
        field: `items.${index}.dueDate`,
        message: `تاريخ تسليم «${item.title}» غير صحيح.`,
      });
    }
    const minutes = Number(item.minutes);
    if (item.minutes !== '' && (!Number.isFinite(minutes) || minutes < 0)) {
      issues.push({
        field: `items.${index}.minutes`,
        message: `الوقت المقدّر لـ«${item.title}» يجب أن يكون رقماً موجباً.`,
      });
    }
  });

  return issues;
}
