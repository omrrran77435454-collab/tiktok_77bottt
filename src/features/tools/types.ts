import type { ComponentType } from 'react';
import type { DocumentModel } from '../document/types';

/**
 * تعريف الأداة.
 *
 * البنية Modular عن قصد: الأداة تعرّف بياناتها ونموذج الإدخال وطريقة بناء
 * المستند فقط. لا تعرف شيئاً عن القوالب ولا التصدير ولا التوجيه،
 * لذلك إضافة أداة جديدة = ملف جديد + سطر في السجل، بدون لمس نواة التطبيق.
 */
export interface ToolDefinition<TData> {
  id: string;
  slug: string;
  nameAr: string;
  shortDescriptionAr: string;
  /** وصف أطول يظهر داخل صفحة الأداة. */
  longDescriptionAr: string;
  icon: string;
  /** بيانات ابتدائية فارغة. */
  createEmptyData: () => TData;
  /** بيانات نموذجية لتجربة الأداة بسرعة (بيانات وهمية وليست حقيقية). */
  createSampleData: () => TData;
  /** نموذج الإدخال. */
  Form: ComponentType<{ data: TData; onChange: (next: TData) => void }>;
  /** تحويل البيانات إلى مستند قابل للعرض والتصدير. */
  buildDocument: (data: TData) => DocumentModel;
}

/**
 * نسخة "ممحوّة الأنواع" تُستخدم في السجل والتوجيه.
 * كل أداة تبقى مُحكمة الأنواع داخلياً، والتحويل يحدث في مكان واحد فقط.
 */
export interface AnyToolDefinition {
  id: string;
  slug: string;
  nameAr: string;
  shortDescriptionAr: string;
  longDescriptionAr: string;
  icon: string;
  createEmptyData: () => unknown;
  createSampleData: () => unknown;
  Form: ComponentType<{ data: never; onChange: (next: never) => void }>;
  buildDocument: (data: never) => DocumentModel;
}

export function defineTool<TData>(definition: ToolDefinition<TData>): AnyToolDefinition {
  return definition as unknown as AnyToolDefinition;
}
