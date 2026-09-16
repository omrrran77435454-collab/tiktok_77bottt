/**
 * اختبارات منطق أدوات الطالب الأربع.
 * كل أداة تُختبر بمنطقها الحقيقي: التوزيع، الترتيب، والتحقّق من المدخلات.
 */
import { describe, expect, it } from 'vitest';
import { buildStudyPlan, validateStudyPlan, type StudyPlanData } from '@/features/tools/study-plan/compute';
import {
  daysBetween,
  dueLabel,
  organizeHomework,
  validateHomework,
  type HomeworkData,
} from '@/features/tools/homework-organizer/compute';
import {
  buildExamPlan,
  daysUntil,
  validateExamPrep,
  type ExamPrepData,
} from '@/features/tools/exam-prep/compute';
import {
  groupByDay,
  subjectLoad,
  validateStudentSchedule,
  type StudentScheduleData,
} from '@/features/tools/student-schedule/compute';

/* ------------------------------ خطة المذاكرة ------------------------------ */

const studyData = (overrides: Partial<StudyPlanData> = {}): StudyPlanData => ({
  studentName: 'طالب',
  grade: 'الأول المتوسط',
  days: '5',
  minutesPerDay: '120',
  sessionMinutes: '30',
  subjects: [
    { name: 'رياضيات', priority: 'high', topics: '4', notes: '' },
    { name: 'علوم', priority: 'low', topics: '2', notes: '' },
  ],
  ...overrides,
});

describe('خطة المذاكرة', () => {
  it('تعطي المادة عالية الأولوية وقتاً أكبر', () => {
    const plan = buildStudyPlan(studyData());
    const [first, second] = plan.allocations;

    expect(first.name).toBe('رياضيات');
    expect(first.totalMinutes).toBeGreaterThan(second.totalMinutes);
  });

  it('توزّع كل الوقت المتاح تقريباً بلا تجاوز', () => {
    const plan = buildStudyPlan(studyData());
    const allocated = plan.allocations.reduce((sum, item) => sum + item.totalMinutes, 0);

    expect(plan.totalMinutes).toBe(600);
    // التقريب لأقرب 5 دقائق يسمح بفارق بسيط فقط.
    expect(Math.abs(allocated - plan.totalMinutes)).toBeLessThanOrEqual(10);
  });

  it('ترتّب المواد من الأعلى أولوية إلى الأدنى', () => {
    const plan = buildStudyPlan(
      studyData({
        subjects: [
          { name: 'منخفضة', priority: 'low', topics: '1', notes: '' },
          { name: 'عالية', priority: 'high', topics: '1', notes: '' },
          { name: 'متوسطة', priority: 'medium', topics: '1', notes: '' },
        ],
      }),
    );

    expect(plan.allocations.map((item) => item.name)).toEqual(['عالية', 'متوسطة', 'منخفضة']);
  });

  it('تتجاهل المواد بلا اسم', () => {
    const plan = buildStudyPlan(
      studyData({
        subjects: [
          { name: 'رياضيات', priority: 'high', topics: '2', notes: '' },
          { name: '   ', priority: 'high', topics: '2', notes: '' },
        ],
      }),
    );
    expect(plan.allocations).toHaveLength(1);
  });

  it('لا تنهار عندما يكون الوقت صفراً', () => {
    const plan = buildStudyPlan(studyData({ minutesPerDay: '0' }));
    expect(plan.allocations).toEqual([]);
    expect(plan.totalMinutes).toBe(0);
  });

  it('ترفض المدخلات غير الواقعية برسائل عربية', () => {
    expect(validateStudyPlan(studyData())).toEqual([]);

    const noDays = validateStudyPlan(studyData({ days: '0' }));
    expect(noDays.some((issue) => issue.field === 'days')).toBe(true);

    const tooMuch = validateStudyPlan(studyData({ minutesPerDay: '1200' }));
    expect(tooMuch.some((issue) => issue.field === 'minutesPerDay')).toBe(true);

    const longSession = validateStudyPlan(studyData({ minutesPerDay: '30', sessionMinutes: '90' }));
    expect(longSession.some((issue) => issue.field === 'sessionMinutes')).toBe(true);

    const noSubjects = validateStudyPlan(studyData({ subjects: [] }));
    expect(noSubjects.some((issue) => issue.field === 'subjects')).toBe(true);
  });
});

/* ----------------------------- منظّم الواجبات ----------------------------- */

