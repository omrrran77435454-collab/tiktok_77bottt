import { Link } from 'react-router-dom';
import { useSession } from '@/lib/useSession';
import { TOOLS } from '@/features/tools/registry';
import { Icon, type IconName } from '@/components/Icon';
import { DOC_TEMPLATES } from '@/features/document/templates';

const TOOL_ICONS: Record<string, IconName> = {
  'student-followup': 'clipboard',
  'error-map': 'chart',
  'absence-plan': 'user',
};

export function DashboardPage() {
  const { data } = useSession();
  const firstName = (data?.user.name ?? '').split(' ')[0] || 'معلّمنا';
  const preferences = data?.preferences ?? null;
  const template = DOC_TEMPLATES.find((item) => item.id === preferences?.defaultTemplateId);

  return (
    <div className="container page-section">
      <header className="dash-head">
        <div>
          <span className="eyebrow">لوحتك</span>
          <h1 className="title-lg" style={{ marginBlockStart: 'var(--sp-3)' }}>
            مرحباً {firstName} 👋
          </h1>
          <p className="muted">اختر أداة وابدأ — كل شيء جاهز.</p>
        </div>
        {data?.user.role === 'admin' ? (
          <Link className="btn btn-secondary" to="/admin">
            <Icon name="settings" size={18} />
            لوحة الإدارة
          </Link>
        ) : null}
      </header>

      <section style={{ marginBlockStart: 'var(--sp-8)' }}>
        <h2 className="title-md">أدوات المعلم</h2>
        <div className="tools-grid" style={{ marginBlockStart: 'var(--sp-4)' }}>
          {TOOLS.map((tool) => (
            <article className="tool-card" key={tool.id}>
              <span className={`tool-card-icon tool-icon-${tool.id}`}>
                <Icon name={TOOL_ICONS[tool.id] ?? 'tools'} size={22} />
              </span>
              <h3 className="title-sm">{tool.nameAr}</h3>
              <p className="muted small tool-card-text">{tool.shortDescriptionAr}</p>
              <Link className="btn btn-primary btn-block" to={`/tools/${tool.slug}`}>
                فتح الأداة ←
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBlockStart: 'var(--sp-10)' }}>
        <h2 className="title-md">تفضيلاتي</h2>
        <div className="card" style={{ marginBlockStart: 'var(--sp-4)' }}>
          {preferences ? (
            <div className="prefs-row">
              <div>
                <span className="label">آخر قالب استخدمته</span>
                <p className="strong">{template?.nameAr ?? preferences.defaultTemplateId}</p>
              </div>
              <div>
                <span className="label">ألوانك</span>
                <div className="row" style={{ gap: 'var(--sp-2)', marginBlockStart: 'var(--sp-2)' }}>
                  {[
                    preferences.primaryColor,
                    preferences.secondaryColor,
                    preferences.accentColor,
                    preferences.backgroundColor,
                  ].map((color) => (
                    <span
                      key={color}
                      className="pref-swatch"
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <Link className="btn btn-secondary btn-sm" to="/account">
                إدارة التفضيلات
              </Link>
            </div>
          ) : (
            <p className="muted small">
              لم تحفظ تفضيلات بعد. افتح أي أداة واختر قالباً وألواناً — سنتذكّرها لك تلقائياً.
            </p>
          )}
          <p className="hint" style={{ marginBlockStart: 'var(--sp-4)' }}>
            ملاحظة: لا نحفظ أي بيانات طلاب على الخادم — فقط تفضيلات الشكل.
          </p>
        </div>
      </section>
    </div>
  );
}
