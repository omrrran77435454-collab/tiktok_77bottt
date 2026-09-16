import { Link, useParams } from 'react-router-dom';
import { getToolBySlug } from '@/features/tools/registry';
import { ToolEditor } from '@/features/editor/ToolEditor';
import { NotFoundPage } from './NotFound';

export function ToolPage() {
  const { slug } = useParams<{ slug: string }>();
  const tool = getToolBySlug(slug);

  if (!tool) return <NotFoundPage />;

  return (
    <div className="container page-section tool-page">
      <nav className="breadcrumb no-print" aria-label="مسار التنقّل">
        <Link to="/dashboard">الرئيسية</Link>
        <span aria-hidden="true">/</span>
        <Link to="/tools">الأدوات</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{tool.nameAr}</span>
      </nav>

      <header className="no-print" style={{ marginBlockEnd: 'var(--sp-6)' }}>
        <h1 className="title-lg">{tool.nameAr}</h1>
        <p className="muted" style={{ marginBlockStart: 'var(--sp-2)' }}>
          {tool.longDescriptionAr}
        </p>
      </header>

      <ToolEditor tool={tool} />
    </div>
  );
}
