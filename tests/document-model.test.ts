import { describe, expect, it } from 'vitest';
import { TOOLS, getToolBySlug } from '@/features/tools/registry';
import { DOC_TEMPLATES, getTemplate } from '@/features/document/templates';
import { buildDocumentVars } from '@/features/document/theme';
import { DEFAULT_PALETTE, contrastRatio } from '@/lib/colors';
import type { DocBlock, DocumentModel } from '@/features/document/types';

function countTables(blocks: DocBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.kind === 'table') return total + 1;
    if (block.kind === 'section') return total + countTables(block.blocks);
    return total;
  }, 0);
}

function allTables(blocks: DocBlock[]): Extract<DocBlock, { kind: 'table' }>[] {
  return blocks.flatMap((block) => {
    if (block.kind === 'table') return [block];
    if (block.kind === 'section') return allTables(block.blocks);
    return [];
  });
}

describe('سجل الأدوات', () => {
  it('يسجّل كل الأدوات المنفَّذة بمعرّفات فريدة', () => {
    const ids = TOOLS.map((tool) => tool.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'student-followup',
        'error-map',
        'absence-plan',
        'student-schedule',
        'study-plan',
        'homework-organizer',
        'exam-prep',
      ]),
    );
    // لا معرّف مكرّر: التكرار يكسر التوجيه والحفظ المحلي معاً.
    expect(new Set(ids).size).toBe(TOOLS.length);
    expect(ids).toEqual(expect.arrayContaining(['student-followup', 'error-map', 'absence-plan']));
  });

  it('يجد الأداة بالـ slug ويُرجع null لغير الموجود', () => {
    expect(getToolBySlug('error-map')?.id).toBe('error-map');
    expect(getToolBySlug('nope')).toBeNull();
    expect(getToolBySlug(undefined)).toBeNull();
  });
});

describe.each(TOOLS.map((tool) => [tool.nameAr, tool] as const))('أداة %s', (_name, tool) => {
  it('تبني مستنداً صالحاً من البيانات الفارغة', () => {
    const model: DocumentModel = tool.buildDocument(tool.createEmptyData() as never);
    expect(model.title.length).toBeGreaterThan(0);
    expect(model.toolId).toBe(tool.id);
    expect(model.blocks.length).toBeGreaterThan(0);
    expect(countTables(model.blocks)).toBeGreaterThan(0);
  });

  it('تبني مستنداً من البيانات النموذجية بصفوف فعلية', () => {
    const model = tool.buildDocument(tool.createSampleData() as never);
    const tables = allTables(model.blocks);
    expect(tables.some((table) => table.rows.length > 0)).toBe(true);
  });

  it('كل صف يطابق عدد أعمدة جدوله', () => {
    const model = tool.buildDocument(tool.createSampleData() as never);
    for (const table of allTables(model.blocks)) {
      for (const row of table.rows) {
        expect(row).toHaveLength(table.columns.length);
      }
    }
  });

  it('كل جدول فارغ يحمل نصاً بديلاً واضحاً', () => {
    const model = tool.buildDocument(tool.createEmptyData() as never);
    for (const table of allTables(model.blocks)) {
      if (table.rows.length === 0) {
        expect(table.emptyText ?? '').not.toBe('');
      }
    }
  });

  it('لا تنهار مع بيانات ضخمة (نصوص طويلة جداً)', () => {
    const data = tool.createSampleData() as Record<string, unknown>;
    const longText = 'مهارة '.repeat(300);
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'string') data[key] = longText;
    }
    expect(() => tool.buildDocument(data as never)).not.toThrow();
  });
});

describe('القوالب', () => {
  it('سبعة قوالب بمعرّفات وأسماء فريدة', () => {
    expect(DOC_TEMPLATES).toHaveLength(7);
    expect(new Set(DOC_TEMPLATES.map((template) => template.id)).size).toBe(7);
    expect(new Set(DOC_TEMPLATES.map((template) => template.nameAr)).size).toBe(7);
    expect(new Set(DOC_TEMPLATES.map((template) => template.className)).size).toBe(7);
  });

  it('القوالب تختلف فعلياً في البنية لا في الألوان فقط', () => {
    expect(new Set(DOC_TEMPLATES.map((template) => template.header)).size).toBe(7);
    expect(new Set(DOC_TEMPLATES.map((template) => template.table)).size).toBe(7);
    expect(new Set(DOC_TEMPLATES.map((template) => template.meta)).size).toBe(7);
    expect(new Set(DOC_TEMPLATES.map((template) => template.section)).size).toBe(7);
    // سلالم مسافات مختلفة أيضاً
    expect(new Set(DOC_TEMPLATES.map((template) => template.metrics.gap)).size).toBeGreaterThan(3);
  });

  it('getTemplate يرجع الافتراضي لأي معرّف غير معروف', () => {
    expect(getTemplate('nope').id).toBe(DOC_TEMPLATES[0].id);
    expect(getTemplate(null).id).toBe(DOC_TEMPLATES[0].id);
    expect(getTemplate('academic').id).toBe('academic');
  });
});

describe('متغيّرات ألوان المستند', () => {
  it('لون النص فوق اللون الأساسي مقروء دائماً', () => {
    const risky = [
      { ...DEFAULT_PALETTE, primary: '#FFFF00' },
      { ...DEFAULT_PALETTE, primary: '#000000' },
      { ...DEFAULT_PALETTE, primary: '#FFFFFF' },
      { ...DEFAULT_PALETTE, primary: '#7F7F7F' },
    ];
    for (const palette of risky) {
      const vars = buildDocumentVars(palette, getTemplate('formal')) as Record<string, string>;
      expect(contrastRatio(vars['--doc-on-primary'], vars['--doc-primary'])).toBeGreaterThan(3);
      expect(contrastRatio(vars['--doc-text'], vars['--doc-bg'])).toBeGreaterThan(4.5);
    }
  });

  it('القالب الأحادي يتجاهل ألوان المستخدم', () => {
    const vars = buildDocumentVars(
      { primary: '#FF0000', secondary: '#00FF00', accent: '#0000FF', background: '#FFEEDD' },
      getTemplate('bw-print'),
    ) as Record<string, string>;
    expect(vars['--doc-bg']).toBe('#FFFFFF');
    expect(vars['--doc-primary']).toBe('#1F1F1F');
  });

  it('يضبط مقاييس القالب في المتغيّرات', () => {
    const template = getTemplate('minimal-ivory');
    const vars = buildDocumentVars(DEFAULT_PALETTE, template) as Record<string, string>;
    expect(vars['--doc-pad-block']).toBe(`${template.metrics.paddingBlock}px`);
    expect(vars['--doc-gap']).toBe(`${template.metrics.gap}px`);
  });
});
