import { useEffect, useState } from 'react';
import { apiFetch } from './api';
import { EMPTY_CATALOG } from './education';
import type { CatalogResponse } from '@shared/types';

/**
 * الكتالوج المرجعي (مراحل، صفوف، مسارات، مواد، أقسام).
 *
 * يتغيّر نادراً جداً، لذلك نحتفظ به في وحدة واحدة مشتركة بين كل الصفحات
 * فلا يُجلب مرة لكل صفحة. لا يحتوي أي بيانات شخصية.
 */
let cache: CatalogResponse | null = null;
let inflight: Promise<CatalogResponse> | null = null;

export function loadCatalog(): Promise<CatalogResponse> {
  if (cache) return Promise.resolve(cache);
  inflight ??= apiFetch<CatalogResponse>('/api/catalog')
    .then((response) => {
      cache = response;
      return response;
    })
    .catch((error: unknown) => {
      inflight = null;
      throw error;
    });
  return inflight;
}

/** يُستخدم في الاختبارات ولإعادة الجلب بعد تعديل إداري. */
export function resetCatalogCache(): void {
  cache = null;
  inflight = null;
}

export interface CatalogState {
  data: CatalogResponse;
  loading: boolean;
}

export function useCatalog(): CatalogState {
  const [data, setData] = useState<CatalogResponse>(cache ?? EMPTY_CATALOG);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    let active = true;
    loadCatalog()
      .then((response) => {
        if (!active) return;
        setData(response);
        setLoading(false);
      })
      .catch(() => {
        // الكتالوج ليس حرجاً للعرض: الصفحات تتعامل مع قوائم فارغة بسلاسة.
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { data, loading };
}
