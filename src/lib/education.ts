/**
 * مساعدات عرض البنية التعليمية.
 *
 * البيانات نفسها تأتي من الخادم (/api/catalog) لأن الإدمن يديرها — لا تُكرَّر
 * هنا كقوائم ثابتة. هذا الملف يحوّلها إلى ما تحتاجه الواجهة فقط.
 */
import type { CatalogResponse, GradeRef, SubjectRef } from '@shared/types';

export const EMPTY_CATALOG: CatalogResponse = {
  stages: [],
  grades: [],
  tracks: [],
  subjects: [],
  categories: [],
};

export function gradesForStage(catalog: CatalogResponse, stageId: string | null): GradeRef[] {
  if (!stageId) return [];
  return catalog.grades.filter((grade) => grade.stageId === stageId);
}

/** هل الصف المختار يحتاج اختيار مسار؟ */
export function gradeRequiresTrack(catalog: CatalogResponse, gradeId: string | null): boolean {
  if (!gradeId) return false;
  return catalog.grades.find((grade) => grade.id === gradeId)?.requiresTrack ?? false;
}

/** مواد المرحلة: العامة (stageId = null) + الخاصة بها. */
export function subjectsForStage(catalog: CatalogResponse, stageId: string | null): SubjectRef[] {
  return catalog.subjects.filter(
    (subject) => subject.stageId === null || subject.stageId === stageId,
  );
}

export function stageName(catalog: CatalogResponse, stageId: string | null): string {
  return catalog.stages.find((stage) => stage.id === stageId)?.nameAr ?? '';
}

export function gradeName(catalog: CatalogResponse, gradeId: string | null): string {
  return catalog.grades.find((grade) => grade.id === gradeId)?.nameAr ?? '';
}

export function subjectName(catalog: CatalogResponse, subjectId: string | null): string {
  return catalog.subjects.find((subject) => subject.id === subjectId)?.nameAr ?? '';
}

/* ------------------------------ أيام الأسبوع ------------------------------ */

export interface WeekDay {
  /** 0 = الأحد … 6 = السبت (يطابق Date.getDay). */
  index: number;
  nameAr: string;
}

/**
 * أيام الدراسة المعروضة. الأحد–الخميس هي أيام الدوام، والبنية تقبل التوسّع
 * لاحقاً بإضافة يومين بلا تغيير في المخطّط لأن اليوم مخزَّن كرقم.
 */
export const WEEK_DAYS: WeekDay[] = [
  { index: 0, nameAr: 'الأحد' },
  { index: 1, nameAr: 'الاثنين' },
  { index: 2, nameAr: 'الثلاثاء' },
  { index: 3, nameAr: 'الأربعاء' },
  { index: 4, nameAr: 'الخميس' },
];

export const ALL_DAY_NAMES = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export function dayName(index: number): string {
  return ALL_DAY_NAMES[index] ?? '';
}

/** اليوم الدراسي الحالي، أو أول يوم دراسي إن كان اليوم عطلة. */
export function todayScheduleDay(now = new Date()): number {
  const today = now.getDay();
  return WEEK_DAYS.some((day) => day.index === today) ? today : WEEK_DAYS[0].index;
}

/** هل اليوم الحالي ضمن أيام الدراسة؟ */
export function isSchoolDay(now = new Date()): boolean {
  return WEEK_DAYS.some((day) => day.index === now.getDay());
}

/* -------------------------------- التحيّة -------------------------------- */

/** تحية حسب الوقت — تُحسب من ساعة الجهاز. */
export function greeting(name: string | null | undefined, now = new Date()): string {
  const hour = now.getHours();
  const period = hour >= 4 && hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const firstName = (name ?? '').trim().split(/\s+/)[0];
  return firstName ? `${period} ${firstName}` : 'مرحباً بك';
}

/** تاريخ اليوم بالعربية (ميلادي، بأرقام لاتينية لوضوح القراءة). */
export function todayLabel(now = new Date()): string {
  return new Intl.DateTimeFormat('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(now);
}

/** "HH:MM" إلى دقائق منذ منتصف الليل — للمقارنة والترتيب. */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}
