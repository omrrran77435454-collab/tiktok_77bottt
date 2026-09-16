import { todayInputValue } from '@/lib/format';
import { defineTool } from '../types';
import { Form } from './Form';
import type { DocCell, DocumentModel } from '@/features/document/types';
import {
  STATUS_LABELS,
  createEmptyItem,
  dueLabel,
  organizeHomework,
  validateHomework,
  type HomeworkData,
  type HomeworkEntry,
} from './compute';

function createEmptyData(): HomeworkData {
  return {
    studentName: '',
    grade: '',
    today: todayInputValue(),
    items: [createEmptyItem(), createEmptyItem()],
  };
}

function createSampleData(): HomeworkData {
  const today = todayInputValue();
  const shift = (days: number) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  return {
    studentName: 'عبدالله القحطاني',
    grade: 'الثاني المتوسط',
    today,
    items: [
      { title: 'تمارين المعادلات', subject: 'الرياضيات', dueDate: shift(-1), status: 'todo', minutes: '40' },
      { title: 'تقرير التجربة', subject: 'العلوم', dueDate: shift(0), status: 'in-progress', minutes: '30' },
      { title: 'حفظ النص', subject: 'اللغة العربية', dueDate: shift(2), status: 'todo', minutes: '25' },
      { title: 'خريطة المفاهيم', subject: 'الاجتماعيات', dueDate: shift(6), status: 'todo', minutes: '35' },
      { title: 'ورقة عمل المفردات', subject: 'الإنجليزية', dueDate: shift(-3), status: 'done', minutes: '20' },
    ],
  };
}

const COLUMNS = [
  { key: 'title', label: 'الواجب', width: 2.4 },
  { key: 'subject', label: 'المادة', width: 1.4 },
  { key: 'due', label: 'التسليم', width: 1.2, align: 'center' as const },
  { key: 'status', label: 'الحالة', width: 1, align: 'center' as const },
  { key: 'minutes', label: 'الوقت', width: 0.9, align: 'center' as const },
];

function row(entry: HomeworkEntry): DocCell[] {
  const tone =
    entry.bucket === 'overdue'
      ? ('bad' as const)
      : entry.bucket === 'today'
        ? ('warn' as const)
        : entry.bucket === 'done'
          ? ('good' as const)
          : ('default' as const);

  return [
    { text: entry.title },
    { text: entry.subject || '—' },
    { text: dueLabel(entry), align: 'center', tone },
    { text: STATUS_LABELS[entry.status], align: 'center' },
    { text: entry.minutes ? `${entry.minutes} د` : '—', align: 'center' },
  ];
}

function buildDocument(data: HomeworkData): DocumentModel {
  const result = organizeHomework(data);

  return {
    toolId: 'homework-organizer',
    title: 'منظّم الواجبات',
    subtitle: data.studentName || undefined,
    meta: [
      { label: 'الصف', value: data.grade },
      { label: 'التاريخ', value: data.today },
      { label: 'واجبات متبقّية', value: String(result.entries.length - result.done.length) },
      { label: 'الوقت المطلوب', value: `${result.totalMinutes} دقيقة` },
    ],
    blocks: [
      {
        kind: 'section',
        title: 'نظرة سريعة',
        blocks: [
          {
            kind: 'stats',
            items: [
              { label: 'متأخّر', value: String(result.overdue.length), tone: 'bad' },
              { label: 'اليوم', value: String(result.today.length), tone: 'warn' },
              { label: 'قادم', value: String(result.upcoming.length), tone: 'accent' },
              { label: 'مُنجَز', value: String(result.done.length), tone: 'good' },
            ],
          },
        ],
      },
      {
        kind: 'section',
        title: 'ابدأ بهذا أولاً',
        subtitle: 'المتأخّر ثم المستحقّ اليوم.',
        blocks: [
          {
            kind: 'table',
            columns: COLUMNS,
            rows: [...result.overdue, ...result.today].map(row),
            emptyText: 'لا يوجد متأخّر ولا مستحقّ اليوم — أحسنت.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'قادم',
        blocks: [
          {
            kind: 'table',
            columns: COLUMNS,
            rows: result.upcoming.map(row),
            emptyText: 'لا توجد واجبات قادمة مسجّلة.',
          },
        ],
      },
      {
        kind: 'section',
        title: 'مُنجَز',
        blocks: [
          {
            kind: 'list',
            items: result.done.length
              ? result.done.map((entry) => `${entry.title}${entry.subject ? ` — ${entry.subject}` : ''}`)
              : ['لم تُنجِز أي واجب بعد.'],
          },
        ],
      },
    ],
    footerNote: 'أدوات المعلم — منظّم الواجبات',
  };
}

export const homeworkOrganizerTool = defineTool<HomeworkData>({
  id: 'homework-organizer',
  slug: 'homework-organizer',
  nameAr: 'منظّم الواجبات',
  shortDescriptionAr: 'اجمع واجباتك ومواعيدها في قائمة واحدة مرتّبة حسب الأقرب تسليماً.',
  longDescriptionAr:
    'أدخل واجباتك ومواعيد تسليمها، فترتّبها الأداة حسب الأقرب وتُبرز المتأخّر والمستحقّ اليوم، وتحسب الوقت المطلوب لإنهاء ما تبقّى.',
  icon: 'clipboard',
  createEmptyData,
  createSampleData,
  Form,
  buildDocument,
  validate: validateHomework,
});
