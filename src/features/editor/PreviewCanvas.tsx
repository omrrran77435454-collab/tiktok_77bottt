import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { A4_WIDTH_PX } from '@/features/document/types';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.5;
const STEP = 0.1;

/**
 * منطقة المعاينة مع تكبير/تصغير و«ملء الشاشة».
 *
 * التكبير يتم عبر ‎transform: scale()‎ على غلاف خارجي فقط، ولا يمس أبعاد
 * صفحة A4 نفسها — لذلك لا يؤثر إطلاقاً على ملف التصدير أو الطباعة.
 */
export function PreviewCanvas({
  children,
  toolbarExtra,
}: {
  children: ReactNode;
  toolbarExtra?: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.6);
  const [autoFit, setAutoFit] = useState(true);
  const [stageHeight, setStageHeight] = useState(0);

  const fitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const available = viewport.clientWidth - 24;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, available / A4_WIDTH_PX));
    setZoom(Number(next.toFixed(3)));
  }, []);

  useEffect(() => {
    if (!autoFit) return;
    fitToScreen();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => fitToScreen());
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [autoFit, fitToScreen]);

  // نضبط ارتفاع الحاوية يدوياً لأن transform لا يغيّر المساحة المحجوزة.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => setStageHeight(stage.offsetHeight * zoom);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [zoom, children]);

  const changeZoom = (delta: number) => {
    setAutoFit(false);
    setZoom((current) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
      return Number(next.toFixed(3));
    });
  };

  return (
    <div className="preview">
      <div className="preview-toolbar no-print">
        <div className="row" style={{ gap: 'var(--sp-1)' }}>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => changeZoom(-STEP)}
            aria-label="تصغير المعاينة"
            title="تصغير"
            disabled={zoom <= MIN_ZOOM}
          >
            −
          </button>
          <span className="preview-zoom-value numeric" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => changeZoom(STEP)}
            aria-label="تكبير المعاينة"
            title="تكبير"
            disabled={zoom >= MAX_ZOOM}
          >
            +
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setAutoFit(true);
              fitToScreen();
            }}
          >
            ملء العرض
          </button>
        </div>
        {toolbarExtra}
      </div>

      <div className="preview-viewport" ref={viewportRef}>
        <div className="preview-stage-wrap" style={{ height: stageHeight || undefined }}>
          <div
            className="preview-zoom"
            style={{ transform: `scale(${zoom})`, width: `${A4_WIDTH_PX}px` }}
          >
            <div className="preview-stage" ref={stageRef}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
