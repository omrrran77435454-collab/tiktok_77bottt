/**
 * منطق أداة "خطة متابعة الطلاب بعد الاختبار".
 * دوال خالصة بلا أي أثر جانبي حتى تكون قابلة للاختبار بالكامل.
 */

export type StudentCategory = 'excellent' | 'good' | 'needs-support' | 'unknown';

export interface Thresholds {
  /** نسبة مئوية: ‎>=‎ ممتاز. */
  excellent: number;
  /** نسبة مئوية: ‎>=‎ جيد. */
  good: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { excellent: 85, good: 60 };

export const CATEGORY_LABELS: Record<StudentCategory, string> = {
  excellent: 'ممتاز',
  good: 'جيد',
  'needs-support': 'يحتاج إلى دعم',
  unknown: 'غير محدّد',
};

export interface StudentRow {
  name: string;
  /** الدرجة كنص لأن الحقل قد يكون فارغاً أو عشرياً. */
  score: string;
  weakSkill: string;
  /** 'auto' يعني احسبه من الدرجة. */
  category: StudentCategory | 'auto';
  action: string;
  reviewDate: string;
  notes: string;
}

export interface FollowupData {
  subject: string;
  grade: string;
  testTitle: string;
  date: string;
  maxScore: string;
  thresholds: Thresholds;
  students: StudentRow[];
}

/** يحوّل نصاً إلى رقم موجب أو null (يقبل الفاصلة العربية والعشرية). */
export function parseScore(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value)
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[،٫]/g, '.')
    .trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/** النسبة المئوية للدرجة، أو null إن تعذّر الحساب. */
export function scorePercent(score: string, maxScore: string): number | null {
  const value = parseScore(score);
  const max = parseScore(maxScore);
  if (value === null || max === null || max <= 0) return null;
  // درجة أعلى من النهاية العظمى تُحسب 100% بدل إنتاج نسبة غير منطقية.
  return Math.min((value / max) * 100, 100);
}

/** تصنيف الطالب حسب الحدود المُدخلة. */
export function classify(
  percent: number | null,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): StudentCategory {
  if (percent === null) return 'unknown';
  if (percent >= thresholds.excellent) return 'excellent';
  if (percent >= thresholds.good) return 'good';
  return 'needs-support';
}

/** التصنيف النهائي: يدوي إن اختاره المعلم، وإلا محسوب تلقائياً. */
export function resolveCategory(student: StudentRow, data: FollowupData): StudentCategory {
  if (student.category !== 'auto') return student.category;
  return classify(scorePercent(student.score, data.maxScore), data.thresholds);
}

/** إجراء مقترح حسب التصنيف — اقتراح عام قابل للتعديل، لا يخترع أسباب التعثّر. */
export function suggestedAction(category: StudentCategory): string {
  switch (category) {
    case 'excellent':
      return 'تكليف إثرائي وتعزيز إيجابي';
    case 'good':
      return 'تدريب قصير على النقاط الناقصة';
    case 'needs-support':
      return 'إعادة شرح فردي + تدريب موجّه';
    default:
      return '';
  }
}

export interface FollowupSummary {
  total: number;
  counted: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  byCategory: { category: StudentCategory; count: number; percent: number }[];
  needsSupport: number;
}

/** ملخّص النتائج: المتوسط والأعلى والأدنى وتوزيع المستويات. */
export function summarize(data: FollowupData): FollowupSummary {
  const percents: number[] = [];
  const counts: Record<StudentCategory, number> = {
    excellent: 0,
    good: 0,
    'needs-support': 0,
    unknown: 0,
  };

  for (const student of data.students) {
    const percent = scorePercent(student.score, data.maxScore);
    if (percent !== null) percents.push(percent);
    counts[resolveCategory(student, data)] += 1;
  }

  const total = data.students.length;
  const counted = percents.length;
  const average = counted > 0 ? percents.reduce((sum, value) => sum + value, 0) / counted : null;

  const order: StudentCategory[] = ['excellent', 'good', 'needs-support', 'unknown'];
  const byCategory = order
    .filter((category) => counts[category] > 0)
    .map((category) => ({
      category,
      count: counts[category],
      percent: total > 0 ? (counts[category] / total) * 100 : 0,
    }));

  return {
    total,
    counted,
    average,
    highest: counted > 0 ? Math.max(...percents) : null,
    lowest: counted > 0 ? Math.min(...percents) : null,
    byCategory,
    needsSupport: counts['needs-support'],
  };
}

export function createEmptyStudent(): StudentRow {
  return {
    name: '',
    score: '',
    weakSkill: '',
    category: 'auto',
    action: '',
    reviewDate: '',
    notes: '',
  };
}
