import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
import type { Palette } from '@/lib/colors';
import { buildFlow } from './flow';
import { paginateItems, type MeasuredItem, type PaginatedPages } from './paginate';
import { buildDocumentVars } from './theme';
import { DocFooter, DocRunningHeader } from './blocks';
import { getTemplate } from './templates';
import { A4_HEIGHT_PX, A4_WIDTH_PX, type DocumentModel } from './types';

interface DocumentPagesProps {
  model: DocumentModel;
  templateId: string;
  palette: Palette;
  /** يُستخدم للتصدير: عنصر يحتوي كل الصفحات. */
  containerRef?: React.Ref<HTMLDivElement>;
}

/**
 * يعرض المستند موزّعاً على صفحات A4 حقيقية.
 *
 * الخطوات:
 *  1) تحويل النموذج إلى عناصر مسطّحة (buildFlow).
 *  2) قياس ارتفاع كل عنصر فعلياً في حاوية مخفية بنفس عرض المحتوى.
 *  3) توزيع العناصر على صفحات بحيث لا ينقسم أي صف (paginateItems).
 *
 * القياس يُعاد بعد جاهزية الخطوط لأن ارتفاع النص العربي يتغيّر
 * تغيّراً ملموساً بين الخط الاحتياطي والخط النهائي.
 */
export function DocumentPages({ model, templateId, palette, containerRef }: DocumentPagesProps) {
  const template = useMemo(() => getTemplate(templateId), [templateId]);
  const flow = useMemo(() => buildFlow(model, template), [model, template]);
  const vars = useMemo(() => buildDocumentVars(palette, template), [palette, template]);

  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PaginatedPages | null>(null);
  // إن كانت واجهة الخطوط غير متاحة (بيئة اختبار مثلاً) نعتبرها جاهزة فوراً.
  const [fontsReady, setFontsReady] = useState(
    () => typeof document === 'undefined' || !(document as Document & { fonts?: FontFaceSet }).fonts,
  );

  useEffect(() => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) return;
    let cancelled = false;
    void fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { paddingBlock, paddingInline, gap, runningHeader, footer } = template.metrics;
  const contentWidth = A4_WIDTH_PX - paddingInline * 2;
  const firstPageHeight = A4_HEIGHT_PX - paddingBlock * 2 - footer;
  const otherPageHeight = firstPageHeight - runningHeader;

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;

    const readHeight = (key: string): number => {
      const element = root.querySelector<HTMLElement>(`[data-measure-key="${cssEscape(key)}"]`);
      if (!element) return 0;
      return element.getBoundingClientRect().height;
    };

    const measured: MeasuredItem[] = flow.items.map((item) => ({
      key: item.key,
      height: readHeight(item.key),
      tableId: item.tableId,
      keepWithNext: item.keepWithNext,
    }));

    const tableHeadHeights: Record<string, number> = {};
    for (const tableId of Object.keys(flow.tableHeads)) {
      // نضيف المسافة الفاصلة إلى ارتفاع الترويسة لأنها تُضاف مرّة واحدة
      // بعد آخر صف من الجدول في كل صفحة.
      tableHeadHeights[tableId] = readHeight(`head:${tableId}`) + gap;
    }

    const totalMeasured = measured.reduce((sum, item) => sum + item.height, 0);
    if (totalMeasured === 0) {
      // بيئة بلا تخطيط (مثل الاختبارات) — نعرض كل شيء في صفحة واحدة.
      setPages([flow.items.map((item) => ({ key: item.key, tableId: item.tableId }))]);
      return;
    }

    setPages(
      paginateItems({ items: measured, firstPageHeight, otherPageHeight, tableHeadHeights }),
    );
  }, [flow, firstPageHeight, otherPageHeight, gap, fontsReady, vars]);

  const nodeByKey = useMemo(() => {
    const map = new Map<string, ReactNode>();
    for (const item of flow.items) map.set(item.key, item.node);
    return map;
  }, [flow]);

  const pageStyle: CSSProperties = {
    ...vars,
    width: `${A4_WIDTH_PX}px`,
    minHeight: `${A4_HEIGHT_PX}px`,
    paddingBlock: `${paddingBlock}px`,
    paddingInline: `${paddingInline}px`,
  };

  const resolved: PaginatedPages =
    pages ?? [flow.items.map((item) => ({ key: item.key, tableId: item.tableId }))];

  /**
   * حاوية القياس تُركَّب في ‎document.body‎ عبر Portal عن قصد:
   * منطقة المعاينة تستخدم ‎transform: scale()‎ للتكبير، وأي عنصر داخلها
   * تُرجع ‎getBoundingClientRect‎ أبعاده مضروبة في نسبة التكبير — ما يفسد القياس.
   * إخراجها من الشجرة المُكبَّرة يجعل القياس دقيقاً دائماً ومستقلاً عن الزوم.
   */
  const measureNode = (
    <div
      className={`doc-measure ${template.className}`}
      ref={measureRef}
      aria-hidden="true"
      style={{ ...vars, width: `${contentWidth}px` }}
    >
      {Object.entries(flow.tableHeads).map(([tableId, render]) => (
        <div key={tableId} data-measure-key={`head:${tableId}`} className="doc-flow-item doc-flow-table">
          {render(false)}
        </div>
      ))}
      {flow.items.map((item) => (
        <div
          key={item.key}
          data-measure-key={item.key}
          className={`doc-flow-item${item.tableId ? ' doc-flow-table' : ''}${
            item.inSection ? ' doc-in-section' : ''
          }`}
        >
          {item.node}
        </div>
      ))}
    </div>
  );

  return (
    <div className="doc-root" ref={containerRef} data-template={template.id}>
      {typeof document === 'undefined' ? measureNode : createPortal(measureNode, document.body)}

      {resolved.map((pageItems, pageIndex) => (
        <section
          key={`page-${pageIndex}`}
          className={`doc-page ${template.className}`}
          style={pageStyle}
          data-page={pageIndex + 1}
          aria-label={`صفحة ${pageIndex + 1} من ${resolved.length}`}
        >
          {pageIndex > 0 ? <DocRunningHeader model={model} /> : null}
          <div className="doc-page-content">
            {pageItems.map((pageItem) => {
              if (pageItem.repeatedHead && pageItem.tableId) {
                const render = flow.tableHeads[pageItem.tableId];
                return (
                  <div key={pageItem.key} className="doc-flow-item doc-flow-table">
                    {render ? render(pageIndex > 0) : null}
                  </div>
                );
              }
              const item = flow.items.find((entry) => entry.key === pageItem.key);
              return (
                <div
                  key={pageItem.key}
                  className={`doc-flow-item${pageItem.tableId ? ' doc-flow-table' : ''}${
                    item?.inSection ? ' doc-in-section' : ''
                  }`}
                >
                  {nodeByKey.get(pageItem.key)}
                </div>
              );
            })}
          </div>
          <DocFooter model={model} pageNumber={pageIndex + 1} pageCount={resolved.length} />
        </section>
      ))}
    </div>
  );
}

/** هروب بسيط لقيم محدّد CSS (المفاتيح لدينا بسيطة أصلاً). */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}
