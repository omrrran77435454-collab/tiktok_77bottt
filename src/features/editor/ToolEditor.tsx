import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnyToolDefinition } from '@/features/tools/types';
import { DocumentPages } from '@/features/document/DocumentPages';
import { DEFAULT_TEMPLATE_ID, DOC_TEMPLATES } from '@/features/document/templates';
import { TemplatePicker } from './TemplatePicker';
import { ColorPanel } from './ColorPanel';
import { PreviewCanvas } from './PreviewCanvas';
import { DEFAULT_PALETTE, normalizePalette, type Palette } from '@/lib/colors';
import { clearToolData, loadLocal, saveLocal, storageAvailable, toolStorageKey } from '@/lib/storage';
import { trackEvent } from '@/lib/analytics';
import { apiPost } from '@/lib/api';
import { Alert } from '@/components/ui';
import { buildFileName, exportPdf, exportPng, printDocument } from '@/features/export/exportDocument';
import { useSession } from '@/lib/useSession';
import { useMediaQuery } from '@/lib/useMediaQuery';

type MobileTab = 'form' | 'preview';
type ExportState = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'error'; message: string } | { kind: 'done'; message: string };

const AUTOSAVE_DELAY_MS = 600;

export function ToolEditor({ tool }: { tool: AnyToolDefinition }) {
  const { data: session, setData: setSession } = useSession();
  const storageKey = toolStorageKey(tool.id);

  // بيانات الأداة تُحمَّل من الجهاز فقط ولا تُرسل إلى الخادم إطلاقاً.
  const [data, setData] = useState<unknown>(() => loadLocal(storageKey, tool.createEmptyData()));
  const [templateId, setTemplateId] = useState<string>(
    () => session?.preferences?.defaultTemplateId ?? loadLocal('template', DEFAULT_TEMPLATE_ID),
  );
  const [palette, setPalette] = useState<Palette>(() => {
    const fromServer = session?.preferences
      ? normalizePalette({
          primary: session.preferences.primaryColor,
          secondary: session.preferences.secondaryColor,
          accent: session.preferences.accentColor,
          background: session.preferences.backgroundColor,
        })
      : null;
    return fromServer ?? normalizePalette(loadLocal('palette', null)) ?? { ...DEFAULT_PALETTE };
  });

  // نقطة التحوّل نفسها المستخدمة في CSS (layout.css) — نسخة واحدة فقط من
  // لوحة القالب والألوان في الـ DOM بدل نسختين إحداهما مخفية.
  const isWide = useMediaQuery('(min-width: 1100px)');
  const [mobileTab, setMobileTab] = useState<MobileTab>('form');
  const [exportState, setExportState] = useState<ExportState>({ kind: 'idle' });
  const [panelOpen, setPanelOpen] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent({ eventType: 'tool_opened', toolId: tool.id });
  }, [tool.id]);

  // حفظ محلي تلقائي مع تأخير بسيط حتى لا نكتب عند كل ضغطة مفتاح.
  useEffect(() => {
    const timer = setTimeout(() => saveLocal(storageKey, data), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data, storageKey]);

  const persistPreferences = useCallback(
    (nextTemplateId: string, nextPalette: Palette) => {
      saveLocal('template', nextTemplateId);
      saveLocal('palette', nextPalette);
      const preferences = {
        defaultTemplateId: nextTemplateId,
        primaryColor: nextPalette.primary,
        secondaryColor: nextPalette.secondary,
        accentColor: nextPalette.accent,
        backgroundColor: nextPalette.background,
      };
      // التفضيلات (قالب وألوان) فقط — لا يُرسل أي محتوى مستند.
      void apiPost('/api/me/preferences', preferences).catch(() => undefined);
      if (session) setSession({ ...session, preferences });
    },
    [session, setSession],
  );

  const preferencesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (preferencesTimer.current) clearTimeout(preferencesTimer.current);
    preferencesTimer.current = setTimeout(() => persistPreferences(templateId, palette), 1200);
    return () => {
      if (preferencesTimer.current) clearTimeout(preferencesTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, palette]);

  const model = useMemo(() => tool.buildDocument(data as never), [tool, data]);
  const fileName = useMemo(() => buildFileName(model.title), [model.title]);

  const handleTemplateChange = (nextId: string) => {
    setTemplateId(nextId);
    trackEvent({ eventType: 'template_selected', toolId: tool.id, templateId: nextId });
  };

  const runExport = async (
    kind: 'pdf' | 'png' | 'print',
  ): Promise<void> => {
    const container = documentRef.current;
    if (!container) return;

    const labels = { pdf: 'جارٍ إنشاء ملف PDF…', png: 'جارٍ إنشاء صورة PNG…', print: 'جارٍ التجهيز للطباعة…' };
    setExportState({ kind: 'busy', label: labels[kind] });

    try {
      if (kind === 'pdf') {
        const pages = await exportPdf(container, fileName);
        setExportState({ kind: 'done', message: `تم إنشاء ملف PDF (${pages} صفحة).` });
      } else if (kind === 'png') {
        const pages = await exportPng(container, fileName);
        setExportState({
          kind: 'done',
          message: pages > 1 ? `تم تنزيل ${pages} صور — صورة لكل صفحة.` : 'تم تنزيل الصورة.',
        });
      } else {
        await printDocument();
        setExportState({ kind: 'idle' });
      }

      trackEvent({
        eventType: kind === 'pdf' ? 'export_pdf' : kind === 'png' ? 'export_png' : 'print',
        toolId: tool.id,
        templateId,
        primaryColor: palette.primary,
      });
    } catch {
      setExportState({ kind: 'error', message: 'تعذّر إنشاء الملف. حاول مرة ثانية.' });
    }
  };

  const handleClearData = () => {
    const confirmed = window.confirm(
      'سيتم مسح بيانات هذه الأداة من جهازك نهائياً. هل تريد المتابعة؟',
    );
    if (!confirmed) return;
    clearToolData(tool.id);
    setData(tool.createEmptyData());
  };

  const ToolForm = tool.Form;

  const formPanel = (
    <div className="stack-lg">
      <div className="card">
        <div className="card-head">
          <h2 className="title-sm">بيانات الأداة</h2>
          <div className="row" style={{ gap: 'var(--sp-2)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setData(tool.createSampleData())}
            >
              بيانات نموذجية
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleClearData}>
              مسح بيانات الأداة
            </button>
          </div>
        </div>

        <Alert tone="info" title="بياناتك تبقى على جهازك">
          {storageAvailable
            ? 'يتم الحفظ تلقائياً في متصفّحك فقط. لا تُرسل أسماء الطلاب ولا درجاتهم إلى أي خادم.'
            : 'متصفّحك يمنع الحفظ المحلي، لذلك لن تُحفظ البيانات عند إغلاق الصفحة. بياناتك تبقى على جهازك في كل الأحوال.'}
        </Alert>

        <div style={{ marginBlockStart: 'var(--sp-5)' }}>
          <ToolForm data={data as never} onChange={(next) => setData(next)} />
        </div>
      </div>
    </div>
  );

  const previewPanel = (
    <div className="stack">
      <PreviewCanvas
        toolbarExtra={
          <div className="row no-print" style={{ gap: 'var(--sp-2)' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void runExport('pdf')}
              disabled={exportState.kind === 'busy'}
            >
              PDF
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void runExport('png')}
              disabled={exportState.kind === 'busy'}
            >
              PNG
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void runExport('print')}
              disabled={exportState.kind === 'busy'}
            >
              طباعة
            </button>
          </div>
        }
      >
        <DocumentPages
          model={model}
          templateId={templateId}
          palette={palette}
          containerRef={documentRef}
        />
      </PreviewCanvas>

      {exportState.kind === 'busy' ? (
        <div className="no-print">
          <Alert tone="info">{exportState.label}</Alert>
        </div>
      ) : null}
      {exportState.kind === 'error' ? (
        <div className="no-print">
          <Alert tone="error" title="تعذّر التصدير">
            {exportState.message}
          </Alert>
        </div>
      ) : null}
      {exportState.kind === 'done' ? (
        <div className="no-print">
          <Alert tone="success">{exportState.message}</Alert>
        </div>
      ) : null}
    </div>
  );

  const designPanel = (
    <div className="stack-lg">
      <div className="card">
        <h2 className="title-sm" style={{ marginBlockEnd: 'var(--sp-4)' }}>
          القوالب
        </h2>
        <TemplatePicker value={templateId} onChange={handleTemplateChange} palette={palette} />
      </div>
      <div className="card">
        <h2 className="title-sm" style={{ marginBlockEnd: 'var(--sp-4)' }}>
          تخصيص الألوان
        </h2>
        <ColorPanel palette={palette} onChange={setPalette} />
      </div>
    </div>
  );

  return (
    <div className="tool-editor">
      <div className="tool-tabs no-print" role="tablist" aria-label="أقسام الأداة">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'form'}
          className={`tool-tab${mobileTab === 'form' ? ' is-active' : ''}`}
          onClick={() => setMobileTab('form')}
        >
          البيانات
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'preview'}
          className={`tool-tab${mobileTab === 'preview' ? ' is-active' : ''}`}
          onClick={() => setMobileTab('preview')}
        >
          المعاينة والتصدير
        </button>
      </div>

      <div className="tool-layout">
        <div
          className={`tool-col tool-col-form${mobileTab === 'form' ? ' is-visible' : ''}`}
          role="tabpanel"
        >
          {formPanel}
        </div>

        <div
          className={`tool-col tool-col-preview${mobileTab === 'preview' ? ' is-visible' : ''}`}
          role="tabpanel"
        >
          {isWide ? (
            <div className="design-panel-desktop no-print">{designPanel}</div>
          ) : (
            <div className="design-panel no-print">
              <button
                type="button"
                className="design-panel-toggle"
                aria-expanded={panelOpen}
                onClick={() => setPanelOpen((open) => !open)}
              >
                <span>القالب والألوان</span>
                <span aria-hidden="true">{panelOpen ? '▲' : '▼'}</span>
              </button>
              <div className={`design-panel-body${panelOpen ? ' is-open' : ''}`}>{designPanel}</div>
            </div>
          )}

          {previewPanel}
        </div>
      </div>

      <p className="hint no-print" style={{ marginBlockStart: 'var(--sp-6)', textAlign: 'center' }}>
        القالب الحالي: {DOC_TEMPLATES.find((template) => template.id === templateId)?.nameAr}
      </p>
    </div>
  );
}
