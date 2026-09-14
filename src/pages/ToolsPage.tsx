import { Link } from 'react-router-dom';
import { TOOLS } from '@/features/tools/registry';
import { Icon, type IconName } from '@/components/Icon';

const TOOL_ICONS: Record<string, IconName> = {
  'student-followup': 'clipboard',
  'error-map': 'chart',
  'absence-plan': 'user',
};

export function ToolsPage() {
  return (
    <div className="container page-section">
      <h1 className="title-lg">الأدوات</h1>
      <p className="muted" style={{ marginBlockStart: 'var(--sp-2)' }}>
        كل أداة تُنتج مستنداً احترافياً جاهزاً للطباعة أو التصدير.
      </p>

      <div className="tools-grid" style={{ marginBlockStart: 'var(--sp-6)' }}>
        {TOOLS.map((tool) => (
          <article className="tool-card" key={tool.id}>
            <span className={`tool-card-icon tool-icon-${tool.id}`}>
              <Icon name={TOOL_ICONS[tool.id] ?? 'tools'} size={22} />
            </span>
            <h2 className="title-sm">{tool.nameAr}</h2>
            <p className="muted small tool-card-text">{tool.longDescriptionAr}</p>
            <Link className="btn btn-primary btn-block" to={`/tools/${tool.slug}`}>
              فتح الأداة ←
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
