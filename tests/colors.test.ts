import { describe, expect, it } from 'vitest';
import {
  CONTRAST_AA_NORMAL,
  DEFAULT_PALETTE,
  auditPalette,
  contrastRatio,
  hexToRgb,
  isValidHex,
  mix,
  normalizeHex,
  normalizePalette,
  readableTextOn,
  relativeLuminance,
  rgbToHex,
  shade,
} from '@/lib/colors';

describe('normalizeHex', () => {
  it('يوحّد الصيغ المختلفة', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('#AABBCC')).toBe('#AABBCC');
    expect(normalizeHex('  #11554f  ')).toBe('#11554F');
  });

  it('يرفض الصيغ غير الصالحة', () => {
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('11554F')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });
});

describe('isValidHex', () => {
  it('يميّز الصالح من غير الصالح', () => {
    expect(isValidHex('#fff')).toBe(true);
    expect(isValidHex('#FFFFFF')).toBe(true);
    expect(isValidHex('rgb(0,0,0)')).toBe(false);
  });
});

describe('hexToRgb / rgbToHex', () => {
  it('يحوّل في الاتجاهين', () => {
    expect(hexToRgb('#FF8000')).toEqual({ r: 255, g: 128, b: 0 });
    expect(rgbToHex({ r: 255, g: 128, b: 0 })).toBe('#FF8000');
  });

  it('يحدّ القيم خارج النطاق', () => {
    expect(rgbToHex({ r: 300, g: -20, b: 128 })).toBe('#FF0080');
  });
});

describe('relativeLuminance & contrastRatio', () => {
  it('الأبيض والأسود يعطيان أقصى تباين', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('التباين متماثل بغضّ النظر عن الترتيب', () => {
    expect(contrastRatio('#11554F', '#FDFBF6')).toBeCloseTo(
      contrastRatio('#FDFBF6', '#11554F'),
      6,
    );
  });

  it('اللون مع نفسه يساوي 1', () => {
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 6);
  });
});

describe('readableTextOn', () => {
  it('يختار نصاً داكناً فوق الخلفيات الفاتحة', () => {
    const text = readableTextOn('#FFFFFF');
    expect(contrastRatio(text, '#FFFFFF')).toBeGreaterThanOrEqual(CONTRAST_AA_NORMAL);
  });

  it('يختار نصاً فاتحاً فوق الخلفيات الداكنة', () => {
    const text = readableTextOn('#11554F');
    expect(text).toBe('#FFFFFF');
    expect(contrastRatio(text, '#11554F')).toBeGreaterThanOrEqual(CONTRAST_AA_NORMAL);
  });

  it('يضمن تبايناً مقبولاً لأي لون تقريباً', () => {
    const samples = ['#000000', '#FFFFFF', '#808080', '#FF0000', '#00FF00', '#123456', '#FDFBF6'];
    for (const background of samples) {
      const text = readableTextOn(background);
      expect(contrastRatio(text, background)).toBeGreaterThan(3);
    }
  });
});

describe('shade & mix', () => {
  it('يفتح ويغمق اللون', () => {
    expect(shade('#808080', 1)).toBe('#FFFFFF');
    expect(shade('#808080', -1)).toBe('#000000');
    expect(shade('#808080', 0)).toBe('#808080');
  });

  it('يخلط لونين بالنسبة المطلوبة', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });
});

describe('auditPalette', () => {
  it('لا تحذيرات على اللوحة الافتراضية', () => {
    expect(auditPalette(DEFAULT_PALETTE)).toEqual([]);
  });

  it('يحذّر عند تباين ضعيف مع الخلفية', () => {
    const warnings = auditPalette({
      primary: '#FAFAFA',
      secondary: '#F8F8F8',
      accent: '#FFFFFF',
      background: '#FFFFFF',
    });
    expect(warnings.length).toBe(3);
    expect(warnings.map((warning) => warning.key)).toEqual(['primary', 'secondary', 'accent']);
  });
});

describe('normalizePalette', () => {
  it('يُطبّع لوحة كاملة', () => {
    expect(
      normalizePalette({
        primary: '#abc',
        secondary: '#11554f',
        accent: '#B8761C',
        background: '#fff',
      }),
    ).toEqual({
      primary: '#AABBCC',
      secondary: '#11554F',
      accent: '#B8761C',
      background: '#FFFFFF',
    });
  });

  it('يرفض اللوحة الناقصة أو غير الصالحة', () => {
    expect(normalizePalette(null)).toBeNull();
    expect(normalizePalette({ primary: '#fff' })).toBeNull();
    expect(
      normalizePalette({
        primary: 'blue',
        secondary: '#fff',
        accent: '#fff',
        background: '#fff',
      }),
    ).toBeNull();
  });
});
