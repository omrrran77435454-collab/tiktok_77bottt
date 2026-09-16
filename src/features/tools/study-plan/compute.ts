/**
 * منطق أداة "خطة المذاكرة".
 *
 * المبدأ: الطالب يحدّد وقته المتاح فعلاً وأولوية كل مادة، والأداة توزّع
 * الدقائق توزيعاً عادلاً مرجَّحاً بالأولوية — لا تَعِد بما لا يتّسع له الوقت.
 */
import type { ToolIssue } from '../types';

export type SubjectPriority = 'high' | 'medium' | 'low';

export const PRIORITY_LABELS: Record<SubjectPriority, string> = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

/** وزن كل أولوية في توزيع الوقت. */
const PRIORITY_WEIGHT: Record<SubjectPriority, number> = { high: 3, medium: 2, low: 1 };

export interface StudySubject {
  name: string;
  priority: SubjectPriority;
  /** عدد الدروس أو الوحدات المتبقّية. */
  topics: string;
  notes: string;
}

export interface StudyPlanData {
  studentName: string;
  grade: string;
  /** عدد أيام الخطة. */
  days: string;
  /** الدقائق المتاحة للمذاكرة في اليوم. */
  minutesPerDay: string;
  /** أطول جلسة مذاكرة متواصلة يتحمّلها الطالب. */
  sessionMinutes: string;
  subjects: StudySubject[];
}

export function createEmptySubject(): StudySubject {
  return { name: '', priority: 'medium', topics: '', notes: '' };
}

export interface SubjectAllocation {
  name: string;
  priority: SubjectPriority;
  topics: number;
  /** إجمالي الدقائق المخصّصة للمادة عبر كل أيام الخطة. */
  totalMinutes: number;
  /** الدقائق اليومية التقريبية. */
  dailyMinutes: number;
  /** عدد الجلسات التقريبي. */
  sessions: number;
  notes: string;
}

export interface StudyPlanResult {
  days: number;
  minutesPerDay: number;
  sessionMinutes: number;
  totalMinutes: number;
  allocations: SubjectAllocation[];
  /** دقائق لم تُوزَّع (بسبب التقريب). */
  unallocatedMinutes: number;
}

function toNumber(value: string): number {
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * يوزّع الوقت المتاح على المواد حسب الأولوية.
 * التوزيع مرجَّح: مادة عالية الأولوية تأخذ ثلاثة أضعاف منخفضة الأولوية.
 */
export function buildStudyPlan(data: StudyPlanData): StudyPlanResult {
  const days = toNumber(data.days);
  const minutesPerDay = toNumber(data.minutesPerDay);
  const sessionMinutes = toNumber(data.sessionMinutes) || 30;
  const totalMinutes = days * minutesPerDay;

  const named = data.subjects.filter((subject) => subject.name.trim() !== '');
  const totalWeight = named.reduce(
    (sum, subject) => sum + PRIORITY_WEIGHT[subject.priority],
    0,
  );

  if (!named.length || totalWeight === 0 || totalMinutes === 0) {
    return {
      days,
      minutesPerDay,
      sessionMinutes,
      totalMinutes,
      allocations: [],
      unallocatedMinutes: totalMinutes,
    };
  }

  const allocations: SubjectAllocation[] = named.map((subject) => {
    const share = PRIORITY_WEIGHT[subject.priority] / totalWeight;
    // نقرّب لأقرب 5 دقائق: رقم قابل للتطبيق في الواقع بدل كسور دقيقة.
    const minutes = Math.round((totalMinutes * share) / 5) * 5;
    return {
      name: subject.name.trim(),
      priority: subject.priority,
      topics: toNumber(subject.topics),
      totalMinutes: minutes,
      dailyMinutes: days > 0 ? Math.round(minutes / days) : 0,
      sessions: Math.max(1, Math.round(minutes / sessionMinutes)),
      notes: subject.notes.trim(),
    };
  });

  const allocated = allocations.reduce((sum, item) => sum + item.totalMinutes, 0);

  return {
    days,
    minutesPerDay,
    sessionMinutes,
    totalMinutes,
    allocations: allocations.sort(
      (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority],
    ),
    unallocatedMinutes: totalMinutes - allocated,
  };
}

export function validateStudyPlan(data: StudyPlanData): ToolIssue[] {
  const issues: ToolIssue[] = [];

  const days = toNumber(data.days);
  if (!days) issues.push({ field: 'days', message: 'حدّد عدد أيام الخطة (يوم واحد على الأقل).' });
  if (days > 60) issues.push({ field: 'days', message: 'عدد الأيام كبير جداً — اجعل الخطة 60 يوماً أو أقل.' });

  const minutesPerDay = toNumber(data.minutesPerDay);
  if (!minutesPerDay) {
    issues.push({ field: 'minutesPerDay', message: 'حدّد كم دقيقة تستطيع المذاكرة يومياً.' });
  }
  if (minutesPerDay > 720) {
    issues.push({
      field: 'minutesPerDay',
      message: 'وقت المذاكرة اليومي غير واقعي — اجعله 720 دقيقة أو أقل.',
    });
  }

  const sessionMinutes = toNumber(data.sessionMinutes);
  if (sessionMinutes && minutesPerDay && sessionMinutes > minutesPerDay) {
    issues.push({
      field: 'sessionMinutes',
      message: 'مدة الجلسة أطول من وقتك اليومي كله. قلّلها.',
    });
  }

  const named = data.subjects.filter((subject) => subject.name.trim() !== '');
  if (!named.length) {
    issues.push({ field: 'subjects', message: 'أضف مادة واحدة على الأقل.' });
  }

  return issues;
}
