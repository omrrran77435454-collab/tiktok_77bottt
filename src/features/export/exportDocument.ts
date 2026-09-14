import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../document/types';

/**
 * تصدير المستند إلى PNG / PDF.
 *
 * قرارات مهمة:
 *  1) نصدّر عنصر الصفحة نفسه (‎.doc-page‎) وليس لقطة للصفحة كاملة،
 *     فلا تظهر أي أزرار أو أدوات تحكّم في الملف الناتج.
 *  2) PDF يُبنى من صور عالية الدقة للصفحات، لأن هذه هي الطريقة الوحيدة
 *     التي تضمن تشكيل الحروف العربية واتجاه RTL بشكل صحيح تماماً
 *     (المتصفّح هو من يرسم النص، لا مكتبة PDF).
 *  3) نستورد مكتبات التصدير ديناميكياً حتى لا تُحمَّل مع الصفحة الأولى.
 */

/** مضاعِف الدقة: 3× يعطي ~285dpi وهو مناسب للطباعة. */
const EXPORT_SCALE = 3;

export class ExportError extends Error {
  constructor(message = 'تعذّر إنشاء الملف. حاول مرة أخرى.') {
    super(message);
    this.name = 'ExportError';
  }
}

function getPages(container: HTMLElement): HTMLElement[] {
  const pages = [...container.querySelectorAll<HTMLElement>('.doc-page')];
  if (pages.length === 0) throw new ExportError('لا يوجد مستند جاهز للتصدير.');
  return pages;
}

/** ينتظر جاهزية الخطوط والصور قبل الالتقاط حتى لا تخرج الصورة بخط احتياطي. */
async function waitForAssets(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts) {
    try {
      await fonts.ready;
    } catch {
      /* نتابع حتى لو فشل الانتظار */
    }
  }
  // إطاران للسماح للمتصفح بإنهاء التخطيط والرسم.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function pageToCanvas(page: HTMLElement): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import('html-to-image');
  const background = getComputedStyle(page).backgroundColor || '#ffffff';

  return toCanvas(page, {
    pixelRatio: EXPORT_SCALE,
    width: A4_WIDTH_PX,
    height: Math.max(page.offsetHeight, A4_HEIGHT_PX),
    backgroundColor: background,
    cacheBust: false,
    // نُلغي الظل أثناء الالتقاط حتى لا يظهر إطار رمادي حول الصفحة.
    style: { boxShadow: 'none', margin: '0' },
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // نؤخّر التحرير قليلاً حتى يبدأ المتصفّح التنزيل فعلياً.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new ExportError());
    }, 'image/png');
  });
}

/** تصدير صور PNG عالية الجودة (ملف لكل صفحة). */
export async function exportPng(container: HTMLElement, baseName: string): Promise<number> {
  try {
    const pages = getPages(container);
    await waitForAssets();

    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await pageToCanvas(pages[index]);
      const blob = await canvasToBlob(canvas);
      const suffix = pages.length > 1 ? `-صفحة-${index + 1}` : '';
      downloadBlob(blob, `${baseName}${suffix}.png`);
    }
    return pages.length;
  } catch (error) {
    if (error instanceof ExportError) throw error;
    throw new ExportError();
  }
}

/** تصدير PDF بمقاس A4 وصفحات متعدّدة. */
export async function exportPdf(container: HTMLElement, baseName: string): Promise<number> {
  try {
    const pages = getPages(container);
    await waitForAssets();

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await pageToCanvas(pages[index]);
      const dataUrl = canvas.toDataURL('image/png');
      if (index > 0) pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    }

    pdf.save(`${baseName}.pdf`);
    return pages.length;
  } catch (error) {
    if (error instanceof ExportError) throw error;
    throw new ExportError();
  }
}

/** طباعة المستند — التنسيقات في print.css تُخفي كل عناصر الواجهة. */
export async function printDocument(): Promise<void> {
  await waitForAssets();
  window.print();
}

/** اسم ملف آمن مبني على اسم المستند والتاريخ. */
export function buildFileName(title: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeTitle = title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'مستند';
  return `${safeTitle}-${date}`;
}
