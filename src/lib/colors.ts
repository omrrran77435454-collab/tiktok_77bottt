/**
 * أدوات الألوان: تحويل، حساب التباين (WCAG 2.1)، واختيار لون نص مقروء.
 * تُستخدم لضمان ألا ينتج المستخدم مستنداً غير مقروء عند تخصيص الألوان.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export const DEFAULT_PALETTE: Palette = {
  primary: '#11554F',
  secondary: '#648A6D',
  accent: '#B8761C',
  background: '#FDFBF6',
};

export interface PalettePreset {
  id: string;
  nameAr: string;
  palette: Palette;
}

export const PALETTE_PRESETS: PalettePreset[] = [
  { id: 'teal', nameAr: 'أخضر عميق', palette: DEFAULT_PALETTE },
  {
    id: 'sage',
    nameAr: 'أخضر مريمي',
    palette: { primary: '#4F7358', secondary: '#85A98C', accent: '#9A5F12', background: '#F6F8F3' },
  },
  {
    id: 'indigo',
    nameAr: 'أزرق هادئ',
    palette: { primary: '#1F4E79', secondary: '#5B7FA6', accent: '#B8761C', background: '#F7FAFC' },
  },
  {
    id: 'plum',
    nameAr: 'عنّابي',
    palette: { primary: '#6B2B3A', secondary: '#A5636F', accent: '#9A5F12', background: '#FCF7F7' },
  },
  {
    id: 'amber',
    nameAr: 'كهرماني',
    palette: { primary: '#8A5A12', secondary: '#B08A4E', accent: '#11554F', background: '#FEFAF2' },
  },
  {
    id: 'mono',
    nameAr: 'رمادي للطباعة',
    palette: { primary: '#2B2B2B', secondary: '#6E6E6E', accent: '#111111', background: '#FFFFFF' },
  },
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

/** يحوّل أي صيغة HEX مقبولة إلى ‎#RRGGBB‎ بحروف كبيرة. */
export function normalizeHex(value: string): string | null {
  const input = value.trim();
  if (!HEX_RE.test(input)) return null;
  const hex = input.slice(1);
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex;
  return `#${full.toUpperCase()}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** الإضاءة النسبية حسب WCAG 2.1. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** نسبة التباين بين لونين (من 1 إلى 21). */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export const CONTRAST_AA_NORMAL = 4.5;
export const CONTRAST_AA_LARGE = 3;

/**
 * يختار لون نص مقروء فوق خلفية معيّنة.
 * هذه هي "الحماية التلقائية": مهما اختار المستخدم من ألوان،
 * لون النص يُصحَّح تلقائياً بدل إنتاج مستند غير مقروء.
 */
export function readableTextOn(background: string, options?: { dark?: string; light?: string }): string {
  const dark = options?.dark ?? '#16211F';
  const light = options?.light ?? '#FFFFFF';
  return contrastRatio(dark, background) >= contrastRatio(light, background) ? dark : light;
}

/** يفتح أو يغمق لوناً بنسبة (‎-1..1‎) — للحصول على تدرّجات من لون المستخدم. */
export function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = amount >= 0 ? 255 : 0;
  const ratio = Math.abs(amount);
  return rgbToHex({
    r: rgb.r + (target - rgb.r) * ratio,
    g: rgb.g + (target - rgb.g) * ratio,
    b: rgb.b + (target - rgb.b) * ratio,
  });
}

/** يخلط لونين بنسبة معيّنة. */
export function mix(hexA: string, hexB: string, ratio: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA;
  return rgbToHex({
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  });
}

export interface ContrastWarning {
  key: keyof Palette;
  labelAr: string;
  ratio: number;
}

/**
 * يفحص لوحة الألوان ويُرجع تحذيرات التباين الضعيف مقابل الخلفية.
 * لا نمنع المستخدم من الاختيار، لكن نُحذّره بوضوح + نصحّح لون النص تلقائياً.
 */
export function auditPalette(palette: Palette): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];
  const checks: { key: keyof Palette; labelAr: string; minimum: number }[] = [
    { key: 'primary', labelAr: 'اللون الأساسي', minimum: CONTRAST_AA_LARGE },
    { key: 'secondary', labelAr: 'اللون الثانوي', minimum: CONTRAST_AA_LARGE },
    { key: 'accent', labelAr: 'لون التمييز', minimum: CONTRAST_AA_LARGE },
  ];

  for (const check of checks) {
    const ratio = contrastRatio(palette[check.key], palette.background);
    if (ratio < check.minimum) {
      warnings.push({ key: check.key, labelAr: check.labelAr, ratio });
    }
  }
  return warnings;
}

/** يتحقق أن كل ألوان اللوحة صالحة، ويُعيد نسخة مُطبَّعة أو null. */
export function normalizePalette(palette: Partial<Palette> | null | undefined): Palette | null {
  if (!palette) return null;
  const keys: (keyof Palette)[] = ['primary', 'secondary', 'accent', 'background'];
  const result = {} as Palette;
  for (const key of keys) {
    const value = palette[key];
    const normalized = typeof value === 'string' ? normalizeHex(value) : null;
    if (!normalized) return null;
    result[key] = normalized;
  }
  return result;
}
