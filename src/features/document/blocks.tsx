import type { ReactNode } from 'react';
import type {
  DocCell,
  DocColumn,
  DocumentModel,
  MetaItem,
  StatItem,
} from './types';
import type { DocTemplate } from './templates';

/* ------------------------------ أدوات مساعدة ------------------------------ */

function columnWidths(columns: DocColumn[]): number[] {
  const weights = columns.map((column) => column.width ?? 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  return weights.map((weight) => (weight / total) * 100);
}

function toneClass(tone?: string): string {
  return tone && tone !== 'default' ? ` doc-tone-${tone}` : '';
}

/** نعرض شرطة بدل فراغ حتى لا تبدو الخانة الفارغة كخطأ طباعة. */
function cellText(value: string): string {
  const trimmed = value?.trim?.() ?? '';
  return trimmed === '' ? '—' : trimmed;
}

/* -------------------------------- الترويسة -------------------------------- */

export function DocHeader({ model, template }: { model: DocumentModel; template: DocTemplate }) {
  const title = (
    <h1 className="doc-title">{model.title}</h1>
  );
  const subtitle = model.subtitle ? <p className="doc-subtitle">{model.subtitle}</p> : null;
  const brand = <span className="doc-brand">أدوات المعلم</span>;

  switch (template.header) {
    case 'banner':
      return (
        <header className="doc-header doc-header-banner">
          <div className="doc-header-bar">
            {brand}
            <span className="doc-header-bar-note">وثيقة تعليمية</span>
          </div>
          <div className="doc-header-body">
            {title}
            {subtitle}
          </div>
        </header>
      );

    case 'minimal':
      return (
        <header className="doc-header doc-header-minimal">
          {brand}
          {title}
          {subtitle}
          <span className="doc-header-rule" />
        </header>
      );

    case 'hero':
      return (
        <header className="doc-header doc-header-hero">
          <div className="doc-hero-box">
            <span className="doc-hero-eyebrow">{brand}</span>
            {title}
            {subtitle}
          </div>
        </header>
      );

    case 'academic':
      return (
        <header className="doc-header doc-header-academic">
          <span className="doc-academic-brand">{brand}</span>
          <span className="doc-academic-line" />
          {title}
          {subtitle}
          <span className="doc-academic-line doc-academic-line-thin" />
        </header>
      );

    case 'sidebar':
      return (
        <header className="doc-header doc-header-sidebar">
          <span className="doc-sidebar-strip" aria-hidden="true" />
          <div className="doc-sidebar-body">
            {brand}
            {title}
            {subtitle}
          </div>
        </header>
      );

    case 'plain':
      return (
        <header className="doc-header doc-header-plain">
          <div className="doc-plain-top">
            {brand}
            <span className="doc-plain-note">نسخة للطباعة</span>
          </div>
          {title}
          {subtitle}
        </header>
      );

    case 'premium':
    default:
      return (
        <header className="doc-header doc-header-premium">
          <div className="doc-premium-band">
            <span className="doc-premium-brand">{brand}</span>
          </div>
          <div className="doc-premium-body">
            {title}
            {subtitle}
            <span className="doc-premium-underline" aria-hidden="true" />
          </div>
        </header>
      );
  }
}

export function DocRunningHeader({ model }: { model: DocumentModel }) {
  return (
    <div className="doc-running-header">
      <span className="doc-running-title">{model.title}</span>
      <span className="doc-running-brand">أدوات المعلم</span>
    </div>
  );
}

export function DocFooter({
  model,
  pageNumber,
  pageCount,
}: {
  model: DocumentModel;
  pageNumber: number;
  pageCount: number;
}) {
  return (
    <div className="doc-footer">
      <span className="doc-footer-note">{model.footerNote ?? 'معاً… نصنع فرقاً'}</span>
      <span className="doc-footer-page numeric">
        صفحة {pageNumber} من {pageCount}
      </span>
    </div>
  );
}

/* ------------------------------ بيانات الترويسة ---------------------------- */

export function MetaBlock({ items, template }: { items: MetaItem[]; template: DocTemplate }) {
  if (items.length === 0) return null;

  switch (template.meta) {
    case 'chips':
      return (
        <div className="doc-meta doc-meta-chips">
          {items.map((item) => (
            <span key={item.label} className="doc-chip">
              <span className="doc-chip-label">{item.label}</span>
              <span className="doc-chip-value">{cellText(item.value)}</span>
            </span>
          ))}
        </div>
      );

    case 'grid':
      return (
        <div className="doc-meta doc-meta-grid">
          {items.map((item) => (
            <div key={item.label} className="doc-meta-card">
              <span className="doc-meta-label">{item.label}</span>
              <span className="doc-meta-value">{cellText(item.value)}</span>
            </div>
          ))}
        </div>
      );

    case 'boxed':
      return (
        <div className="doc-meta doc-meta-boxed">
          {items.map((item) => (
            <div key={item.label} className="doc-meta-boxed-row">
              <span className="doc-meta-label">{item.label}</span>
              <span className="doc-meta-dots" aria-hidden="true" />
              <span className="doc-meta-value">{cellText(item.value)}</span>
            </div>
          ))}
        </div>
      );

    case 'stacked':
      return (
        <div className="doc-meta doc-meta-stacked">
          {items.map((item) => (
            <div key={item.label} className="doc-meta-stack-item">
              <span className="doc-meta-label">{item.label}</span>
              <span className="doc-meta-value">{cellText(item.value)}</span>
            </div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className="doc-meta doc-meta-table">
          {items.map((item) => (
            <div key={item.label} className="doc-meta-table-cell">
              <span className="doc-meta-label">{item.label}</span>
              <span className="doc-meta-value">{cellText(item.value)}</span>
            </div>
          ))}
        </div>
      );

    case 'pills':
      return (
        <div className="doc-meta doc-meta-pills">
          {items.map((item) => (
            <span key={item.label} className="doc-pill">
              <span className="doc-pill-label">{item.label}</span>
              <span className="doc-pill-value">{cellText(item.value)}</span>
            </span>
          ))}
        </div>
      );

    case 'inline':
    default:
      return (
        <div className="doc-meta doc-meta-inline">
          {items.map((item) => (
            <span key={item.label} className="doc-meta-inline-item">
              <span className="doc-meta-label">{item.label}:</span>{' '}
              <span className="doc-meta-value">{cellText(item.value)}</span>
            </span>
          ))}
        </div>
      );
  }
}

/* --------------------------------- الأرقام -------------------------------- */

export function StatsBlock({ items }: { items: StatItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="doc-stats" data-count={items.length}>
      {items.map((item) => (
        <div key={item.label} className={`doc-stat${toneClass(item.tone)}`}>
          <span className="doc-stat-value numeric">{item.value}</span>
          <span className="doc-stat-label">{item.label}</span>
          {item.hint ? <span className="doc-stat-hint">{item.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- الجداول -------------------------------- */

export function TableHead({
  columns,
  title,
  template,
  repeated,
}: {
  columns: DocColumn[];
  title?: string;
  template: DocTemplate;
  repeated?: boolean;
}) {
  const widths = columnWidths(columns);
  const heading = title ? (
    <div className="doc-table-title">
      {title}
      {repeated ? <span className="doc-table-cont"> (تابع)</span> : null}
    </div>
  ) : null;

  if (template.table === 'cards') {
    // في قالب البطاقات لا توجد ترويسة جدول — كل بطاقة تحمل أسماء الحقول.
    return <div className="doc-table-head doc-table-head-cards">{heading}</div>;
  }

  return (
    <div className="doc-table-head">
      {heading}
      <div className="doc-row doc-row-head" role="row">
        {columns.map((column, index) => (
          <div
            key={column.key}
            className="doc-cell doc-cell-head"
            role="columnheader"
            style={{ flexBasis: `${widths[index]}%`, textAlign: column.align ?? 'start' }}
          >
            {column.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableRow({
  columns,
  cells,
  index,
  template,
}: {
  columns: DocColumn[];
  cells: DocCell[];
  index: number;
  template: DocTemplate;
}) {
  const widths = columnWidths(columns);

  if (template.table === 'cards') {
    return (
      <div className="doc-card-row">
        <span className="doc-card-index numeric">{index + 1}</span>
        <div className="doc-card-fields">
          {columns.map((column, columnIndex) => {
            const cell = cells[columnIndex];
            if (!cell) return null;
            return (
              <div key={column.key} className={`doc-card-field${toneClass(cell.tone)}`}>
                <span className="doc-card-label">{column.label}</span>
                <span className="doc-card-value">{cellText(cell.text)}</span>
                {cell.hint ? <span className="doc-card-hint">{cell.hint}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`doc-row doc-row-body${index % 2 === 1 ? ' doc-row-odd' : ''}`} role="row">
      {columns.map((column, columnIndex) => {
        const cell = cells[columnIndex];
        return (
          <div
            key={column.key}
            className={`doc-cell${toneClass(cell?.tone)}`}
            role="cell"
            style={{
              flexBasis: `${widths[columnIndex]}%`,
              textAlign: cell?.align ?? column.align ?? 'start',
            }}
          >
            <span className="doc-cell-text">{cellText(cell?.text ?? '')}</span>
            {cell?.hint ? <span className="doc-cell-hint">{cell.hint}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export function TableEmptyRow({ text }: { text: string }) {
  return <div className="doc-row doc-row-empty">{text}</div>;
}

/* ------------------------------- كتل أخرى -------------------------------- */

export function SectionTitle({
  title,
  subtitle,
  index,
  template,
}: {
  title: string;
  subtitle?: string;
  index: number;
  template: DocTemplate;
}) {
  return (
    <div className="doc-section-title">
      {template.section === 'numbered' ? (
        <span className="doc-section-number numeric">{index}.</span>
      ) : null}
      <span className="doc-section-text">
        <span className="doc-section-heading">{title}</span>
        {subtitle ? <span className="doc-section-sub">{subtitle}</span> : null}
      </span>
    </div>
  );
}

export function ListBlock({
  title,
  items,
  ordered,
}: {
  title?: string;
  items: string[];
  ordered?: boolean;
}) {
  if (items.length === 0) return null;
  const List = ordered ? 'ol' : 'ul';
  return (
    <div className="doc-list-block">
      {title ? <div className="doc-block-title">{title}</div> : null}
      <List className={`doc-list${ordered ? ' doc-list-ordered' : ''}`}>
        {items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 12)}`} className="doc-list-item">
            {item}
          </li>
        ))}
      </List>
    </div>
  );
}

export function KeyValueBlock({ title, items }: { title?: string; items: MetaItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="doc-kv-block">
      {title ? <div className="doc-block-title">{title}</div> : null}
      <div className="doc-kv-list">
        {items.map((item) => (
          <div key={item.label} className="doc-kv-row">
            <span className="doc-kv-label">{item.label}</span>
            <span className="doc-kv-value">{cellText(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NoteBlock({
  title,
  text,
  tone,
}: {
  title?: string;
  text: string;
  tone?: 'info' | 'accent' | 'plain';
}) {
  return (
    <div className={`doc-note doc-note-${tone ?? 'info'}`}>
      {title ? <span className="doc-note-title">{title}</span> : null}
      <span className="doc-note-text">{text}</span>
    </div>
  );
}

export type { ReactNode };
