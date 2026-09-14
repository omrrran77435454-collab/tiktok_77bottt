/**
 * نموذج المستند (Document Model).
 *
 * الفكرة المعمارية: كل أداة تُنتج نفس البنية المجرّدة (عناوين، جداول، أقسام…)
 * ثم تتولّى القوالب السبعة عرضها بأشكال مختلفة تماماً.
 * هذا يفصل "منطق الأداة" عن "شكل المستند"، فإضافة أداة جديدة لا تتطلّب
 * لمس القوالب، وإضافة قالب جديد لا تتطلّب لمس الأدوات.
 */

export type CellTone = 'default' | 'good' | 'warn' | 'bad' | 'muted' | 'accent';

export interface DocCell {
  text: string;
  tone?: CellTone;
  align?: 'start' | 'center' | 'end';
  /** يظهر تحت النص بخط أصغر (مثل مهارة مرتبطة بسؤال). */
  hint?: string;
}

export interface DocColumn {
  key: string;
  label: string;
  /** وزن نسبي لعرض العمود. */
  width?: number;
  align?: 'start' | 'center' | 'end';
}

export interface MetaItem {
  label: string;
  value: string;
}

export interface StatItem {
  label: string;
  value: string;
  hint?: string;
  tone?: CellTone;
}

export type DocBlock =
  | { kind: 'meta'; items: MetaItem[] }
  | { kind: 'stats'; items: StatItem[] }
  | {
      kind: 'table';
      title?: string;
      columns: DocColumn[];
      rows: DocCell[][];
      emptyText?: string;
    }
  | { kind: 'list'; title?: string; items: string[]; ordered?: boolean }
  | { kind: 'keyvalue'; title?: string; items: MetaItem[] }
  | { kind: 'note'; title?: string; text: string; tone?: 'info' | 'accent' | 'plain' }
  | { kind: 'section'; title: string; subtitle?: string; blocks: DocBlock[] };

export interface DocumentModel {
  toolId: string;
  title: string;
  subtitle?: string;
  /** بيانات ترويسة المستند (المادة، الصف، التاريخ…). */
  meta: MetaItem[];
  blocks: DocBlock[];
  footerNote?: string;
}

/* ----------------------------- أبعاد الصفحة ----------------------------- */

/** مقاس A4 بالبكسل عند 96dpi — 210×297 مم. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
