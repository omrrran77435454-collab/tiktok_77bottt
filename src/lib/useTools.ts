import { useEffect, useMemo, useState } from 'react';
import { ApiRequestError, apiFetch } from './api';
import type { ToolCatalogItem, UserProfile } from '@shared/types';

/**
 * أدوات المستخدم كما يرشّحها الخادم حسب ملفه.
 *
 * الترشيح الحقيقي يقع في الخادم؛ ما هنا مجرد بحث وتصفية إضافية للعرض.
 */
export function useTools() {
  const [items, setItems] = useState<ToolCatalogItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<{ tools: ToolCatalogItem[]; profile: UserProfile }>('/api/tools')
      .then((response) => {
        if (!active) return;
        setItems(response.tools);
        setProfile(response.profile);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(
          error instanceof ApiRequestError ? error.message : 'تعذّر تحميل الأدوات.',
        );
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  return { items, profile, status, errorMessage };
}

/** بحث نصّي في الاسم والوصف والكلمات المفتاحية. */
export function searchTools(tools: ToolCatalogItem[], query: string): ToolCatalogItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return tools;

  return tools.filter((tool) => {
    const haystack = [tool.nameAr, tool.descriptionAr, ...tool.keywords, tool.categoryId ?? '']
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/** يجمع الأدوات حسب القسم مع الحفاظ على ترتيب الأقسام. */
export function groupByCategory(
  tools: ToolCatalogItem[],
  categories: { id: string; nameAr: string; sortOrder: number }[],
): { id: string; nameAr: string; tools: ToolCatalogItem[] }[] {
  const groups = categories
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      id: category.id,
      nameAr: category.nameAr,
      tools: tools.filter((tool) => tool.categoryId === category.id),
    }))
    .filter((group) => group.tools.length > 0);

  const ungrouped = tools.filter(
    (tool) => !tool.categoryId || !categories.some((category) => category.id === tool.categoryId),
  );
  if (ungrouped.length) {
    groups.push({ id: 'other', nameAr: 'أدوات أخرى', tools: ungrouped });
  }
  return groups;
}

export function useToolGroups(
  tools: ToolCatalogItem[],
  categories: { id: string; nameAr: string; sortOrder: number }[],
  query: string,
) {
  return useMemo(() => groupByCategory(searchTools(tools, query), categories), [
    tools,
    categories,
    query,
  ]);
}
