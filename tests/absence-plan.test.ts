import { describe, expect, it } from 'vitest';
import {
  buildPlan,
  createEmptyItem,
  type AbsenceItem,
  type AbsencePlanData,
} from '@/features/tools/absence-plan/compute';

function makeData(items: Partial<AbsenceItem>[], availableMinutes = ''): AbsencePlanData {
  return {
    studentName: 'سلمان',
    subject: 'اللغة العربية',
    grade: 'الخامس',
    absenceDays: '3',
    availableMinutes,
    followUpDate: '2026-09-20',
    supportNeeded: '',
    items: items.map((item) => ({ ...createEmptyItem(), ...item })),
  };
}

describe('buildPlan', () => {
  it('يفصل ما فاته عمّا تم تعويضه وما لا يحتاج تعويضاً', () => {
    const plan = buildPlan(
      makeData([
        { title: 'درس 1', status: 'missed' },
        { title: 'واجب', status: 'done' },
        { title: 'نشاط', status: 'not-needed' },
      ]),
    );

    expect(plan.missed.map((item) => item.title)).toEqual(['درس 1']);
    expect(plan.done).toHaveLength(1);
    expect(plan.notNeeded).toHaveLength(1);
  });

  it('يرتّب ما فاته حسب الأولوية', () => {
    const plan = buildPlan(
      makeData([
        { title: 'منخفضة', priority: 'low' },
        { title: 'عالية', priority: 'high' },
        { title: 'متوسطة', priority: 'medium' },
      ]),
    );
    expect(plan.missed.map((item) => item.title)).toEqual(['عالية', 'متوسطة', 'منخفضة']);
  });

  it('يوزّع على «يبدأ الآن» و«يؤجَّل» حسب الوقت المتاح', () => {
    const plan = buildPlan(
      makeData(
        [
          { title: 'أ', priority: 'high', minutes: '30' },
          { title: 'ب', priority: 'medium', minutes: '20' },
          { title: 'ج', priority: 'low', minutes: '40' },
        ],
        '60',
      ),
    );

    expect(plan.startNow.map((item) => item.title)).toEqual(['أ', 'ب']);
    expect(plan.postpone.map((item) => item.title)).toEqual(['ج']);
    expect(plan.plannedMinutes).toBe(50);
    expect(plan.requiredMinutes).toBe(90);
    expect(plan.remainingMinutes).toBe(40);
  });

  it('يضع كل شيء في «يبدأ الآن» عند غياب الوقت المتاح', () => {
    const plan = buildPlan(
      makeData([
        { title: 'أ', minutes: '30' },
        { title: 'ب', minutes: '90' },
      ]),
    );
    expect(plan.startNow).toHaveLength(2);
    expect(plan.postpone).toHaveLength(0);
  });

  it('يبدأ بالمهمة الأولى حتى لو تجاوزت الوقت المتاح (وإلا بقيت الخطة فارغة)', () => {
    const plan = buildPlan(makeData([{ title: 'طويلة', minutes: '120' }], '30'));
    expect(plan.startNow.map((item) => item.title)).toEqual(['طويلة']);
    expect(plan.firstTask?.title).toBe('طويلة');
  });

  it('يتعامل مع قائمة فارغة', () => {
    const plan = buildPlan(makeData([]));
    expect(plan.missed).toEqual([]);
    expect(plan.firstTask).toBeNull();
    expect(plan.requiredMinutes).toBe(0);
    expect(plan.remainingMinutes).toBe(0);
  });

  it('يتجاهل قيم الوقت غير الصالحة', () => {
    const plan = buildPlan(makeData([{ title: 'أ', minutes: 'ليس رقماً' }], '60'));
    expect(plan.plannedMinutes).toBe(0);
    expect(plan.startNow).toHaveLength(1);
  });
});
