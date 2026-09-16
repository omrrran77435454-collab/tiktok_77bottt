/**
 * منطق أداة "خريطة أخطاء الصف".
 * القرارات هنا مبنية على نسبة الخطأ فقط — لا نخترع أسباباً للتعثّر.
 */

export type QuestionDecision = 'reteach' | 'practice' | 'ok' | 'unknown';

export const DECISION_LABELS: Record<QuestionDecision, string> = {
  reteach: 'يحتاج إعادة شرح',
  practice: 'يحتاج تدريباً قصيراً',
  ok: 'مستوى مناسب',
  unknown: 'بيانات ناقصة',
};

export interface DecisionThresholds {
  /** نسبة الخطأ التي تستوجب إعادة الشرح (‎>=‎). */
  reteach: number;
  /** نسبة الخطأ التي تستوجب تدريباً قصيراً (‎>=‎). */
  practice: number;
}

export const DEFAULT_DECISION_THRESHOLDS: DecisionThresholds = { reteach: 50, practice: 25 };

export interface QuestionRow {
  label: string;
  skill: string;
  /** عدد الطلاب الذين أخطأوا (نص لأن الحقل قد يكون فارغاً). */
  wrongCount: string;
}

export interface ErrorMapData {
  subject: string;
  grade: string;
  testTitle: string;
  totalStudents: string;
  thresholds: DecisionThresholds;
  questions: QuestionRow[];
}

