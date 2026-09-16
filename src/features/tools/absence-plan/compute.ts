/**
 * منطق أداة "خطة تعويض طالب غائب".
 * الترتيب والقرارات مبنية على ما يُدخله المعلم فقط (الأولوية + الحالة + الوقت المتاح).
 */

export type ItemType = 'lesson' | 'homework' | 'assessment' | 'activity';
export type ItemStatus = 'missed' | 'done' | 'not-needed';
export type ItemPriority = 'high' | 'medium' | 'low';

export const TYPE_LABELS: Record<ItemType, string> = {
  lesson: 'درس / مهارة',
  homework: 'واجب',
  assessment: 'تقويم',
  activity: 'نشاط',
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  missed: 'فاته',
  done: 'تم تعويضه',
  'not-needed': 'لا يحتاج تعويضاً',
};

export const PRIORITY_LABELS: Record<ItemPriority, string> = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

export interface AbsenceItem {
  title: string;
  type: ItemType;
  skill: string;
  status: ItemStatus;
  priority: ItemPriority;
  /** الدقائق التقديرية اللازمة للتعويض. */
  minutes: string;
}

export interface AbsencePlanData {
  studentName: string;
  subject: string;
  grade: string;
  absenceDays: string;
  availableMinutes: string;
  followUpDate: string;
  supportNeeded: string;
  items: AbsenceItem[];
}

const PRIORITY_WEIGHT: Record<ItemPriority, number> = { high: 0, medium: 1, low: 2 };

function toMinutes(value: string): number {
  const normalized = String(value ?? '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .trim();
  if (normalized === '') return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export interface AbsencePlan {
  /** ما فاته فعلاً (كل ما حالته "فاته"). */
  missed: AbsenceItem[];
  /** يبدأ الآن: ما يتّسع له الوقت المتاح حسب الأولوية. */
  startNow: AbsenceItem[];
  /** يؤجَّل: ما فاض عن الوقت المتاح. */
  postpone: AbsenceItem[];
  /** لا يحتاج تعويضاً كاملاً. */
  notNeeded: AbsenceItem[];
  /** ما تم تعويضه مسبقاً. */
  done: AbsenceItem[];
  /** أول مهمة يبدأ بها. */
  firstTask: AbsenceItem | null;
  /** مجموع الدقائق المطلوبة لما فاته. */
  requiredMinutes: number;
  /** الدقائق المخصّصة لِما يبدأ الآن. */
  plannedMinutes: number;
  /** الدقائق الباقية دون تغطية. */
  remainingMinutes: number;
}

/**
 * يبني الخطة: يرتّب ما فات الطالب حسب الأولوية، ثم يوزّعه على
 * "يبدأ الآن" حتى ينفد الوقت المتاح، والباقي "يؤجَّل".
 * إذا لم يُدخل المعلم وقتاً متاحاً نعتبر كل ما فاته يبدأ الآن.
 */
export function buildPlan(data: AbsencePlanData): AbsencePlan {
  const missed = data.items
    .filter((item) => item.status === 'missed')
    .slice()
    .sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);

  const available = toMinutes(data.availableMinutes);
  const startNow: AbsenceItem[] = [];
  const postpone: AbsenceItem[] = [];

  let used = 0;
  for (const item of missed) {
    const minutes = toMinutes(item.minutes);
    if (available <= 0) {
      startNow.push(item);
      used += minutes;
      continue;
    }
    if (used + minutes <= available || (startNow.length === 0 && minutes > available)) {
      // العنصر الأول يبدأ دائماً حتى لو تجاوز الوقت المتاح، وإلا بقيت الخطة فارغة.
      startNow.push(item);
      used += minutes;
    } else {
      postpone.push(item);
    }
  }

  const requiredMinutes = missed.reduce((sum, item) => sum + toMinutes(item.minutes), 0);

  return {
    missed,
    startNow,
    postpone,
    notNeeded: data.items.filter((item) => item.status === 'not-needed'),
    done: data.items.filter((item) => item.status === 'done'),
    firstTask: startNow[0] ?? null,
    requiredMinutes,
    plannedMinutes: used,
    remainingMinutes: Math.max(requiredMinutes - used, 0),
  };
}

export function createEmptyItem(): AbsenceItem {
  return { title: '', type: 'lesson', skill: '', status: 'missed', priority: 'high', minutes: '' };
}

/* ------------------------------ التحقّق من المدخلات ------------------------------ */

export interface FieldIssue {
  field: string;
  message: string;
}

function parseNumber(value: string): number | null {
  const normalized = String(value ?? '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateAbsencePlan(data: AbsencePlanData): FieldIssue[] {
  const issues: FieldIssue[] = [];

  const days = parseNumber(data.absenceDays);
  if (data.absenceDays.trim() !== '' && (days === null || days < 0)) {
    issues.push({ field: 'absenceDays', message: 'عدد أيام الغياب لا يمكن أن يكون سالباً.' });
  }
  if (days !== null && days > 365) {
    issues.push({ field: 'absenceDays', message: 'عدد أيام الغياب يبدو غير منطقي (أكثر من سنة).' });
  }

  const available = parseNumber(data.availableMinutes);
  if (data.availableMinutes.trim() !== '' && (available === null || available < 0)) {
    issues.push({
      field: 'availableMinutes',
      message: 'الوقت المتاح لا يمكن أن يكون سالباً.',
    });
  }

  // موعد التحقّق يجب ألا يسبق بداية الغياب المُقدَّرة.
  if (data.followUpDate && days !== null && days >= 0) {
    const followUp = Date.parse(data.followUpDate);
    if (!Number.isNaN(followUp)) {
      const absenceStart = Date.now() - days * 24 * 60 * 60 * 1000;
      if (followUp < absenceStart) {
        issues.push({
          field: 'followUpDate',
          message: 'موعد التحقق يسبق بداية فترة الغياب — راجع التاريخ.',
        });
      }
    }
  }

  data.items.forEach((item, index) => {
    const raw = item.minutes.trim();
    if (raw === '') return;
    const minutes = parseNumber(raw);
    if (minutes === null || minutes < 0) {
      issues.push({
        field: `items.${index}.minutes`,
        message: 'الوقت التقديري يجب أن يكون رقماً موجباً.',
      });
    }
  });

  return issues;
}
