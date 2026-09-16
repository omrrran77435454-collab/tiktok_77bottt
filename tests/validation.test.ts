import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  createEmptyStudent,
  validateFollowup,
  type FollowupData,
  type StudentRow,
} from '@/features/tools/student-followup/compute';
import {
  DEFAULT_DECISION_THRESHOLDS,
  validateErrorMap,
  type ErrorMapData,
  type QuestionRow,
} from '@/features/tools/error-map/compute';
import {
  createEmptyItem,
  validateAbsencePlan,
  type AbsenceItem,
  type AbsencePlanData,
} from '@/features/tools/absence-plan/compute';

function followup(
  students: Partial<StudentRow>[],
  overrides: Partial<FollowupData> = {},
): FollowupData {
  return {
    subject: 'اللغة العربية',
    grade: 'الخامس',
    testTitle: 'اختبار',
    date: '2026-09-14',
    maxScore: '10',
    thresholds: { ...DEFAULT_THRESHOLDS },
    students: students.map((student) => ({ ...createEmptyStudent(), ...student })),
    ...overrides,
  };
}

describe('validateFollowup — درجة الطالب مقابل الدرجة الكلية', () => {
  it('يرفض درجة أعلى من الدرجة الكلية برسالة واضحة', () => {
    const issues = validateFollowup(followup([{ score: '15' }], { maxScore: '10' }));
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('students.0.score');
    expect(issues[0].message).toContain('لا يمكن أن تتجاوز الدرجة الكلية');
    expect(issues[0].message).toContain('10');
  });

  it('يقبل درجة مساوية للدرجة الكلية', () => {
    expect(validateFollowup(followup([{ score: '10' }], { maxScore: '10' }))).toEqual([]);
  });

  it('يقبل الدرجات العشرية والعربية', () => {
    expect(validateFollowup(followup([{ score: '9.5' }, { score: '٧' }]))).toEqual([]);
  });

  it('يرفض الدرجة السالبة', () => {
    const issues = validateFollowup(followup([{ score: '-3' }]));
    expect(issues[0].message).toContain('رقماً موجباً');
  });

  it('يتجاهل الحقول الفارغة (إدخال غير مكتمل ليس خطأً)', () => {
    expect(validateFollowup(followup([{ score: '' }, { score: '   ' }]))).toEqual([]);
  });

  it('يرفض درجة كلية صفراً أو غير رقمية', () => {
    expect(validateFollowup(followup([], { maxScore: '0' }))[0].field).toBe('maxScore');
    expect(validateFollowup(followup([], { maxScore: 'عشرة' }))[0].field).toBe('maxScore');
  });

  it('يرفض تداخل حدود التصنيف', () => {
    const issues = validateFollowup(
      followup([], { thresholds: { excellent: 60, good: 85 } }),
    );
    expect(issues.some((issue) => issue.field === 'thresholds')).toBe(true);
    expect(issues.find((issue) => issue.field === 'thresholds')?.message).toContain('تتداخل');
  });

  it('يرفض حدوداً متساوية (لا فجوة ولا تداخل منطقي)', () => {
    const issues = validateFollowup(followup([], { thresholds: { excellent: 70, good: 70 } }));
    expect(issues.some((issue) => issue.field === 'thresholds')).toBe(true);
  });

  it('يرفض حدوداً خارج النطاق 0..100', () => {
    const issues = validateFollowup(followup([], { thresholds: { excellent: 130, good: -5 } }));
    expect(issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(['thresholds.excellent', 'thresholds.good']),
    );
  });

  it('يبلّغ عن كل طالب مخالف على حدة', () => {
    const issues = validateFollowup(
      followup([{ score: '15' }, { score: '8' }, { score: '99' }], { maxScore: '10' }),
    );
    expect(issues).toHaveLength(2);
    expect(issues.map((issue) => issue.field)).toEqual(['students.0.score', 'students.2.score']);
  });
});

