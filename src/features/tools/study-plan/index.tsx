import { defineTool } from '../types';
import { Form } from './Form';
import type { DocumentModel } from '@/features/document/types';
import {
  PRIORITY_LABELS,
  buildStudyPlan,
  createEmptySubject,
  validateStudyPlan,
  type StudyPlanData,
} from './compute';

function createEmptyData(): StudyPlanData {
  return {
    studentName: '',
    grade: '',
    days: '7',
    minutesPerDay: '90',
    sessionMinutes: '30',
    subjects: [createEmptySubject(), createEmptySubject()],
  };
}

function createSampleData(): StudyPlanData {
  return {
    studentName: 'نورة العتيبي',
    grade: 'الثالث المتوسط',
    days: '7',
    minutesPerDay: '120',
    sessionMinutes: '30',
    subjects: [
      { name: 'الرياضيات', priority: 'high', topics: '6', notes: 'أضعف نقطة: المعادلات' },
      { name: 'العلوم', priority: 'high', topics: '4', notes: 'مراجعة التجارب' },
      { name: 'اللغة العربية', priority: 'medium', topics: '3', notes: 'النحو' },
      { name: 'الدراسات الاجتماعية', priority: 'low', topics: '2', notes: '' },
    ],
  };
}

function buildDocument(data: StudyPlanData): DocumentModel {
  const plan = buildStudyPlan(data);

  return {
    toolId: 'study-plan',
    title: 'خطة المذاكرة',
    subtitle: data.studentName || undefined,
    meta: [
      { label: 'الصف', value: data.grade },
      { label: 'مدة الخطة', value: plan.days ? `${plan.days} يوم` : '' },
      { label: 'وقت المذاكرة اليومي', value: plan.minutesPerDay ? `${plan.minutesPerDay} دقيقة` : '' },
      { label: 'مدة الجلسة', value: `${plan.sessionMinutes} دقيقة` },
    ],
    blocks: [
      {
        kind: 'section',
        title: 'نظرة سريعة',
        blocks: [
          {
            kind: 'stats',
            items: [
              { label: 'إجمالي وقتك', value: `${plan.totalMinutes} د`, tone: 'accent' },
              { label: 'عدد المواد', value: String(plan.allocations.length) },
              {
                label: 'إجمالي الجلسات',
                value: String(plan.allocations.reduce((sum, item) => sum + item.sessions, 0)),
                tone: 'good',
              },
              {
                label: 'دروس متبقّية',
                value: String(plan.allocations.reduce((sum, item) => sum + item.topics, 0)),
                tone: 'warn',
              },
            ],
          },
        ],
      },
      {
        kind: 'section',
        title: 'توزيع الوقت على المواد',
        subtitle: 'الوقت موزَّع حسب الأولوية: العالية تأخذ ثلاثة أضعاف المنخفضة.',
        blocks: [
          {
            kind: 'table',
            columns: [
              { key: 'name', label: 'المادة', width: 2 },
              { key: 'priority', label: 'الأولوية', width: 1, align: 'center' },
              { key: 'daily', label: 'يومياً', width: 1, align: 'center' },
              { key: 'total', label: 'الإجمالي', width: 1, align: 'center' },
              { key: 'sessions', label: 'جلسات', width: 0.9, align: 'center' },
            ],
            rows: plan.allocations.map((item) => [
              { text: item.name, hint: item.notes || undefined },
              { text: PRIORITY_LABELS[item.priority], align: 'center' as const },
              { text: `${item.dailyMinutes} د`, align: 'center' as const },
              { text: `${item.totalMinutes} د`, align: 'center' as const },
              { text: String(item.sessions), align: 'center' as const },
            ]),
            emptyText: 'أضف موادك ليظهر التوزيع.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'ابدأ من هنا',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items:
              plan.allocations.length > 0
                ? plan.allocations
                    .slice(0, 3)
                    .map(
                      (item) =>
                        `${item.name}: ${item.sessions} جلسة × ${plan.sessionMinutes} دقيقة${
                          item.topics ? ` — ${item.topics} درساً` : ''
                        }`,
                    )
                : ['أضف موادك أولاً.'],
          },
        ],
      },
      {
        kind: 'section',
        title: 'قواعد تجعل الخطة تنجح',
        blocks: [
          {
            kind: 'list',
            items: [
              `ذاكر جلسة واحدة (${plan.sessionMinutes} دقيقة) ثم استرح 5–10 دقائق.`,
              'ابدأ بالمادة الأصعب وأنت في أعلى تركيزك.',
              'أنهِ الجلسة بسؤال واحد تختبر به نفسك — لا بمجرّد القراءة.',
              'إن فاتك يوم، لا تُضاعف اليوم التالي؛ أعد توزيع ما تبقّى.',
            ],
          },
        ],
      },
    ],
    footerNote: 'أدوات المعلم — خطة المذاكرة',
  };
}

export const studyPlanTool = defineTool<StudyPlanData>({
  id: 'study-plan',
  slug: 'study-plan',
  nameAr: 'خطة المذاكرة',
  shortDescriptionAr: 'وزّع موادك على أيام الأسبوع بخطة مذاكرة واقعية تناسب وقتك.',
  longDescriptionAr:
    'أدخل وقتك المتاح فعلاً وأولوية كل مادة، فتوزّع الأداة الدقائق توزيعاً مرجَّحاً بالأولوية وتُخرج لك خطة يومية قابلة للطباعة.',
  icon: 'book',
  createEmptyData,
  createSampleData,
  Form,
  buildDocument,
  validate: validateStudyPlan,
});