const homeworkData = (overrides: Partial<HomeworkData> = {}): HomeworkData => ({
  studentName: 'طالب',
  grade: 'الثاني المتوسط',
  today: '2026-03-10',
  items: [
    { title: 'متأخّر', subject: 'رياضيات', dueDate: '2026-03-08', status: 'todo', minutes: '30' },
    { title: 'اليوم', subject: 'علوم', dueDate: '2026-03-10', status: 'todo', minutes: '20' },
    { title: 'قريب', subject: 'عربي', dueDate: '2026-03-12', status: 'todo', minutes: '15' },
    { title: 'بعيد', subject: 'اجتماعيات', dueDate: '2026-03-25', status: 'todo', minutes: '25' },
    { title: 'منتهٍ', subject: 'إنجليزي', dueDate: '2026-03-05', status: 'done', minutes: '10' },
  ],
  ...overrides,
});

describe('منظّم الواجبات', () => {
  it('يرتّب المتأخّر أولاً ثم المستحقّ اليوم', () => {
    const result = organizeHomework(homeworkData());
    expect(result.entries.map((entry) => entry.title)).toEqual([
      'متأخّر',
      'اليوم',
      'قريب',
      'بعيد',
      'منتهٍ',
    ]);
  });

  it('يصنّف كل واجب في مجموعته الصحيحة', () => {
    const result = organizeHomework(homeworkData());
    expect(result.overdue.map((entry) => entry.title)).toEqual(['متأخّر']);
    expect(result.today.map((entry) => entry.title)).toEqual(['اليوم']);
    expect(result.upcoming.map((entry) => entry.title)).toEqual(['قريب', 'بعيد']);
    expect(result.done.map((entry) => entry.title)).toEqual(['منتهٍ']);
  });

  it('يحسب وقت ما تبقّى فقط ولا يحسب المنجز', () => {
    const result = organizeHomework(homeworkData());
    expect(result.totalMinutes).toBe(90);
  });

  it('لا يعدّ الواجب المنجز متأخّراً ولو فات موعده', () => {
    const result = organizeHomework(homeworkData());
    const finished = result.entries.find((entry) => entry.title === 'منتهٍ');
    expect(finished?.bucket).toBe('done');
  });

  it('يصف المهلة بالعربية', () => {
    const result = organizeHomework(homeworkData());
    const byTitle = (title: string) => result.entries.find((entry) => entry.title === title)!;

    expect(dueLabel(byTitle('متأخّر'))).toBe('متأخّر 2 يوم');
    expect(dueLabel(byTitle('اليوم'))).toBe('اليوم');
    expect(dueLabel(byTitle('قريب'))).toBe('بعد 2 أيام');
  });

  it('يتعامل مع واجب بلا موعد تسليم', () => {
    const result = organizeHomework(
      homeworkData({
        items: [{ title: 'بلا موعد', subject: '', dueDate: '', status: 'todo', minutes: '' }],
      }),
    );
    expect(result.entries[0].bucket).toBe('later');
    expect(dueLabel(result.entries[0])).toBe('بلا موعد');
  });

  it('يحسب فرق الأيام بصرف النظر عن المنطقة الزمنية', () => {
    expect(daysBetween('2026-03-10', '2026-03-12')).toBe(2);
    expect(daysBetween('2026-03-10', '2026-03-08')).toBe(-2);
    expect(daysBetween('غير صالح', '2026-03-08')).toBeNull();
  });

  it('يرفض الواجبات بلا عنوان والتواريخ الخاطئة', () => {
    expect(validateHomework(homeworkData())).toEqual([]);

    const empty = validateHomework(homeworkData({ items: [] }));
    expect(empty.some((issue) => issue.field === 'items')).toBe(true);

    const badDate = validateHomework(
      homeworkData({
        items: [{ title: 'واجب', subject: '', dueDate: '31-31-2026', status: 'todo', minutes: '' }],
      }),
    );
    expect(badDate.length).toBeGreaterThan(0);
  });
});

/* -------------------------- خطة ما قبل الاختبار -------------------------- */

const examData = (overrides: Partial<ExamPrepData> = {}): ExamPrepData => ({
  studentName: 'طالب',
  subject: 'العلوم',
  today: '2026-03-10',
  examDate: '2026-03-14',
  minutesPerDay: '60',
  topics: [
    { title: 'درس قوي', confidence: 'strong', notes: '' },
    { title: 'درس ضعيف', confidence: 'weak', notes: '' },
    { title: 'درس متوسط', confidence: 'medium', notes: '' },
  ],
  ...overrides,
});

