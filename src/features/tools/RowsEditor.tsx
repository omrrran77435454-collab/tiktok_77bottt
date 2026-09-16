import type { ReactNode } from 'react';

/**
 * محرّر صفوف ديناميكي (إضافة/حذف/ترتيب) يعمل بلا حدّ أقصى للعدد.
 *
 * على الجوال تُعرض كل صفوف البيانات كبطاقات رأسية (لا جدول مضغوط)،
 * وعلى الشاشات الكبيرة تُعرض كجدول. هذا يحلّ مشكلة الجداول على الشاشات الصغيرة
 * بدل إجبار المستخدم على تمرير أفقي مزعج أثناء الإدخال.
 */
export function RowsEditor<T>({
  rows,
  onChange,
  createRow,
  renderRow,
  addLabel,
  emptyLabel,
  maxRows = 200,
}: {
  rows: T[];
  onChange: (next: T[]) => void;
  createRow: () => T;
  renderRow: (row: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel: string;
  emptyLabel: string;
  maxRows?: number;
}) {
  const update = (index: number, patch: Partial<T>) => {
    const next = rows.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(rows.filter((_, position) => position !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = rows.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="rows-editor">
      {rows.length === 0 ? (
        <p className="muted small" style={{ padding: 'var(--sp-4) 0' }}>
          {emptyLabel}
        </p>
      ) : null}

      <ul className="rows-list">
        {rows.map((row, index) => (
          <li className="row-card" key={index}>
            <div className="row-card-head">
              <span className="row-card-index numeric" dir="ltr">
                #{index + 1}
              </span>
              <div className="row-card-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`تحريك الصف ${index + 1} للأعلى`}
                  title="تحريك للأعلى"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label={`تحريك الصف ${index + 1} للأسفل`}
                  title="تحريك للأسفل"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon row-remove"
                  onClick={() => remove(index)}
                  aria-label={`حذف الصف ${index + 1}`}
                  title="حذف"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="row-card-body">
              {renderRow(row, index, (patch) => update(index, patch))}
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn btn-soft btn-block"
        onClick={() => onChange([...rows, createRow()])}
        disabled={rows.length >= maxRows}
      >
        + {addLabel}
      </button>
      {rows.length >= maxRows ? (
        <p className="hint">بلغت الحد الأقصى ({maxRows} صفاً).</p>
      ) : null}
    </div>
  );
}
