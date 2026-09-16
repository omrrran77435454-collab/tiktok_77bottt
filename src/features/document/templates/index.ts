/**
 * القوالب السبعة.
 *
 * كل قالب ليس مجرّد ألوان مختلفة: لكل واحد بنية ترويسة مختلفة، وطريقة عرض
 * مختلفة للجداول وبيانات الترويسة، وسلّم مسافات وهوامش صفحة مختلفة،
 * وتجميع بصري مختلف للأقسام — مع بقاء البيانات نفسها تماماً.
 */

export type HeaderVariant = 'banner' | 'minimal' | 'hero' | 'academic' | 'sidebar' | 'plain' | 'premium';
export type TableVariant = 'grid' | 'lines' | 'cards' | 'classic' | 'zebra' | 'bw' | 'elevated';
export type MetaVariant = 'inline' | 'chips' | 'grid' | 'boxed' | 'stacked' | 'table' | 'pills';
export type SectionVariant = 'bar' | 'rule' | 'card' | 'numbered' | 'tinted' | 'plain' | 'accent';

export interface TemplateMetrics {
  /** هوامش الصفحة بالبكسل (أعلى/جانبي/أسفل). */
  paddingBlock: number;
  paddingInline: number;
  /** المسافة الرأسية بين عناصر المستند. */
  gap: number;
  /** ارتفاع الترويسة المصغّرة في الصفحات التالية. */
  runningHeader: number;
  /** ارتفاع تذييل الصفحة. */
  footer: number;
}

export interface DocTemplate {
  id: string;
  nameAr: string;
  descriptionAr: string;
  /** اسم الصنف على جذر الصفحة — يحمل كل تنسيقات القالب. */
  className: string;
  fontFamily: 'sans' | 'serif';
  /** قالب أحادي اللون يتجاهل ألوان المستخدم (اقتصادي للطباعة). */
  monochrome?: boolean;
  header: HeaderVariant;
  table: TableVariant;
  meta: MetaVariant;
  section: SectionVariant;
  metrics: TemplateMetrics;
}

const BASE_METRICS: TemplateMetrics = {
  paddingBlock: 48,
  paddingInline: 52,
  gap: 16,
  runningHeader: 34,
  footer: 30,
};

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: 'formal',
    nameAr: 'رسمي نظيف',
    descriptionAr: 'ترويسة بشريط لوني، جدول بحدود كاملة، مناسب للتقارير الإدارية.',
    className: 'tpl-formal',
    fontFamily: 'sans',
    header: 'banner',
    table: 'grid',
    meta: 'table',
    section: 'bar',
    metrics: { ...BASE_METRICS },
  },
  {
    id: 'minimal-ivory',
    nameAr: 'عاجي بسيط',
    descriptionAr: 'مساحات بيضاء واسعة، خطوط أفقية خفيفة فقط، بلا أي حشو بصري.',
    className: 'tpl-minimal',
    fontFamily: 'sans',
    header: 'minimal',
    table: 'lines',
    meta: 'chips',
    section: 'rule',
    metrics: { paddingBlock: 62, paddingInline: 66, gap: 22, runningHeader: 30, footer: 28 },
  },
  {
    id: 'modern-cards',
    nameAr: 'بطاقات حديثة',
    descriptionAr: 'كل صف يظهر كبطاقة مستقلة بعناوين حقول — ممتاز للقراءة السريعة.',
    className: 'tpl-cards',
    fontFamily: 'sans',
    header: 'hero',
    table: 'cards',
    meta: 'grid',
    section: 'card',
    metrics: { paddingBlock: 40, paddingInline: 44, gap: 14, runningHeader: 34, footer: 30 },
  },
  {
    id: 'academic',
    nameAr: 'أكاديمي',
    descriptionAr: 'خط نسخي، ترويسة موسّطة، أقسام مرقّمة، جدول كلاسيكي.',
    className: 'tpl-academic',
    fontFamily: 'serif',
    header: 'academic',
    table: 'classic',
    meta: 'boxed',
    section: 'numbered',
    metrics: { paddingBlock: 56, paddingInline: 58, gap: 18, runningHeader: 32, footer: 30 },
  },
  {
    id: 'natural-sage',
    nameAr: 'أخضر طبيعي',
    descriptionAr: 'شريط جانبي ملوّن، أقسام بخلفية خفيفة، جدول متبادل الألوان.',
    className: 'tpl-sage',
    fontFamily: 'sans',
    header: 'sidebar',
    table: 'zebra',
    meta: 'stacked',
    section: 'tinted',
    metrics: { paddingBlock: 44, paddingInline: 48, gap: 16, runningHeader: 34, footer: 30 },
  },
  {
    id: 'bw-print',
    nameAr: 'أبيض وأسود',
    descriptionAr: 'بلا ألوان ولا تعبئة — يوفّر الحبر ويطبع بوضوح على أي طابعة.',
    className: 'tpl-bw',
    fontFamily: 'sans',
    monochrome: true,
    header: 'plain',
    table: 'bw',
    meta: 'inline',
    section: 'plain',
    metrics: { paddingBlock: 40, paddingInline: 44, gap: 12, runningHeader: 28, footer: 26 },
  },
  {
    id: 'modern-premium',
    nameAr: 'فاخر حديث',
    descriptionAr: 'ترويسة بتدرّج لوني، تسلسل خطّي قوي، أقسام مرتفعة بحواف ناعمة.',
    className: 'tpl-premium',
    fontFamily: 'sans',
    header: 'premium',
    table: 'elevated',
    meta: 'pills',
    section: 'accent',
    metrics: { paddingBlock: 46, paddingInline: 50, gap: 18, runningHeader: 36, footer: 32 },
  },
];

export const DEFAULT_TEMPLATE_ID = DOC_TEMPLATES[0].id;

export function getTemplate(id: string | null | undefined): DocTemplate {
  return DOC_TEMPLATES.find((template) => template.id === id) ?? DOC_TEMPLATES[0];
}
