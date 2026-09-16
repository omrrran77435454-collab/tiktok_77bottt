/**
 * منطق أداة "جدولي الأسبوعي" للطالب.
 *
 * أبسط من جدول المعلم عن قصد: الطالب يريد ورقة يعلّقها، لا نظام إدارة.
 * النتيجة مستند A4 قابل للطباعة والتصدير.
 */
import { ALL_DAY_NAMES } from '@/lib/education';
import type { ToolIssue } from '../types';

export interface StudentPeriod {
  day: string;
  period: string;
  subject: string;
  teacher: string;
  room: string;
}

export interface StudentScheduleData {
  studentName: string;
  grade: string;
  className: string;
  periods: StudentPeriod[];
}

export const DAY_OPTIONS = ALL_DAY_NAMES.slice(0, 5);

export function createEmptyPeriod(): StudentPeriod {
  return { day: DAY_OPTIONS[0], period: '', subject: '', teacher: '', room: '' };
}

export interface DayGroup {
  day: string;
  periods: StudentPeriod[];
}

/** يجمع الحصص حسب اليوم مع ترتيبها برقم الحصة. */
export function groupByDay(data: StudentScheduleData): DayGroup[] {
  const filled = data.periods.filter((entry) => entry.subject.trim() !== '');

  return DAY_OPTIONS.map((day) => ({
    day,
    periods: filled
      .filter((entry) => entry.day === day)
      .sort((a, b) => (Number(a.period) || 0) - (Number(b.period) || 0)),
  })).filter((group) => group.periods.length > 0);
}

/** عدد الحصص لكل مادة — يوضّح للطالب أين يقضي أسبوعه. */
export function subjectLoad(data: StudentScheduleData): { subject: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of data.periods) {
    const subject = entry.subject.trim();
    if (!subject) continue;
    counts.set(subject, (counts.get(subject) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);
}

export function validateStudentSchedule(data: StudentScheduleData): ToolIssue[] {
  const issues: ToolIssue[] = [];
  const filled = data.periods.filter((entry) => entry.subject.trim() !== '');

  if (!filled.length) {
    issues.push({ field: 'periods', message: 'أضف حصة واحدة على الأقل.' });
  }

  filled.forEach((entry, index) => {
    const period = Number(entry.period);
    if (entry.period !== '' && (!Number.isFinite(period) || period < 1 || period > 12)) {
      issues.push({
        field: `periods.${index}.period`,
        message: `رقم الحصة لـ«${entry.subject}» يجب أن يكون بين 1 و 12.`,
      });
    }
  });

  // تعارض: نفس اليوم ونفس رقم الحصة مرّتين.
  const seen = new Map<string, string>();
  for (const entry of filled) {
    if (!entry.period) continue;
    const key = `${entry.day}#${entry.period}`;
    const existing = seen.get(key);
    if (existing && existing !== entry.subject) {
      issues.push({
        field: 'periods',
        message: `تعارض في ${entry.day} الحصة ${entry.period}: «${existing}» و«${entry.subject}».`,
      });
    }
    seen.set(key, entry.subject);
  }

  return issues;
}
