import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, EmptyState, Spinner } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { useCatalog } from '@/lib/useCatalog';
import { useSession } from '@/lib/useSession';
import { useToolGroups, useTools } from '@/lib/useTools';

/**
 * صفحة الأدوات: بحث أولاً، ثم أقسام مرتّبة.
 *
 * الأدوات التي تصل إلى هنا مرشَّحة أصلاً في الخادم حسب ملف المستخدم،
 * ولا تظهر أداة غير منفَّذة — فكل زر هنا يفتح أداة تعمل فعلاً.
 */
export function ToolsPage() {
  const { data } = useSession();
  const catalog = useCatalog();
  const tools = useTools();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const visible = category
    ? tools.items.filter((tool) => tool.categoryId === category)
    : tools.items;
  const groups = useToolGroups(visible, catalog.data.categories, query);

  const roleCategories = catalog.data.categories.filter(
    (entry) =>
      entry.audience === 'both' || entry.audience === (data?.profile.role ?? 'teacher'),
  );

  return (
    <div className="container page-section">
      <header style={{ marginBlockEnd: 'var(--sp-5)' }}>
        <h1 className="title-lg">الأدوات</h1>
        <p className="muted small" style={{ marginBlockStart: 'var(--sp-2)' }}>
          كل أداة تُنتج مستنداً احترافياً جاهزاً للطباعة أو التصدير.
        </p>
      </header>

      <div className="tool-search">
        <span className="tool-search-icon" aria-hidden="true">
          <Icon name="search" size={18} />
        </span>
        <input
          className="input"
          type="search"
          value={query}
          placeholder="وش تبغى تنجز اليوم؟"
          aria-label="ابحث في الأدوات"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {roleCategories.length > 0 ? (
        <div className="filter-row">
          <button
            type="button"
            className={`chip${category === null ? ' is-selected' : ''}`}
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            الكل
          </button>
          {roleCategories.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`chip${category === entry.id ? ' is-selected' : ''}`}
              aria-pressed={category === entry.id}
              onClick={() => setCategory(entry.id)}
            >
              {entry.nameAr}
            </button>
          ))}
        </div>
      ) : null}

      {tools.status === 'loading' ? (
        <div className="card" style={{ marginBlockStart: 'var(--sp-6)' }}>
          <Spinner label="جارٍ تحميل الأدوات…" />
        </div>
      ) : tools.status === 'error' ? (
        <div style={{ marginBlockStart: 'var(--sp-6)' }}>
          <Alert tone="error" title="تعذّر تحميل الأدوات">
            {tools.errorMessage ?? 'حدّث الصفحة وحاول مرة أخرى.'}
          </Alert>
        </div>
      ) : groups.length === 0 ? (
        <div style={{ marginBlockStart: 'var(--sp-6)' }}>
          <EmptyState
            title={query ? 'لا توجد أداة بهذا الاسم' : 'لا توجد أدوات مطابقة لملفك'}
            description={
              query
                ? 'جرّب كلمة أخرى، أو امسح البحث لتصفّح كل الأقسام.'
                : 'حدّث مرحلتك وموادك من صفحة حسابي لنعرض لك أدوات أنسب.'
            }
            action={
              query ? (
                <button type="button" className="btn btn-secondary" onClick={() => setQuery('')}>
                  مسح البحث
                </button>
              ) : (
                <Link className="btn btn-secondary" to="/account">
                  تعديل ملفي
                </Link>
              )
            }
          />
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="category-block">
            <h2 className="title-md">{group.nameAr}</h2>
            <div className="tools-grid" style={{ marginBlockStart: 'var(--sp-4)' }}>
              {group.tools.map((tool) => (
                <article className="tool-card" key={tool.id}>
                  <span className={`tool-card-icon tool-icon-${tool.id}`}>
                    <Icon name={(tool.icon as IconName) ?? 'tools'} size={22} />
                  </span>
                  <div className="tool-card-badges">
                    {tool.isNew ? <span className="tag tag-ready">جديد</span> : null}
                    {tool.isFeatured ? <span className="tag tag-pending">مميّزة</span> : null}
                  </div>
                  <h3 className="title-sm">{tool.nameAr}</h3>
                  <p className="muted small tool-card-text">{tool.descriptionAr}</p>
                  <Link className="btn btn-primary btn-block" to={`/tools/${tool.slug}`}>
                    فتح الأداة ←
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
