import { formatPercent } from '@/lib/format';
import { defineTool } from '../types';
import { Form } from './Form';
import type { CellTone, DocumentModel } from '@/features/document/types';
import {
  DECISION_LABELS,
  DEFAULT_DECISION_THRESHOLDS,
  aggregateSkills,
  createEmptyQuestion,
  decide,
  errorRate,
  nextLessonDecisions,
  summarizeErrorMap,
  type ErrorMapData,
  type QuestionDecision,
  validateErrorMap,
} from './compute';

const DECISION_TONE: Record<QuestionDecision, CellTone> = {
  reteach: 'bad',
  practice: 'warn',
  ok: 'good',
  unknown: 'muted',
};

function createEmptyData(): ErrorMapData {
  return {
    subject: '',
    grade: '',
    testTitle: '',
    totalStudents: '',
    thresholds: { ...DEFAULT_DECISION_THRESHOLDS },
    questions: [1, 2, 3, 4, 5].map((index) => createEmptyQuestion(index)),
  };
}

function createSampleData(): ErrorMapData {
  const sample: [string, string][] = [
    ['الفهم القرائي', '14'],
    ['الاستنتاج', '9'],
    ['الإملاء', '5'],
    ['التلخيص', '12'],
    ['المفردات', '3'],
  ];
  return {
    subject: 'اللغة العربية',
    grade: 'الخامس الابتدائي',
    testTitle: 'اختبار قصير — الوحدة الثانية',
    totalStudents: '25',
    thresholds: { ...DEFAULT_DECISION_THRESHOLDS },
    questions: sample.map(([skill, wrongCount], index) => ({
      label: `السؤال ${index + 1}`,
      skill,
      wrongCount,
    })),
  };
}


function buildDocument(data: ErrorMapData): DocumentModel {
  const summary = summarizeErrorMap(data);
  const skills = aggregateSkills(data);

  const questionRows = data.questions.map((question) => {
    const rate = errorRate(question.wrongCount, data.totalStudents);
    const decision = decide(rate, data.thresholds);
    return [
      { text: question.label },
      { text: question.skill },
      { text: question.wrongCount, align: 'center' as const },
      { text: rate === null ? '—' : formatPercent(rate), align: 'center' as const },
      { text: DECISION_LABELS[decision], tone: DECISION_TONE[decision], align: 'center' as const },
    ];
  });

  const skillRows = skills.map((skill) => [
    { text: skill.skill },
    { text: String(skill.questions), align: 'center' as const },
    { text: formatPercent(skill.averageRate), align: 'center' as const },
    {
      text: DECISION_LABELS[skill.decision],
      tone: DECISION_TONE[skill.decision],
      align: 'center' as const,
    },
  ]);

  return {
    toolId: 'error-map',
    title: 'خريطة أخطاء الصف',
    subtitle: data.testTitle || undefined,
    meta: [
      { label: 'المادة', value: data.subject },
      { label: 'الصف', value: data.grade },
      { label: 'عدد الطلاب', value: data.totalStudents },
      {
        label: 'حدّ إعادة الشرح',
        value: `${data.thresholds.reteach}%`,
      },
    ],
    blocks: [
      {
        kind: 'section',
        title: 'المؤشرات العامة',
        blocks: [
          {
            kind: 'stats',
            items: [
              { label: 'عدد الأسئلة', value: String(summary.questions) },
              {
                label: 'متوسط نسبة الخطأ',
                value: summary.averageRate === null ? '—' : formatPercent(summary.averageRate),
              },
              { label: 'تحتاج إعادة شرح', value: String(summary.reteach), tone: 'bad' },
              { label: 'مستوى مناسب', value: String(summary.ok), tone: 'good' },
            ],
          },
        ],
      },
      {
        kind: 'section',
        title: 'تحليل الأسئلة',
        blocks: [
          {
            kind: 'table',
            columns: [
              { key: 'q', label: 'السؤال', width: 1.5 },
              { key: 'skill', label: 'المهارة المرتبطة', width: 2.2 },
              { key: 'wrong', label: 'عدد من أخطأ', width: 1.2, align: 'center' },
              { key: 'rate', label: 'نسبة الخطأ', width: 1.2, align: 'center' },
              { key: 'decision', label: 'القرار', width: 1.8, align: 'center' },
            ],
            rows: questionRows,
            emptyText: 'أضف الأسئلة ليظهر تحليل الأخطاء.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'أكثر المهارات تعثّراً',
        blocks: [
          {
            kind: 'table',
            columns: [
              { key: 'skill', label: 'المهارة', width: 2.5 },
              { key: 'count', label: 'عدد الأسئلة', width: 1, align: 'center' },
              { key: 'rate', label: 'متوسط الخطأ', width: 1.2, align: 'center' },
              { key: 'decision', label: 'القرار', width: 1.8, align: 'center' },
            ],
            rows: skillRows,
            emptyText: 'أدخل المهارة المرتبطة بكل سؤال ليظهر ترتيب المهارات.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'قرار الحصة القادمة',
        blocks: [{ kind: 'list', items: nextLessonDecisions(data), ordered: true }],
      },
    ],
    footerNote: 'أدوات المعلم — خريطة أخطاء الصف',
  };
}

export const errorMapTool = defineTool<ErrorMapData>({
  id: 'error-map',
  slug: 'error-map',
  nameAr: 'خريطة أخطاء الصف',
  shortDescriptionAr: 'حلّل أخطاء الأسئلة وصمّم خطط علاجية مبنية على البيانات لا على التخمين.',
  longDescriptionAr:
    'أدخل أسئلة الاختبار والمهارة المرتبطة بكل سؤال وعدد من أخطأ، فتحصل على نسب الخطأ وترتيب المهارات وقرار الحصة القادمة.',
  icon: 'chart',
  createEmptyData,
  createSampleData,
  Form,
  buildDocument,
  validate: validateErrorMap,
});