function toCount(value: string): number | null {
  const normalized = String(value ?? '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/** نسبة الخطأ لسؤال واحد، أو null إذا لم تكتمل البيانات. */
export function errorRate(wrongCount: string, totalStudents: string): number | null {
  const wrong = toCount(wrongCount);
  const total = toCount(totalStudents);
  if (wrong === null || total === null || total <= 0) return null;
  return Math.min((wrong / total) * 100, 100);
}

/** قرار السؤال بناءً على نسبة الخطأ والحدود المُدخلة. */
export function decide(
  rate: number | null,
  thresholds: DecisionThresholds = DEFAULT_DECISION_THRESHOLDS,
): QuestionDecision {
  if (rate === null) return 'unknown';
  if (rate >= thresholds.reteach) return 'reteach';
  if (rate >= thresholds.practice) return 'practice';
  return 'ok';
}

export interface SkillStat {
  skill: string;
  questions: number;
  averageRate: number;
  decision: QuestionDecision;
}

/**
 * يجمّع الأسئلة حسب المهارة ويحسب متوسط نسبة الخطأ لكل مهارة،
 * مرتّبة تنازلياً (الأكثر تعثّراً أولاً).
 */
export function aggregateSkills(data: ErrorMapData): SkillStat[] {
  const groups = new Map<string, number[]>();

  for (const question of data.questions) {
    const skill = question.skill.trim();
    if (skill === '') continue;
    const rate = errorRate(question.wrongCount, data.totalStudents);
    if (rate === null) continue;
    const bucket = groups.get(skill) ?? [];
    bucket.push(rate);
    groups.set(skill, bucket);
  }

  return [...groups.entries()]
    .map(([skill, rates]) => {
      const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      return {
        skill,
        questions: rates.length,
        averageRate,
        decision: decide(averageRate, data.thresholds),
      };
    })
    .sort((a, b) => b.averageRate - a.averageRate);
}

export interface ErrorMapSummary {
  questions: number;
  analyzed: number;
  averageRate: number | null;
  reteach: number;
  practice: number;
  ok: number;
  topSkills: SkillStat[];
}

export function summarizeErrorMap(data: ErrorMapData): ErrorMapSummary {
  const rates: number[] = [];
  let reteach = 0;
  let practice = 0;
  let ok = 0;

  for (const question of data.questions) {
    const rate = errorRate(question.wrongCount, data.totalStudents);
    if (rate === null) continue;
    rates.push(rate);
    const decision = decide(rate, data.thresholds);
    if (decision === 'reteach') reteach += 1;
    else if (decision === 'practice') practice += 1;
    else ok += 1;
  }

  const skills = aggregateSkills(data);

  return {
    questions: data.questions.length,
    analyzed: rates.length,
    averageRate: rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : null,
    reteach,
    practice,
    ok,
    topSkills: skills.filter((skill) => skill.decision !== 'ok').slice(0, 5),
  };
}

/** قرار الحصة القادمة — مبني حصراً على المهارات الأعلى تعثّراً. */
export function nextLessonDecisions(data: ErrorMapData): string[] {
  const summary = summarizeErrorMap(data);
  if (summary.analyzed === 0) {
    return ['أدخل عدد الطلاب وعدد من أخطأ في كل سؤال ليظهر قرار الحصة القادمة.'];
  }

  const decisions: string[] = [];
  const reteachSkills = summary.topSkills.filter((skill) => skill.decision === 'reteach');
  const practiceSkills = summary.topSkills.filter((skill) => skill.decision === 'practice');

  if (reteachSkills.length > 0) {
    decisions.push(`إعادة شرح: ${reteachSkills.map((skill) => skill.skill).join('، ')}.`);
  }
  if (practiceSkills.length > 0) {
    decisions.push(`تدريب قصير على: ${practiceSkills.map((skill) => skill.skill).join('، ')}.`);
  }
  if (reteachSkills.length === 0 && practiceSkills.length === 0) {
    decisions.push('مستوى الصف مناسب في جميع المهارات المُدخلة — يمكن الانتقال للدرس التالي.');
  }
  if (summary.questions > summary.analyzed) {
    decisions.push(`${summary.questions - summary.analyzed} من الأسئلة بلا بيانات كافية للتحليل.`);
  }
  return decisions;
}

export function createEmptyQuestion(index: number): QuestionRow {
  return { label: `السؤال ${index}`, skill: '', wrongCount: '' };
}

/* ------------------------------ التحقّق من المدخلات ------------------------------ */

export interface FieldIssue {
  field: string;
  message: string;
}

function parseCount(value: string): number | null {
  const normalized = String(value ?? '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * يمنع الحالات المستحيلة منطقياً بدل قصّ النسبة عند 100% وإخفاء الخطأ.
 */
export function validateErrorMap(data: ErrorMapData): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const total = parseCount(data.totalStudents);

  if (data.totalStudents.trim() !== '' && (total === null || total <= 0)) {
    issues.push({
      field: 'totalStudents',
      message: 'عدد طلاب الصف يجب أن يكون رقماً أكبر من صفر.',
    });
  }

  const { reteach, practice } = data.thresholds;
  if (!Number.isFinite(reteach) || reteach < 0 || reteach > 100) {
    issues.push({ field: 'thresholds.reteach', message: 'حدّ إعادة الشرح يجب أن يكون بين 0 و100.' });
  }
  if (!Number.isFinite(practice) || practice < 0 || practice > 100) {
    issues.push({
      field: 'thresholds.practice',
      message: 'حدّ التدريب القصير يجب أن يكون بين 0 و100.',
    });
  }
  if (Number.isFinite(reteach) && Number.isFinite(practice) && practice >= reteach) {
    issues.push({
      field: 'thresholds',
      message: 'حدّ التدريب القصير يجب أن يكون أقل من حدّ إعادة الشرح حتى لا تتداخل القرارات.',
    });
  }

  data.questions.forEach((question, index) => {
    const raw = question.wrongCount.trim();
    if (raw === '') return;

    const wrong = parseCount(raw);
    if (wrong === null || wrong < 0) {
      issues.push({
        field: `questions.${index}.wrongCount`,
        message: 'عدد من أخطأ يجب أن يكون رقماً موجباً.',
      });
      return;
    }
    if (total !== null && total > 0 && wrong > total) {
      issues.push({
        field: `questions.${index}.wrongCount`,
        message: `عدد الطلاب الذين أخطأوا لا يمكن أن يتجاوز عدد طلاب الصف (${data.totalStudents}).`,
      });
    }
  });

  return issues;
}
