import { useId } from 'react';
import {
  CONTRAST_AA_LARGE,
  DEFAULT_PALETTE,
  PALETTE_PRESETS,
  auditPalette,
  normalizeHex,
  type Palette,
} from '@/lib/colors';
import { Alert } from '@/components/ui';

const COLOR_FIELDS: { key: keyof Palette; label: string }[] = [
  { key: 'primary', label: 'اللون الأساسي' },
  { key: 'secondary', label: 'اللون الثانوي' },
  { key: 'accent', label: 'لون التمييز' },
  { key: 'background', label: 'لون الخلفية' },
];

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="color-row">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="color-row-controls">
        <input
          id={id}
          type="color"
          className="color-swatch"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <input
          type="text"
          className="input color-hex"
          value={value}
          inputMode="text"
          spellCheck={false}
          // قيمة HEX تُقرأ من اليسار لليمين دائماً، حتى داخل واجهة RTL.
          dir="ltr"
          aria-label={`${label} بصيغة HEX`}
          onChange={(event) => {
            const normalized = normalizeHex(event.target.value);
            onChange(normalized ?? event.target.value.toUpperCase());
          }}
        />
      </div>
    </div>
  );
}

export function ColorPanel({
  palette,
  onChange,
}: {
  palette: Palette;
  onChange: (next: Palette) => void;
}) {
  const warnings = auditPalette(palette);

  return (
    <div className="stack">
      <div className="preset-row">
        {PALETTE_PRESETS.map((preset) => {
          const active =
            preset.palette.primary === palette.primary &&
            preset.palette.background === palette.background;
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-chip${active ? ' is-active' : ''}`}
              onClick={() => onChange({ ...preset.palette })}
              title={preset.nameAr}
              aria-pressed={active}
            >
              <span
                className="preset-dot"
                style={{ background: preset.palette.primary }}
                aria-hidden="true"
              />
              <span
                className="preset-dot"
                style={{ background: preset.palette.secondary }}
                aria-hidden="true"
              />
              <span
                className="preset-dot"
                style={{ background: preset.palette.accent }}
                aria-hidden="true"
              />
              <span className="preset-name">{preset.nameAr}</span>
            </button>
          );
        })}
      </div>

      <div className="color-grid">
        {COLOR_FIELDS.map((field) => (
          <ColorRow
            key={field.key}
            label={field.label}
            value={palette[field.key]}
            onChange={(value) => onChange({ ...palette, [field.key]: value })}
          />
        ))}
      </div>

      {warnings.length > 0 ? (
        <Alert tone="warn" title="تنبيه تباين">
          {warnings.map((warning) => warning.labelAr).join('، ')} — التباين مع الخلفية ضعيف (أقل من{' '}
          {CONTRAST_AA_LARGE}:1). المستند سيبقى مقروءاً لأن ألوان النصوص تُصحَّح تلقائياً، لكن
          يُفضَّل اختيار لون أغمق أو خلفية أفتح.
        </Alert>
      ) : null}

      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange({ ...DEFAULT_PALETTE })}>
        إعادة الألوان الافتراضية
      </button>
    </div>
  );
}
