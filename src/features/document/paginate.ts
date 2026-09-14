/**
 * توزيع عناصر المستند على صفحات A4.
 *
 * لماذا لا نعتمد على CSS فقط؟ لأن التصدير إلى PNG/PDF يحتاج صفحات حقيقية
 * ثابتة الأبعاد، وCSS وحده قد يقطع صف جدول في منتصفه. هنا نقيس ارتفاع كل
 * عنصر فعلياً ثم نوزّع العناصر توزيعاً لا يقسم أي صف بين صفحتين،
 * ويعيد ترويسة الجدول تلقائياً عند استكماله في صفحة جديدة.
 *
 * هذه الدالة خالصة (pure) لتسهيل اختبارها بالوحدات.
 */

export interface MeasuredItem {
  /** مفتاح فريد للعنصر. */
  key: string;
  /** الارتفاع المقاس بالبكسل. */
  height: number;
  /** معرّف الجدول إن كان العنصر صفاً من جدول. */
  tableId?: string;
  /** يجب ألا ينفصل عن العنصر التالي (عنوان قسم مثلاً). */
  keepWithNext?: boolean;
}

export interface PaginationInput {
  items: MeasuredItem[];
  /** ارتفاع المحتوى المتاح في الصفحة الأولى. */
  firstPageHeight: number;
  /** ارتفاع المحتوى المتاح في باقي الصفحات. */
  otherPageHeight: number;
  /** ارتفاع ترويسة كل جدول (تُعاد عند استكمال الجدول في صفحة جديدة). */
  tableHeadHeights: Record<string, number>;
}

export interface PageItem {
  key: string;
  /** true إذا كان العنصر ترويسة جدول مُعادة في بداية صفحة. */
  repeatedHead?: boolean;
  tableId?: string;
}

export type PaginatedPages = PageItem[][];

/**
 * يوزّع العناصر على صفحات.
 * يضمن: (1) عدم تجاوز ارتفاع الصفحة، (2) عدم تيتّم عنوان قسم في آخر صفحة،
 * (3) إعادة ترويسة الجدول عند الاستكمال.
 */
export function paginateItems(input: PaginationInput): PaginatedPages {
  const { items, firstPageHeight, otherPageHeight, tableHeadHeights } = input;
  if (items.length === 0) return [[]];

  const pages: PaginatedPages = [];
  let current: PageItem[] = [];
  let currentHeight = 0;
  let currentTableId: string | null = null;

  const limitFor = (pageIndex: number) => (pageIndex === 0 ? firstPageHeight : otherPageHeight);

  const flush = () => {
    pages.push(current);
    current = [];
    currentHeight = 0;
    currentTableId = null;
  };

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const limit = limitFor(pages.length);

    // نحتاج ترويسة جدول إذا بدأ صف جدول ولم تُعرض ترويسته في هذه الصفحة.
    const needsHead = !!item.tableId && currentTableId !== item.tableId;
    const headHeight = needsHead ? (tableHeadHeights[item.tableId as string] ?? 0) : 0;

    let required = headHeight + item.height;

    // عنصر مرتبط بما بعده (عنوان قسم): نحجز مساحة العنصر التالي أيضاً.
    if (item.keepWithNext && index + 1 < items.length) {
      const next = items[index + 1];
      const nextHead =
        next.tableId && next.tableId !== item.tableId
          ? (tableHeadHeights[next.tableId] ?? 0)
          : 0;
      required += nextHead + next.height;
    }

    if (current.length > 0 && currentHeight + required > limit) {
      flush();
    }

    const pageLimit = limitFor(pages.length);
    const headNeededNow = !!item.tableId && currentTableId !== item.tableId;
    if (headNeededNow) {
      const height = tableHeadHeights[item.tableId as string] ?? 0;
      current.push({ key: `${item.tableId}::head::p${pages.length}`, repeatedHead: true, tableId: item.tableId });
      currentHeight += height;
      currentTableId = item.tableId ?? null;
    }

    current.push({ key: item.key, tableId: item.tableId });
    currentHeight += item.height;
    if (!item.tableId) currentTableId = null;

    // حماية أخيرة: عنصر أطول من صفحة كاملة يبقى وحده في صفحته.
    if (currentHeight > pageLimit && current.length === 1) {
      flush();
    }
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}
