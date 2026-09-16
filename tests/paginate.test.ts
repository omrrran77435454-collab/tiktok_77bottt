import { describe, expect, it } from 'vitest';
import { paginateItems, type MeasuredItem } from '@/features/document/paginate';

const PAGE = 1000;

function item(key: string, height: number, extra: Partial<MeasuredItem> = {}): MeasuredItem {
  return { key, height, ...extra };
}

describe('paginateItems', () => {
  it('يضع كل شيء في صفحة واحدة عندما يتّسع', () => {
    const pages = paginateItems({
      items: [item('a', 100), item('b', 200)],
      firstPageHeight: PAGE,
      otherPageHeight: PAGE,
      tableHeadHeights: {},
    });
    expect(pages).toHaveLength(1);
    expect(pages[0].map((entry) => entry.key)).toEqual(['a', 'b']);
  });

  it('ينتقل لصفحة جديدة عند تجاوز الارتفاع', () => {
    const pages = paginateItems({
      items: [item('a', 600), item('b', 600)],
      firstPageHeight: PAGE,
      otherPageHeight: PAGE,
      tableHeadHeights: {},
    });
    expect(pages).toHaveLength(2);
    expect(pages[0].map((entry) => entry.key)).toEqual(['a']);
    expect(pages[1].map((entry) => entry.key)).toEqual(['b']);
  });

  it('يحترم اختلاف ارتفاع الصفحة الأولى عن البقية', () => {
    const pages = paginateItems({
      items: [item('a', 400), item('b', 400), item('c', 400)],
      firstPageHeight: 900,
      otherPageHeight: 500,
      tableHeadHeights: {},
    });
    expect(pages[0].map((entry) => entry.key)).toEqual(['a', 'b']);
    expect(pages[1].map((entry) => entry.key)).toEqual(['c']);
  });

  it('يعيد ترويسة الجدول في كل صفحة يستكمل فيها', () => {
    const rows = Array.from({ length: 6 }, (_, index) => item(`r${index}`, 200, { tableId: 't1' }));
    const pages = paginateItems({
      items: rows,
      firstPageHeight: PAGE,
      otherPageHeight: PAGE,
      tableHeadHeights: { t1: 100 },
    });

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page[0].repeatedHead).toBe(true);
      expect(page[0].tableId).toBe('t1');
    }
    // لا يتكرّر أي صف ولا يضيع أي صف.
    const keys = pages.flat().filter((entry) => !entry.repeatedHead).map((entry) => entry.key);
    expect(keys).toEqual(rows.map((row) => row.key));
  });

  it('لا يتجاوز ارتفاع الصفحة مع احتساب ترويسة الجدول', () => {
    const rows = Array.from({ length: 10 }, (_, index) => item(`r${index}`, 150, { tableId: 't1' }));
    const pages = paginateItems({
      items: rows,
      firstPageHeight: PAGE,
      otherPageHeight: PAGE,
      tableHeadHeights: { t1: 100 },
    });

    for (const page of pages) {
      const height = page.reduce(
        (sum, entry) => sum + (entry.repeatedHead ? 100 : 150),
        0,
      );
      expect(height).toBeLessThanOrEqual(PAGE);
    }
  });

  it('لا يترك عنوان قسم وحيداً في نهاية الصفحة', () => {
    const pages = paginateItems({
      items: [
        item('filler', 800),
        item('title', 60, { keepWithNext: true }),
        item('body', 200),
      ],
      firstPageHeight: PAGE,
      otherPageHeight: PAGE,
      tableHeadHeights: {},
    });

    expect(pages[0].map((entry) => entry.key)).toEqual(['filler']);
    expect(pages[1].map((entry) => entry.key)).toEqual(['title', 'body']);
  });

  it('يضع عنصراً أطول من الصفحة في صفحة مستقلة', () => {
    const pages = paginateItems({
      items: [item('a', 100), item('huge', 1500), item('b', 100)],
      firstPageHeight: PAGE,
      otherPageHeight: PAGE,
      tableHeadHeights: {},
    });
    expect(pages.some((page) => page.length === 1 && page[0].key === 'huge')).toBe(true);
    expect(pages.flat().map((entry) => entry.key)).toEqual(['a', 'huge', 'b']);
  });

  it('يُرجع صفحة واحدة فارغة عند غياب العناصر', () => {
    const pages = paginateItems({
      items: [],
      firstPageHeight: PAGE,
      otherPageHeight: PAGE,
      tableHeadHeights: {},
    });
    expect(pages).toEqual([[]]);
  });

  it('لا يفقد أي عنصر مهما كان العدد', () => {
    const items = Array.from({ length: 200 }, (_, index) => item(`i${index}`, 37));
    const pages = paginateItems({
      items,
      firstPageHeight: PAGE,
      otherPageHeight: PAGE,
      tableHeadHeights: {},
    });
    expect(pages.flat()).toHaveLength(200);
  });
});
