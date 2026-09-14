import { todayInputValue } from '@/lib/format';
import { defineTool } from '../types';
import { Form } from './Form';
import type { DocumentModel, MetaItem } from '@/features/document/types';
import {
  PRIORITY_LABELS,
  TYPE_LABELS,
  buildPlan,
  createEmptyItem,
  type AbsenceItem,
  type AbsencePlanData,
} from './compute';

function createEmptyData(): AbsencePlanData {
  return {
    studentName: '',
    subject: '',
    grade: '',
    absenceDays: '',
    availableMinutes: '',
    followUpDate: todayInputValue(),
    supportNeeded: '',
    items: [createEmptyItem(), createEmptyItem()],
  };
}

function createSampleData(): AbsencePlanData {
  const items: AbsenceItem[] = [
    { title: 'درس: أسلوب الاستفهام', type: 'lesson', skill: 'التراكيب', status: 'missed', priority: 'high', minutes: '25' },
    { title: 'واجب الوحدة الثانية', type: 'homework', skill: 'الإملاء', status: 'missed', priority: 'medium', minutes: '20' },
    { title: 'اختبار قصير', type: 'assessment', skill: 'الفهم القرائي', status: 'missed', priority: 'high', minutes: '30' },
    { title: 'نشاط القراءة الجماعية', type: 'activity', skill: 'الطلاقة', status: 'not-needed', priority: 'low', minutes: '15' },
    { title: 'ورقة عمل المفردات', type: 'homework', skill: 'المفردات', status: 'done', priority: 'low', minutes: '10' },
  ];
  return {
    studentName: 'سلمان الحربي',
    subject: 'اللغة العربية',
    grade: 'الخامس الابتدائي',
    absenceDays: '3',
    availableMinutes: '60',
    followUpDate: todayInputValue(),
    supportNeeded: 'متابعة من ولي الأمر + جلسة دعم فردية قصيرة',
    items,
  };
}


function itemRow(item: AbsenceItem) {
  return [
    { text: item.title },
    { text: TYPE_LABELS[item.type], align: 'center' as const },
    { text: item.skill },
    { text: PRIORITY_LABELS[item.priority], align: 'center' as const },
    { text: item.minutes === '' ? '—' : `${item.minutes} د`, align: 'center' as const },
  ];
}

const ITEM_COLUMNS = [
  { key: 'title', label: 'العنصر', width: 2.6 },
  { key: 'type', label: 'النوع', width: 1.2, align: 'center' as const },
  { key: 'skill', label: 'المهارة', width: 1.8 },
  { key: 'priority', label: 'الأولوية', width: 1, align: 'center' as const },
  { key: 'minutes', label: 'الوقت', width: 0.9, align: 'center' as const },
];

function buildDocument(data: AbsencePlanData): DocumentModel {
  const plan = buildPlan(data);

  const followUp: MetaItem[] = [
    { label: 'أول مهمة يبدأ بها', value: plan.firstTask?.title ?? 'لم تُحدَّد بعد' },
    { label: 'الدعم المطلوب', value: data.supportNeeded },
    { label: 'موعد التحقق', value: data.followUpDate },
    {
      label: 'ما زال ناقصاً',
      value:
        plan.postpone.length === 0
          ? 'لا شيء — الخطة تغطي كل ما فاته'
          : `${plan.postpone.length} عنصراً (${plan.remainingMinutes} دقيقة)`,
    },
  ];

  return {
    toolId: 'absence-plan',
    title: 'خطة تعويض طالب غائب',
    subtitle: data.studentName || undefined,
    meta: [
      { label: 'المادة', value: data.subject },
      { label: 'الصف', value: data.grade },
      { label: 'أيام الغياب', value: data.absenceDays },
      { label: 'الوقت المتاح', value: data.availableMinutes ? `${data.availableMinutes} دقيقة` : '' },
    ],
    blocks: [
      {
        kind: 'section',
        title: 'نظرة سريعة',
        blocks: [
          {
            kind: 'stats',
            items: [
              { label: 'ما فاته', value: String(plan.missed.length), tone: 'bad' },
              { label: 'يبدأ الآن', value: String(plan.startNow.length), tone: 'accent' },
              { label: 'يؤجَّل', value: String(plan.postpone.length), tone: 'warn' },
              { label: 'تم تعويضه', value: String(plan.done.length), tone: 'good' },
            ],
          },
        ],
      },
      {
        kind: 'section',
        title: 'ما فاته',
        blocks: [
          {
            kind: 'table',
            columns: ITEM_COLUMNS,
            rows: plan.missed.map(itemRow),
            emptyText: 'لا توجد عناصر فائتة — الطالب مكتمل.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'يبدأ الآن',
        subtitle:
          plan.plannedMinutes > 0 ? `إجمالي الوقت المخصّص: ${plan.plannedMinutes} دقيقة` : undefined,
        blocks: [
          {
            kind: 'table',
            columns: ITEM_COLUMNS,
            rows: plan.startNow.map(itemRow),
            emptyText: 'لا توجد مهام للبدء بها الآن.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'يؤجَّل',
        blocks: [
          {
            kind: 'table',
            columns: ITEM_COLUMNS,
            rows: plan.postpone.map(itemRow),
            emptyText: 'لا شيء مؤجَّل.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'لا يحتاج تعويضاً كاملاً',
        blocks: [
          {
            kind: 'list',
            items:
              plan.notNeeded.length > 0
                ? plan.notNeeded.map(
                    (item) => `${item.title}${item.skill ? ` — ${item.skill}` : ''}`,
                  )
                : ['لم يُحدَّد أي عنصر بهذه الحالة.'],
          },
        ],
      },
      {
        kind: 'section',
        title: 'المتابعة',
        blocks: [{ kind: 'keyvalue', items: followUp }],
      },
    ],
    footerNote: 'أدوات المعلم — خطة تعويض طالب غائب',
  };
}

export const absencePlanTool = defineTool<AbsencePlanData>({
  id: 'absence-plan',
  slug: 'absence-plan',
  nameAr: 'خطة تعويض طالب غائب',
  shortDescriptionAr: 'أنشئ خطة تعويض مخصّصة لما فات الطالب، مرتّبة حسب الأولوية والوقت المتاح.',
  longDescriptionAr:
    'أدخل ما فات الطالب من دروس وواجبات وتقويمات وأنشطة، فترتّبها الأداة حسب الأولوية والوقت المتاح إلى: يبدأ الآن، يؤجَّل، ولا يحتاج تعويضاً.',
  icon: 'user',
  createEmptyData,
  createSampleData,
  Form,
  buildDocument,
});
