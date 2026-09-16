/**
 * منطق أداة "خطة ما قبل الاختبار".
 *
 * المبدأ: الأيام المتبقّية مورد محدود. نوزّع الدروس على الأيام بحيث يبقى
 * اليوم الأخير للمراجعة الشاملة لا لدرس جديد — وهذا أهم قرار في الخطة.
 */
import type { ToolIssue } from '../types';

export type Confidence = 'weak' | 'medium' | 'strong';

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  weak: 'ضعيف',
  medium: 'متوسط',
  strong: 'جيد',
};

/** الدرس الأضعف يُراجع أولاً وأكثر. */
const CONFIDENCE_WEIGHT: Record<Confidence, number> = { weak: 3, medium: 2, strong: 1 };

export interface ExamTopic {
  title: string;
  confidence: Confidence;
  notes: string;
}

export interface ExamPrepData {
  studentName: string;
  subject: string;
  examDate: string;
  today: string;
  minutesPerDay: string;
  topics: ExamTopic[];
}

export function createEmptyTopic(): ExamTopic {
  return { title: '', confidence: 'medium', notes: '' };
}

export interface DayPlan {
  /** رقم اليوم في الخطة (1 = أول يوم). */
  index: number;
  date: string;
  topics: ExamTopic[];
  isReviewDay: boolean;
  minutes: number;
}

export interface ExamPrepResult {
  daysLeft: number;
  /** أيام المذاكرة الفعلية (اليوم الأخير للمراجعة). */
  studyDays: number;
  minutesPerDay: number;
  days: DayPlan[];
  weakTopics: ExamTopic[];
  totalTopics: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(base)) return '';
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysUntil(from: string, to: string): number | null {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / DAY_MS);
}

/**
 * يوزّع الدروس على الأيام المتاحة.
 * الأضعف أولاً، واليوم الأخير مراجعة شاملة بلا درس جديد.
 */
export function buildExamPlan(data: ExamPrepData): ExamPrepResult {
  const daysLeft = daysUntil(data.today, data.examDate) ?? 0;
  const minutesPerDay = Math.max(0, Number(data.minutesPerDay) || 0);

  const named = data.topics.filter((topic) => topic.title.trim() !== '');
  const ordered = named
    .slice()
    .sort((a, b) => CONFIDENCE_WEIGHT[b.confidence] - CONFIDENCE_WEIGHT[a.confidence]);

  // يوم واحد على الأقل للمذاكرة، واليوم الأخير للمراجعة عندما يتّسع الوقت.
  const usableDays = Math.max(0, daysLeft);
  const studyDays = usableDays > 1 ? usableDays - 1 : usableDays;

  const days: DayPlan[] = [];
  if (usableDays > 0 && ordered.length > 0) {
    const perDay = Math.ceil(ordered.length / Math.max(1, studyDays));

    for (let index = 0; index < studyDays; index += 1) {
      const slice = ordered.slice(index * perDay, (index + 1) * perDay);
      if (!slice.length) break;
      days.push({
        index: index + 1,
        date: addDays(data.today, index),
        topics: slice,
        isReviewDay: false,
        minutes: minutesPerDay,
      });
    }

    if (usableDays > 1) {
      days.push({
        index: days.length + 1,
        date: addDays(data.today, usableDays - 1),
        topics: ordered.filter((topic) => topic.confidence === 'weak'),
        isReviewDay: true,
        minutes: minutesPerDay,
      });
    }
  }

  return {
    daysLeft,
    studyDays,
    minutesPerDay,
    days,
    weakTopics: ordered.filter((topic) => topic.confidence === 'weak'),
    totalTopics: ordered.length,
  };
}

export function validateExamPrep(data: ExamPrepData): ToolIssue[] {
  const issues: ToolIssue[] = [];

  const daysLeft = daysUntil(data.today, data.examDate);
  if (daysLeft === null) {
    issues.push({ field: 'examDate', message: 'أدخل تاريخ الاختبار وتاريخ اليوم بشكل صحيح.' });
  } else if (daysLeft < 0) {
    issues.push({ field: 'examDate', message: 'تاريخ الاختبار قبل تاريخ اليوم. صحّح التاريخ.' });
  } else if (daysLeft === 0) {
    issues.push({
      field: 'examDate',
      message: 'الاختبار اليوم — الخطة تحتاج يوماً واحداً على الأقل.',
    });
  }

  const minutes = Number(data.minutesPerDay);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    issues.push({ field: 'minutesPerDay', message: 'حدّد كم دقيقة تستطيع المراجعة يومياً.' });
  } else if (minutes > 720) {
    issues.push({ field: 'minutesPerDay', message: 'الوقت اليومي غير واقعي — 720 دقيقة أو أقل.' });
  }

  if (!data.topics.some((topic) => topic.title.trim() !== '')) {
    issues.push({ field: 'topics', message: 'أضف درساً واحداً على الأقل.' });
  }

  return issues;
}
