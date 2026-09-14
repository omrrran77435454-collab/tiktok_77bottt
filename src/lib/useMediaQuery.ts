import { useCallback, useSyncExternalStore } from 'react';

/**
 * يتابع استعلام وسائط CSS من داخل React.
 *
 * نحتاجه لتفادي تكرار عناصر تفاعلية في الـ DOM: بدل عرض نسخة للجوال
 * وأخرى للشاشات الكبيرة وإخفاء إحداهما بـ CSS (وهو ما يُنتج تسميات
 * ومحطّات Tab مكرّرة ويربك قارئ الشاشة)، نعرض نسخة واحدة فقط.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
