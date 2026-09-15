import { defineTool } from '../types';
import { Form } from './Form';
import type { DocBlock, DocumentModel } from '@/features/document/types';
import {
  DAY_OPTIONS,
  createEmptyPeriod,
  groupByDay,
  subjectLoad,
  validateStudentSchedule,
  type StudentScheduleData,
} from './compute';

function createEmptyData(): StudentScheduleData {
  return {
    studentName: '',
    grade: '',
    className: '',
    periods: [createEmptyPeriod(), createEmptyPeriod()],
  };
}

function createSampleData(): StudentScheduleData {
  return {
    studentName: 'لمى الدوسري',
    grade: 'الأول المتوسط',
    className: 'ب',
    periods: [
      { day: DAY_OPTIONS[0], period: '1', subject: 'الرياضيات', teacher: 'أ. سارة', room: '12' },
      { day: DAY_OPTIONS[0], period: '2', subject: 'اللغة العربية', teacher: 'أ. هند', room: '12' },
      { day: DAY_OPTIONS[0], period: '3', subject: 'العلوم', teacher: 'أ. منى', room: 'المختبر' },
      { day: DAY_OPTIONS[1], period: '1', subject: 'اللغة الإنجليزية', teacher: 'أ. ريم', room: '12' },
      { day: DAY_OPTIONS[1], period: '2', subject: 'الرياضيات', teacher: 'أ. سارة', room: '12' },
      { day: DAY_OPTIONS[2], period: '1', subject: 'الدراسات الإسلامية', teacher: 'أ. نوف', room: '12' },
      { day: DAY_OPTIONS[3], period: '1', subject: 'العلوم', teacher: 'أ. منى', room: 'المختبر' },
      { day: DAY_OPTIONS[4], period: '1', subject: 'التربية البدنية', teacher: 'أ. دانة', room: 'الصالة' },
    ],
  };
}

function buildDocument(data: StudentScheduleData): DocumentModel {
  const groups = groupByDay(data);
  const load = subjectLoad(data);

  const dayBlocks: DocBlock[] = groups.map((group) => ({
    kind: 'section',
    title: group.day,
    blocks: [
      {
        kind: 'table',
        columns: [
          { key: 'period', label: 'الحصة', width: 0.8, align: 'center' },
          { key: 'subject', label: 'المادة', width: 2.2 },
          { key: 'teacher', label: 'المعلم', width: 1.6 },
          { key: 'room', label: 'القاعة', width: 1, align: 'center' },
        ],
        rows: group.periods.map((entry) => [
          { text: entry.period || '—', align: 'center' as const },
          { text: entry.subject },
          { text: entry.teacher || '—' },
          { text: entry.room || '—', align: 'center' as const },
        ]),
        emptyText: 'لا حصص في هذا اليوم.',
      },
    ],
  }));

  return {
    toolId: 'student-schedule',
    title: 'جدولي الأسبوعي',
    subtitle: data.studentName || undefined,
    meta: [
      { label: 'الصف', value: data.grade },
      { label: 'الفصل', value: data.className },
      { label: 'عدد الحصص', value: String(data.periods.filter((entry) => entry.subject).length) },
      { label: 'عدد المواد', value: String(load.length) },
    ],
    blocks: [
      ...(dayBlocks.length
        ? dayBlocks
        : [
            {
              kind: 'note' as const,
              title: 'الجدول فارغ',
              text: 'أضف حصصك لتظهر هنا مرتّبة حسب اليوم.',
              tone: 'info' as const,
            },
          ]),
      {
        kind: 'section',
        title: 'نصيب كل مادة من أسبوعك',
        blocks: [
          {
            kind: 'table',
            columns: [
              { key: 'subject', label: 'المادة', width: 3 },
              { key: 'count', label: 'عدد الحصص', width: 1, align: 'center' },
            ],
            rows: load.map((entry) => [
              { text: entry.subject },
              { text: String(entry.count), align: 'center' as const },
            ]),
            emptyText: 'أضف حصصك ليظهر التوزيع.',
          },
        ],
      },
    ],
    footerNote: 'أدوات المعلم — جدول الطالب الأسبوعي',
  };
}

export const studentScheduleTool = defineTool<StudentScheduleData>({
  id: 'student-schedule',
  slug: 'student-schedule',
  nameAr: 'جدولي الأسبوعي',
  shortDescriptionAr: 'رتّب حصصك في جدول أسبوعي واضح تطبعه أو تحفظه.',
  longDescriptionAr:
    'أدخل حصصك ومعلّميك وقاعاتك، فتُخرج الأداة جدولاً أسبوعياً مرتّباً حسب اليوم، مع جدول يوضّح نصيب كل مادة من أسبوعك.',
  icon: 'calendar',
  createEmptyData,
  createSampleData,
  Form,
  buildDocument,
  validate: validateStudentSchedule,
});
