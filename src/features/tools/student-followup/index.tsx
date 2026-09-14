import { formatPercent, todayInputValue } from '@/lib/format';
import { defineTool } from '../types';
import { Form } from './Form';
import type { CellTone, DocumentModel } from '@/features/document/types';
import {
  CATEGORY_LABELS,
  DEFAULT_THRESHOLDS,
  createEmptyStudent,
  resolveCategory,
  scorePercent,
  suggestedAction,
  summarize,
  type FollowupData,
  type StudentCategory,
} from './compute';

const CATEGORY_TONE: Record<StudentCategory, CellTone> = {
  excellent: 'good',
  good: 'default',
  'needs-support': 'bad',
  unknown: 'muted',
};

function createEmptyData(): FollowupData {
  return {
    subject: '',
    grade: '',
    testTitle: '',
    date: todayInputValue(),
    maxScore: '10',
    thresholds: { ...DEFAULT_THRESHOLDS },
    students: [createEmptyStudent(), createEmptyStudent(), createEmptyStudent()],
  };
}

function createSampleData(): FollowupData {
  const sample: [string, string, string][] = [
    ['عبدالرحمن العتيبي', '9.5', 'تحليل النص'],
    ['نورة الشمري', '7', 'الاستنتاج'],
    ['محمد الغامدي', '4.5', 'الإملاء والترقيم'],
    ['ريما القحطاني', '8', 'التلخيص'],
    ['سلطان الدوسري', '3', 'الفهم القرائي'],
  ];
  return {
    subject: 'اللغة العربية',
    grade: 'الخامس الابتدائي',
    testTitle: 'اختبار قصير — الوحدة الثانية',
    date: todayInputValue(),
    maxScore: '10',
    thresholds: { ...DEFAULT_THRESHOLDS },
    students: sample.map(([name, score, weakSkill]) => ({
      ...createEmptyStudent(),
      name,
      score,
      weakSkill,
    })),
  };
}


function buildDocument(data: FollowupData): DocumentModel {
  const summary = summarize(data);

  const distributionRows = summary.byCategory.map((entry) => [
    { text: CATEGORY_LABELS[entry.category], tone: CATEGORY_TONE[entry.category] },
    { text: String(entry.count), align: 'center' as const },
    { text: formatPercent(entry.percent), align: 'center' as const },
  ]);

  const studentRows = data.students.map((student) => {
    const category = resolveCategory(student, data);
    const percent = scorePercent(student.score, data.maxScore);
    return [
      { text: student.name },
      {
        // نستخدم "من" بدل الشرطة المائلة: الشرطة المائلة تُقلب بصرياً
        // داخل نص عربي (Bidi) فتظهر "10 / 9.5" بدل "9.5 / 10".
        text: student.score.trim() === '' ? '' : `${student.score} من ${data.maxScore}`,
        align: 'center' as const,
        hint: percent === null ? undefined : formatPercent(percent),
      },
      { text: student.weakSkill },
      { text: CATEGORY_LABELS[category], tone: CATEGORY_TONE[category], align: 'center' as const },
      { text: student.action.trim() === '' ? suggestedAction(category) : student.action },
      { text: student.reviewDate, align: 'center' as const },
      { text: student.notes },
    ];
  });

  const steps: string[] = [];
  if (summary.needsSupport > 0) {
    steps.push(`مراجعة المفاهيم الأساسية مع ${summary.needsSupport} من الطلاب المحتاجين إلى دعم.`);
  }
  steps.push('تنفيذ تدريب قصير موجّه للمهارات المتعثّرة المذكورة في الجدول.');
  steps.push('متابعة أسبوعية لقياس التحسّن وتحديث الخطة عند الحاجة.');
  if (summary.total > summary.counted) {
    steps.push(`استكمال درجات ${summary.total - summary.counted} من الطلاب لم تُدخل بعد.`);
  }

  return {
    toolId: 'student-followup',
    title: 'خطة متابعة الطلاب بعد الاختبار',
    subtitle: data.testTitle || undefined,
    meta: [
      { label: 'المادة', value: data.subject },
      { label: 'الصف', value: data.grade },
      { label: 'التاريخ', value: data.date },
      { label: 'الدرجة الكلية', value: data.maxScore },
    ],
    blocks: [
      {
        kind: 'section',
        title: 'ملخّص النتائج',
        blocks: [
          {
            kind: 'stats',
            items: [
              { label: 'عدد الطلاب', value: String(summary.total) },
              {
                label: 'متوسط النسبة',
                value: summary.average === null ? '—' : formatPercent(summary.average),
              },
              {
                label: 'أعلى نسبة',
                value: summary.highest === null ? '—' : formatPercent(summary.highest),
                tone: 'good',
              },
              {
                label: 'أدنى نسبة',
                value: summary.lowest === null ? '—' : formatPercent(summary.lowest),
                tone: 'bad',
              },
            ],
          },
          {
            kind: 'table',
            columns: [
              { key: 'level', label: 'مستوى الأداء', width: 2 },
              { key: 'count', label: 'عدد الطلاب', width: 1, align: 'center' },
              { key: 'percent', label: 'النسبة', width: 1, align: 'center' },
            ],
            rows: distributionRows,
            emptyText: 'أدخل درجات الطلاب ليظهر توزيع المستويات.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'خطة المتابعة',
        blocks: [
          {
            kind: 'table',
            columns: [
              { key: 'name', label: 'اسم الطالب', width: 2.2 },
              { key: 'score', label: 'الدرجة', width: 1.1, align: 'center' },
              { key: 'skill', label: 'المهارة المتعثّرة', width: 1.8 },
              { key: 'category', label: 'التصنيف', width: 1.3, align: 'center' },
              { key: 'action', label: 'الإجراء المناسب', width: 2.2 },
              { key: 'review', label: 'موعد المراجعة', width: 1.3, align: 'center' },
              { key: 'notes', label: 'ملاحظات', width: 1.8 },
            ],
            rows: studentRows,
            emptyText: 'أضف الطلاب من نموذج الإدخال لتظهر خطة المتابعة هنا.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'الخطوات القادمة',
        blocks: [{ kind: 'list', items: steps, ordered: true }],
      },
    ],
    footerNote: 'أدوات المعلم — خطة متابعة بعد الاختبار',
  };
}

export const studentFollowupTool = defineTool<FollowupData>({
  id: 'student-followup',
  slug: 'student-followup',
  nameAr: 'خطة متابعة الطلاب بعد الاختبار',
  shortDescriptionAr: 'أنشئ خطة متابعة دقيقة بناءً على نتائج الاختبار القصير لتطوير مستوى طلابك.',
  longDescriptionAr:
    'أدخل درجات الطلاب وحدود التصنيف، فتحصل على توزيع المستويات وخطة متابعة فردية جاهزة للطباعة.',
  icon: 'clipboard',
  createEmptyData,
  createSampleData,
  Form,
  buildDocument,
});
