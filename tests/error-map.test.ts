import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DECISION_THRESHOLDS,
  aggregateSkills,
  decide,
  errorRate,
  nextLessonDecisions,
  summarizeErrorMap,
  type ErrorMapData,
  type QuestionRow,
} from '@/features/tools/error-map/compute';

function makeData(questions: Partial<QuestionRow>[], totalStudents = '20'): ErrorMapData {
  return {
    subject: 'اللغة العربية',
    grade: 'الخامس',
    testTitle: 'اختبار',
    totalStudents,
    thresholds: { ...DEFAULT_DECISION_THRESHOLDS },
    questions: questions.map((question, index) => ({
      label: `السؤال ${index + 1}`,
      skill: '',
      wrongCount: '',
      ...question,
    })),
  };
}

describe('errorRate', () => {
  it('يحسب نسبة الخطأ', () => {
    expect(errorRate('10', '20')).toBe(50);
    expect(errorRate('0', '20')).toBe(0);
  });

  it('يقبل الأرقام العربية', () => {
    expect(errorRate('١٠', '٢٠')).toBe(50);
  });

  it('يُرجع null عند نقص البيانات', () => {
    expect(errorRate('', '20')).toBeNull();
    expect(errorRate('5', '')).toBeNull();
    expect(errorRate('5', '0')).toBeNull();
    expect(errorRate('abc', '20')).toBeNull();
  });

  it('يحدّ النسبة عند 100% إذا زاد عدد المخطئين عن عدد الطلاب', () => {
    expect(errorRate('30', '20')).toBe(100);
  });
});

describe('decide', () => {
  it('يطبّق الحدود الافتراضية', () => {
    expect(decide(60)).toBe('reteach');
    expect(decide(50)).toBe('reteach');
    expect(decide(30)).toBe('practice');
    expect(decide(25)).toBe('practice');
    expect(decide(24.9)).toBe('ok');
    expect(decide(null)).toBe('unknown');
  });

  it('يحترم الحدود المخصّصة', () => {
    expect(decide(40, { reteach: 35, practice: 10 })).toBe('reteach');
    expect(decide(20, { reteach: 35, practice: 10 })).toBe('practice');
    expect(decide(5, { reteach: 35, practice: 10 })).toBe('ok');
  });
});

describe('aggregateSkills', () => {
  it('يجمّع المهارات ويرتّبها تنازلياً حسب متوسط الخطأ', () => {
    const data = makeData([
      { skill: 'الاستنتاج', wrongCount: '16' },
      { skill: 'الاستنتاج', wrongCount: '12' },
      { skill: 'الإملاء', wrongCount: '2' },
    ]);
    const skills = aggregateSkills(data);

    expect(skills).toHaveLength(2);
    expect(skills[0].skill).toBe('الاستنتاج');
    expect(skills[0].questions).toBe(2);
    expect(skills[0].averageRate).toBe(70);
    expect(skills[0].decision).toBe('reteach');
    expect(skills[1].skill).toBe('الإملاء');
    expect(skills[1].decision).toBe('ok');
  });

  it('يتجاهل الأسئلة بلا مهارة أو بلا بيانات', () => {
    const data = makeData([
      { skill: '', wrongCount: '10' },
      { skill: '   ', wrongCount: '10' },
      { skill: 'التلخيص', wrongCount: '' },
    ]);
    expect(aggregateSkills(data)).toEqual([]);
  });
});

describe('summarizeErrorMap', () => {
  it('يعدّ القرارات بشكل صحيح', () => {
    const data = makeData([
      { skill: 'أ', wrongCount: '18' },
      { skill: 'ب', wrongCount: '6' },
      { skill: 'ج', wrongCount: '1' },
      { skill: 'د', wrongCount: '' },
    ]);
    const summary = summarizeErrorMap(data);

    expect(summary.questions).toBe(4);
    expect(summary.analyzed).toBe(3);
    expect(summary.reteach).toBe(1);
    expect(summary.practice).toBe(1);
    expect(summary.ok).toBe(1);
  });

  it('يتعامل مع مدخلات فارغة', () => {
    const summary = summarizeErrorMap(makeData([]));
    expect(summary.analyzed).toBe(0);
    expect(summary.averageRate).toBeNull();
    expect(summary.topSkills).toEqual([]);
  });
});

describe('nextLessonDecisions', () => {
  it('يطلب بيانات عند غياب التحليل', () => {
    const decisions = nextLessonDecisions(makeData([{ skill: 'أ', wrongCount: '' }]));
    expect(decisions[0]).toContain('أدخل');
  });

  it('يذكر مهارات إعادة الشرح والتدريب القصير', () => {
    const decisions = nextLessonDecisions(
      makeData([
        { skill: 'الاستنتاج', wrongCount: '18' },
        { skill: 'الإملاء', wrongCount: '6' },
      ]),
    ).join(' ');
    expect(decisions).toContain('إعادة شرح');
    expect(decisions).toContain('الاستنتاج');
    expect(decisions).toContain('تدريب قصير');
    expect(decisions).toContain('الإملاء');
  });

  it('يخبر بأن المستوى مناسب عند عدم وجود تعثّر', () => {
    const decisions = nextLessonDecisions(makeData([{ skill: 'أ', wrongCount: '1' }])).join(' ');
    expect(decisions).toContain('مستوى الصف مناسب');
  });
});
