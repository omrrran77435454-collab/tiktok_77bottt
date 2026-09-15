import { todayInputValue } from '@/lib/format';
import { defineTool } from '../types';
import { Form } from './Form';
import type { DocBlock, DocumentModel } from '@/features/document/types';
import {
  CONFIDENCE_LABELS,
  buildExamPlan,
  createEmptyTopic,
  validateExamPrep,
  type ExamPrepData,
} from './compute';

function createEmptyData(): ExamPrepData {
  const today = todayInputValue();
  const examDate = new Date(`${today}T00:00:00Z`);
  examDate.setUTCDate(examDate.getUTCDate() + 5);

  return {
    studentName: '',
    subject: '',
    today,
    examDate: examDate.toISOString().slice(0, 10),
    minutesPerDay: '60',
    topics: [createEmptyTopic(), createEmptyTopic()],
  };
}

function createSampleData(): ExamPrepData {
  const today = todayInputValue();
  const examDate = new Date(`${today}T00:00:00Z`);
  examDate.setUTCDate(examDate.getUTCDate() + 5);

  return {
    studentName: 'ريان الشمري',
    subject: 'العلوم',
    today,
    examDate: examDate.toISOString().slice(0, 10),
    minutesPerDay: '75',
    topics: [
      { title: 'الخلية ووظائفها', confidence: 'weak', notes: 'أخلط بين العضيات' },
      { title: 'الجهاز الهضمي', confidence: 'medium', notes: '' },
      { title: 'الطاقة وتحوّلاتها', confidence: 'weak', notes: 'أحتاج تمارين' },
      { title: 'دورة الماء', confidence: 'strong', notes: 'مراجعة سريعة تكفي' },
      { title: 'التكاثر في النبات', confidence: 'medium', notes: '' },
    ],
  };
}

function buildDocument(data: ExamPrepData): DocumentModel {
  const plan = buildExamPlan(data);

  const dayBlocks: DocBlock[] = plan.days.map((day) => ({
    kind: 'section',
    title: day.isReviewDay
      ? `اليوم ${day.index} — مراجعة شاملة قبل الاختبار`
      : `اليوم ${day.index} — ${day.date}`,
    subtitle: `${day.minutes} دقيقة`,
    blocks: [
      {
        kind: 'list',
        ordered: true,
        items: day.topics.length
          ? day.topics.map(
              (topic) =>
                `${topic.title} (${CONFIDENCE_LABELS[topic.confidence]})${
                  topic.notes ? ` — ${topic.notes}` : ''
                }`,
            )
          : ['مراجعة عامة لكل الدروس.'],
      },
    ],
  }));

  const scheduleTable: DocBlock = {
    kind: 'section',
    title: 'الخطة يوماً بيوم',
    blocks: [
      {
        kind: 'table',
        columns: [
          { key: 'day', label: 'اليوم', width: 0.8, align: 'center' },
          { key: 'date', label: 'التاريخ', width: 1.2, align: 'center' },
          { key: 'topics', label: 'ما تذاكره', width: 3 },
          { key: 'minutes', label: 'الوقت', width: 0.9, align: 'center' },
        ],
        rows: plan.days.map((day) => [
          { text: String(day.index), align: 'center' as const },
          { text: day.date || '—', align: 'center' as const },
          {
            text: day.isReviewDay
              ? 'مراجعة شاملة — لا درس جديد'
              : day.topics.map((topic) => topic.title).join(' · ') || 'مراجعة عامة',
            tone: day.isReviewDay ? ('accent' as const) : ('default' as const),
          },
          { text: `${day.minutes} د`, align: 'center' as const },
        ]),
        emptyText: 'أضف دروسك وتأكّد أن تاريخ الاختبار بعد تاريخ اليوم.',
      },
    ],
  };

  return {
    toolId: 'exam-prep',
    title: 'خطة ما قبل الاختبار',
    subtitle: data.subject || data.studentName || undefined,
    meta: [
      { label: 'الطالب', value: data.studentName },
      { label: 'المادة', value: data.subject },
      { label: 'تاريخ الاختبار', value: data.examDate },
      { label: 'الأيام المتبقّية', value: String(plan.daysLeft) },
    ],
    blocks: [
      {
        kind: 'section',
        title: 'نظرة سريعة',
        blocks: [
          {
            kind: 'stats',
            items: [
              { label: 'أيام متبقّية', value: String(plan.daysLeft), tone: 'accent' },
              { label: 'أيام مذاكرة', value: String(plan.studyDays) },
              { label: 'دروس', value: String(plan.totalTopics) },
              { label: 'دروس ضعيفة', value: String(plan.weakTopics.length), tone: 'bad' },
            ],
          },
        ],
      },
      scheduleTable,
      ...dayBlocks,
      {
        kind: 'section',
        title: 'ركّز على هذه أولاً',
        blocks: [
          {
            kind: 'list',
            items: plan.weakTopics.length
              ? plan.weakTopics.map((topic) => `${topic.title}${topic.notes ? ` — ${topic.notes}` : ''}`)
              : ['لا توجد دروس ضعيفة — ركّز على المراجعة والتثبيت.'],
          },
        ],
      },
      {
        kind: 'section',
        title: 'قواعد اليوم الأخير',
        blocks: [
          {
            kind: 'list',
            items: [
              'لا تبدأ درساً جديداً في اليوم الأخير — راجع ما ذاكرته فقط.',
              'اختبر نفسك بأسئلة بدل إعادة القراءة.',
              'نم مبكّراً: النوم جزء من المراجعة لا خصم منها.',
            ],
          },
        ],
      },
    ],
    footerNote: 'أدوات المعلم — خطة ما قبل الاختبار',
  };
}

export const examPrepTool = defineTool<ExamPrepData>({
  id: 'exam-prep',
  slug: 'exam-prep',
  nameAr: 'خطة ما قبل الاختبار',
  shortDescriptionAr: 'حوّل أيامك المتبقّية قبل الاختبار إلى خطة مراجعة يومية محدّدة.',
  longDescriptionAr:
    'أدخل تاريخ الاختبار ودروسك ومستواك في كل درس، فتوزّعها الأداة على الأيام المتبقّية — الأضعف أولاً — وتترك اليوم الأخير للمراجعة الشاملة.',
  icon: 'chart',
  createEmptyData,
  createSampleData,
  Form,
  buildDocument,
  validate: validateExamPrep,
});