describe('خطة ما قبل الاختبار', () => {
  it('تحسب الأيام المتبقّية', () => {
    expect(daysUntil('2026-03-10', '2026-03-14')).toBe(4);
    const plan = buildExamPlan(examData());
    expect(plan.daysLeft).toBe(4);
  });

  it('تترك اليوم الأخير للمراجعة بلا درس جديد', () => {
    const plan = buildExamPlan(examData());
    const last = plan.days.at(-1);

    expect(last?.isReviewDay).toBe(true);
    expect(plan.studyDays).toBe(3);
  });

  it('تبدأ بالدروس الأضعف', () => {
    const plan = buildExamPlan(examData());
    expect(plan.days[0].topics[0].title).toBe('درس ضعيف');
  });

  it('تُبرز الدروس الضعيفة في قائمة منفصلة', () => {
    const plan = buildExamPlan(examData());
    expect(plan.weakTopics.map((topic) => topic.title)).toEqual(['درس ضعيف']);
  });

  it('لا تنتج أياماً عندما يكون الاختبار اليوم', () => {
    const plan = buildExamPlan(examData({ examDate: '2026-03-10' }));
    expect(plan.days).toEqual([]);
  });

  it('ترفض تاريخ اختبار في الماضي', () => {
    const issues = validateExamPrep(examData({ examDate: '2026-03-01' }));
    expect(issues.some((issue) => issue.field === 'examDate')).toBe(true);
  });

  it('ترفض الخطة بلا دروس', () => {
    const issues = validateExamPrep(examData({ topics: [] }));
    expect(issues.some((issue) => issue.field === 'topics')).toBe(true);
  });

  it('تقبل المدخلات الصحيحة بلا ملاحظات', () => {
    expect(validateExamPrep(examData())).toEqual([]);
  });
});

/* ---------------------------- جدول الطالب ---------------------------- */

const scheduleData = (overrides: Partial<StudentScheduleData> = {}): StudentScheduleData => ({
  studentName: 'طالب',
  grade: 'الأول المتوسط',
  className: 'أ',
  periods: [
    { day: 'الأحد', period: '2', subject: 'علوم', teacher: '', room: '' },
    { day: 'الأحد', period: '1', subject: 'رياضيات', teacher: '', room: '' },
    { day: 'الاثنين', period: '1', subject: 'رياضيات', teacher: '', room: '' },
  ],
  ...overrides,
});

describe('جدول الطالب', () => {
  it('يجمع الحصص حسب اليوم ويرتّبها برقم الحصة', () => {
    const groups = groupByDay(scheduleData());

    expect(groups.map((group) => group.day)).toEqual(['الأحد', 'الاثنين']);
    expect(groups[0].periods.map((entry) => entry.subject)).toEqual(['رياضيات', 'علوم']);
  });

  it('يتجاهل الحصص بلا مادة', () => {
    const groups = groupByDay(
      scheduleData({
        periods: [{ day: 'الأحد', period: '1', subject: '  ', teacher: '', room: '' }],
      }),
    );
    expect(groups).toEqual([]);
  });

  it('يحسب نصيب كل مادة مرتّباً تنازلياً', () => {
    const load = subjectLoad(scheduleData());
    expect(load).toEqual([
      { subject: 'رياضيات', count: 2 },
      { subject: 'علوم', count: 1 },
    ]);
  });

  it('يكشف تعارض حصّتين في نفس اليوم ونفس الرقم', () => {
    const issues = validateStudentSchedule(
      scheduleData({
        periods: [
          { day: 'الأحد', period: '1', subject: 'رياضيات', teacher: '', room: '' },
          { day: 'الأحد', period: '1', subject: 'علوم', teacher: '', room: '' },
        ],
      }),
    );
    expect(issues.some((issue) => issue.message.includes('تعارض'))).toBe(true);
  });

  it('يرفض رقم حصة خارج النطاق', () => {
    const issues = validateStudentSchedule(
      scheduleData({
        periods: [{ day: 'الأحد', period: '40', subject: 'رياضيات', teacher: '', room: '' }],
      }),
    );
    expect(issues.length).toBeGreaterThan(0);
  });

  it('يقبل جدولاً صحيحاً', () => {
    expect(validateStudentSchedule(scheduleData())).toEqual([]);
  });
});
