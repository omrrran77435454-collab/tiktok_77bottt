import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  classify,
  createEmptyStudent,
  parseScore,
  resolveCategory,
  scorePercent,
  suggestedAction,
  summarize,
  type FollowupData,
  type StudentRow,
} from '@/features/tools/student-followup/compute';

function makeData(students: Partial<StudentRow>[], maxScore = '10'): FollowupData {
  return {
    subject: 'اللغة العربية',
    grade: 'الخامس',
    testTitle: 'اختبار',
    date: '2026-09-14',
    maxScore,
    thresholds: { ...DEFAULT_THRESHOLDS },
    students: students.map((student) => ({ ...createEmptyStudent(), ...student })),
  };
}

describe('parseScore', () => {
  it('يقرأ الأرقام اللاتينية والعشرية', () => {
    expect(parseScore('8')).toBe(8);
    expect(parseScore('8.5')).toBe(8.5);
  });

  it('يقرأ الأرقام العربية والفاصلة العربية', () => {
    expect(parseScore('٧')).toBe(7);
    expect(parseScore('٨٫٥')).toBe(8.5);
    expect(parseScore('٨،٥')).toBe(8.5);
  });

  it('يُرجع null للقيم الفارغة أو غير الصالحة', () => {
    expect(parseScore('')).toBeNull();
    expect(parseScore('   ')).toBeNull();
    expect(parseScore('غير رقم')).toBeNull();
    expect(parseScore('-3')).toBeNull();
    expect(parseScore(null)).toBeNull();
    expect(parseScore(undefined)).toBeNull();
  });
});

describe('scorePercent', () => {
  it('يحسب النسبة الصحيحة', () => {
    expect(scorePercent('5', '10')).toBe(50);
    expect(scorePercent('7.5', '10')).toBe(75);
  });

  it('يتعامل مع الدرجة الكلية صفر أو فارغة', () => {
    expect(scorePercent('5', '0')).toBeNull();
    expect(scorePercent('5', '')).toBeNull();
  });

  it('يحدّ النسبة عند 100% إذا تجاوزت الدرجة النهاية العظمى', () => {
    expect(scorePercent('12', '10')).toBe(100);
  });
});

describe('classify', () => {
  it('يصنّف حسب الحدود الافتراضية', () => {
    expect(classify(90)).toBe('excellent');
    expect(classify(85)).toBe('excellent');
    expect(classify(70)).toBe('good');
    expect(classify(60)).toBe('good');
    expect(classify(59.9)).toBe('needs-support');
    expect(classify(0)).toBe('needs-support');
  });

  it('يُرجع غير محدّد عند غياب النسبة', () => {
    expect(classify(null)).toBe('unknown');
  });

  it('يحترم الحدود المخصّصة', () => {
    expect(classify(80, { excellent: 75, good: 50 })).toBe('excellent');
    expect(classify(60, { excellent: 75, good: 50 })).toBe('good');
    expect(classify(40, { excellent: 75, good: 50 })).toBe('needs-support');
  });
});

describe('resolveCategory', () => {
  it('يستخدم التصنيف اليدوي عند اختياره', () => {
    const data = makeData([{ score: '10', category: 'needs-support' }]);
    expect(resolveCategory(data.students[0], data)).toBe('needs-support');
  });

  it('يحسب تلقائياً عند اختيار auto', () => {
    const data = makeData([{ score: '10', category: 'auto' }]);
    expect(resolveCategory(data.students[0], data)).toBe('excellent');
  });
});

describe('summarize', () => {
  it('يحسب المتوسط والأعلى والأدنى والتوزيع', () => {
    const data = makeData([{ score: '10' }, { score: '6' }, { score: '2' }]);
    const summary = summarize(data);

    expect(summary.total).toBe(3);
    expect(summary.counted).toBe(3);
    expect(summary.average).toBeCloseTo(60, 5);
    expect(summary.highest).toBe(100);
    expect(summary.lowest).toBe(20);
    expect(summary.needsSupport).toBe(1);
    expect(summary.byCategory.map((entry) => entry.category)).toEqual([
      'excellent',
      'good',
      'needs-support',
    ]);
  });

  it('يتعامل مع قائمة فارغة تماماً', () => {
    const summary = summarize(makeData([]));
    expect(summary).toMatchObject({
      total: 0,
      counted: 0,
      average: null,
      highest: null,
      lowest: null,
      needsSupport: 0,
    });
    expect(summary.byCategory).toEqual([]);
  });

  it('يتعامل مع درجات ناقصة دون أن ينهار', () => {
    const data = makeData([{ score: '' }, { score: '8' }]);
    const summary = summarize(data);
    expect(summary.total).toBe(2);
    expect(summary.counted).toBe(1);
    expect(summary.average).toBe(80);
    expect(summary.byCategory.some((entry) => entry.category === 'unknown')).toBe(true);
  });

  it('النِّسَب في التوزيع تُجمَع إلى 100% تقريباً', () => {
    const data = makeData([{ score: '10' }, { score: '6' }, { score: '2' }, { score: '1' }]);
    const total = summarize(data).byCategory.reduce((sum, entry) => sum + entry.percent, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it('يعمل مع 40 طالباً', () => {
    const students = Array.from({ length: 40 }, (_, index) => ({ score: String(index % 11) }));
    const summary = summarize(makeData(students));
    expect(summary.total).toBe(40);
    expect(summary.counted).toBe(40);
  });
});

describe('suggestedAction', () => {
  it('يقترح إجراءً لكل تصنيف معروف', () => {
    expect(suggestedAction('excellent')).not.toBe('');
    expect(suggestedAction('good')).not.toBe('');
    expect(suggestedAction('needs-support')).not.toBe('');
    expect(suggestedAction('unknown')).toBe('');
  });
});