function errorMap(
  questions: Partial<QuestionRow>[],
  overrides: Partial<ErrorMapData> = {},
): ErrorMapData {
  return {
    subject: 'اللغة العربية',
    grade: 'الخامس',
    testTitle: 'اختبار',
    totalStudents: '20',
    thresholds: { ...DEFAULT_DECISION_THRESHOLDS },
    questions: questions.map((question, index) => ({
      label: `السؤال ${index + 1}`,
      skill: '',
      wrongCount: '',
      ...question,
    })),
    ...overrides,
  };
}

describe('validateErrorMap — عدد المخطئين مقابل عدد الطلاب', () => {
  it('يرفض عدداً أكبر من عدد طلاب الصف', () => {
    const issues = validateErrorMap(errorMap([{ wrongCount: '30' }], { totalStudents: '20' }));
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('questions.0.wrongCount');
    expect(issues[0].message).toContain('لا يمكن أن يتجاوز عدد طلاب الصف');
    expect(issues[0].message).toContain('20');
  });

  it('يقبل عدداً مساوياً لعدد الطلاب', () => {
    expect(validateErrorMap(errorMap([{ wrongCount: '20' }], { totalStudents: '20' }))).toEqual([]);
  });

  it('يرفض عدداً سالباً', () => {
    expect(validateErrorMap(errorMap([{ wrongCount: '-1' }]))[0].message).toContain('موجباً');
  });

  it('يرفض عدد طلاب صفراً', () => {
    expect(validateErrorMap(errorMap([], { totalStudents: '0' }))[0].field).toBe('totalStudents');
  });

  it('يرفض تداخل حدود القرار', () => {
    const issues = validateErrorMap(
      errorMap([], { thresholds: { reteach: 25, practice: 50 } }),
    );
    expect(issues.some((issue) => issue.field === 'thresholds')).toBe(true);
  });

  it('لا يشتكي من مدخلات صحيحة', () => {
    expect(
      validateErrorMap(errorMap([{ wrongCount: '5' }, { wrongCount: '12' }])),
    ).toEqual([]);
  });
});

function absence(
  items: Partial<AbsenceItem>[],
  overrides: Partial<AbsencePlanData> = {},
): AbsencePlanData {
  return {
    studentName: 'سلمان',
    subject: 'اللغة العربية',
    grade: 'الخامس',
    absenceDays: '3',
    availableMinutes: '60',
    followUpDate: '',
    supportNeeded: '',
    items: items.map((item) => ({ ...createEmptyItem(), ...item })),
    ...overrides,
  };
}

describe('validateAbsencePlan', () => {
  it('يرفض أيام غياب سالبة', () => {
    const issues = validateAbsencePlan(absence([], { absenceDays: '-2' }));
    expect(issues[0].field).toBe('absenceDays');
    expect(issues[0].message).toContain('سالباً');
  });

  it('يرفض وقتاً متاحاً سالباً', () => {
    expect(validateAbsencePlan(absence([], { availableMinutes: '-5' }))[0].field).toBe(
      'availableMinutes',
    );
  });

  it('ينبّه عندما يسبق موعد التحقق بداية الغياب', () => {
    const longAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const issues = validateAbsencePlan(
      absence([], { absenceDays: '2', followUpDate: longAgo }),
    );
    expect(issues.some((issue) => issue.field === 'followUpDate')).toBe(true);
  });

  it('يقبل موعد تحقّق في المستقبل', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(validateAbsencePlan(absence([], { absenceDays: '3', followUpDate: future }))).toEqual([]);
  });

  it('يرفض وقتاً تقديرياً سالباً في العناصر', () => {
    const issues = validateAbsencePlan(absence([{ minutes: '-10' }]));
    expect(issues[0].field).toBe('items.0.minutes');
  });

  it('ينبّه على عدد أيام غير منطقي', () => {
    expect(validateAbsencePlan(absence([], { absenceDays: '400' }))[0].message).toContain(
      'غير منطقي',
    );
  });

  it('لا يشتكي من خطة صحيحة', () => {
    expect(validateAbsencePlan(absence([{ minutes: '30' }, { minutes: '' }]))).toEqual([]);
  });
});
