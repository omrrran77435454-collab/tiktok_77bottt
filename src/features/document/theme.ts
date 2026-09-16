import type { CSSProperties } from 'react';
import { mix, readableTextOn, type Palette } from '@/lib/colors';
import type { DocTemplate } from './templates';

/** لوحة رمادية ثابتة للقالب الاقتصادي (أبيض وأسود). */
const MONOCHROME: Palette = {
  primary: '#1F1F1F',
  secondary: '#5A5A5A',
  accent: '#000000',
  background: '#FFFFFF',
};

/** ألوان دلالية ثابتة (جيد/تحذير/خطر) لا تتأثر باختيار المستخدم. */
const SEMANTIC = {
  good: '#1E7A4D',
  warn: '#9A6212',
  bad: '#A33A33',
};

/**
 * يحوّل لوحة ألوان المستخدم إلى متغيّرات CSS للمستند.
 *
 * نقطة مهمة: ألوان النصوص فوق الخلفيات الملوّنة تُحسب تلقائياً
 * (readableTextOn) بدل افتراض الأبيض دائماً — فلا ينتج مستند غير مقروء
 * مهما كانت ألوان المستخدم.
 */
export function buildDocumentVars(palette: Palette, template: DocTemplate): CSSProperties {
  const source = template.monochrome ? MONOCHROME : palette;
  const bg = source.background;
  const text = readableTextOn(bg, { dark: '#16211F', light: '#FFFFFF' });

  const vars: Record<string, string> = {
    '--doc-bg': bg,
    '--doc-text': text,
    '--doc-muted': mix(text, bg, 0.42),
    '--doc-faint': mix(text, bg, 0.6),
    '--doc-border': mix(text, bg, 0.8),
    '--doc-border-strong': mix(text, bg, 0.62),
    '--doc-surface': mix(bg, text, 0.02),
    '--doc-surface-alt': mix(bg, text, 0.05),

    '--doc-primary': source.primary,
    '--doc-on-primary': readableTextOn(source.primary),
    '--doc-primary-soft': mix(source.primary, bg, 0.86),
    '--doc-primary-tint': mix(source.primary, bg, 0.93),
    '--doc-primary-strong': mix(source.primary, '#000000', 0.18),

    '--doc-secondary': source.secondary,
    '--doc-on-secondary': readableTextOn(source.secondary),
    '--doc-secondary-soft': mix(source.secondary, bg, 0.86),
    '--doc-secondary-tint': mix(source.secondary, bg, 0.93),

    '--doc-accent': source.accent,
    '--doc-on-accent': readableTextOn(source.accent),
    '--doc-accent-soft': mix(source.accent, bg, 0.85),

    '--doc-good': SEMANTIC.good,
    '--doc-good-soft': mix(SEMANTIC.good, bg, 0.86),
    '--doc-warn': SEMANTIC.warn,
    '--doc-warn-soft': mix(SEMANTIC.warn, bg, 0.86),
    '--doc-bad': SEMANTIC.bad,
    '--doc-bad-soft': mix(SEMANTIC.bad, bg, 0.86),

    '--doc-pad-block': `${template.metrics.paddingBlock}px`,
    '--doc-pad-inline': `${template.metrics.paddingInline}px`,
    '--doc-gap': `${template.metrics.gap}px`,
    '--doc-font': template.fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)',
  };

  return vars as CSSProperties;
}
