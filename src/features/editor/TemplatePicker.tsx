import { DOC_TEMPLATES, type DocTemplate } from '@/features/document/templates';
import type { Palette } from '@/lib/colors';
import { buildDocumentVars } from '@/features/document/theme';

/**
 * مصغّرات القوالب السبعة.
 * كل مصغّر يرسم تخطيط القالب تخطيطياً (شكل الترويسة ونمط الجدول)
 * بألوان المستخدم الحالية، حتى يرى المعلم الفرق قبل الاختيار.
 */
function Thumbnail({ template }: { template: DocTemplate }) {
  const header = (() => {
    switch (template.header) {
      case 'banner':
        return <span className="tb-bar" />;
      case 'minimal':
        return <span className="tb-line tb-line-short" />;
      case 'hero':
        return <span className="tb-hero" />;
      case 'academic':
        return <span className="tb-center" />;
      case 'sidebar':
        return <span className="tb-side" />;
      case 'plain':
        return <span className="tb-plain" />;
      default:
        return <span className="tb-gradient" />;
    }
  })();

  const body = (() => {
    if (template.table === 'cards') {
      return (
        <span className="tb-cards">
          <span />
          <span />
          <span />
        </span>
      );
    }
    return (
      <span className={`tb-table tb-table-${template.table}`}>
        <span className="tb-thead" />
        <span className="tb-trow" />
        <span className="tb-trow" />
        <span className="tb-trow" />
      </span>
    );
  })();

  return (
    <span className={`tpl-thumb-inner ${template.className}`} aria-hidden="true">
      {header}
      <span className="tb-meta">
        <span />
        <span />
        <span />
      </span>
      {body}
    </span>
  );
}

export function TemplatePicker({
  value,
  onChange,
  palette,
}: {
  value: string;
  onChange: (templateId: string) => void;
  palette: Palette;
}) {
  return (
    <div>
      <div className="tpl-grid" role="radiogroup" aria-label="اختيار قالب المستند">
        {DOC_TEMPLATES.map((template, index) => {
          const selected = template.id === value;
          return (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`tpl-thumb${selected ? ' is-selected' : ''}`}
              onClick={() => onChange(template.id)}
              title={`${template.nameAr} — ${template.descriptionAr}`}
              style={buildDocumentVars(palette, template)}
            >
              <span className="tpl-thumb-index numeric">{index + 1}</span>
              <Thumbnail template={template} />
              <span className="tpl-thumb-name">{template.nameAr}</span>
            </button>
          );
        })}
      </div>
      <p className="hint" style={{ marginBlockStart: 'var(--sp-3)' }}>
        {DOC_TEMPLATES.find((template) => template.id === value)?.descriptionAr}
      </p>
    </div>
  );
}
