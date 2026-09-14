import { useState } from 'react';
import { useSession } from '@/lib/useSession';
import { Alert, Badge } from '@/components/ui';
import { ColorPanel } from '@/features/editor/ColorPanel';
import { TemplatePicker } from '@/features/editor/TemplatePicker';
import { DEFAULT_TEMPLATE_ID } from '@/features/document/templates';
import { DEFAULT_PALETTE, normalizePalette, type Palette } from '@/lib/colors';
import { apiPost } from '@/lib/api';
import { saveLocal } from '@/lib/storage';
import { TOOLS } from '@/features/tools/registry';
import { clearToolData } from '@/lib/storage';
import { formatDateTime } from '@/lib/format';
import { signOut } from '@/lib/auth-client';

export function AccountPage() {
  const { data, setData } = useSession();
  const [templateId, setTemplateId] = useState(
    data?.preferences?.defaultTemplateId ?? DEFAULT_TEMPLATE_ID,
  );
  const [palette, setPalette] = useState<Palette>(
    () =>
      normalizePalette(
        data?.preferences
          ? {
              primary: data.preferences.primaryColor,
              secondary: data.preferences.secondaryColor,
              accent: data.preferences.accentColor,
              background: data.preferences.backgroundColor,
            }
          : null,
      ) ?? { ...DEFAULT_PALETTE },
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const save = async () => {
    setStatus('saving');
    const preferences = {
      defaultTemplateId: templateId,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
      backgroundColor: palette.background,
    };
    try {
      await apiPost('/api/me/preferences', preferences);
      saveLocal('template', templateId);
      saveLocal('palette', palette);
      if (data) setData({ ...data, preferences });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  const clearAllToolData = () => {
    const confirmed = window.confirm(
      'سيتم مسح بيانات جميع الأدوات من هذا الجهاز نهائياً. هل تريد المتابعة؟',
    );
    if (!confirmed) return;
    for (const tool of TOOLS) clearToolData(tool.id);
    window.alert('تم مسح بيانات جميع الأدوات من هذا الجهاز.');
  };

  if (!data) return null;

  return (
    <div className="container page-section">
      <h1 className="title-lg">الحساب والإعدادات</h1>

      <div className="account-grid" style={{ marginBlockStart: 'var(--sp-6)' }}>
        <section className="card">
          <h2 className="title-sm">معلومات الحساب</h2>
          <div className="account-profile">
            {data.user.image ? (
              <img className="avatar avatar-lg" src={data.user.image} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="avatar avatar-lg avatar-fallback">{data.user.name.charAt(0)}</span>
            )}
            <div>
              <p className="strong">{data.user.name}</p>
              <p className="muted small">{data.user.email}</p>
              <div className="row" style={{ marginBlockStart: 'var(--sp-2)' }}>
                <Badge tone={data.user.role === 'admin' ? 'brand' : 'neutral'}>
                  {data.user.role === 'admin' ? 'مدير المنصة' : 'معلّم'}
                </Badge>
              </div>
            </div>
          </div>

          <hr className="divider" />

          <h3 className="title-sm">حالة Telegram</h3>
          <dl className="kv-list">
            <div className="kv">
              <dt>الربط</dt>
              <dd>
                {data.telegram.linked ? (
                  <Badge tone="success">مربوط</Badge>
                ) : (
                  <Badge tone="warn">غير مربوط</Badge>
                )}
              </dd>
            </div>
            <div className="kv">
              <dt>الاشتراك في القناة</dt>
              <dd>
                {data.telegram.isMember ? (
                  <Badge tone="success">مؤكَّد</Badge>
                ) : (
                  <Badge tone="danger">غير مؤكَّد</Badge>
                )}
              </dd>
            </div>
            <div className="kv">
              <dt>اسم المستخدم</dt>
              <dd className="muted small">
                {data.telegram.telegramUsername ? `@${data.telegram.telegramUsername}` : '—'}
              </dd>
            </div>
            <div className="kv">
              <dt>آخر تحقّق</dt>
              <dd className="muted small">{formatDateTime(data.telegram.lastCheckedAt)}</dd>
            </div>
          </dl>

          <hr className="divider" />

          <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
            تسجيل الخروج
          </button>
        </section>

        <section className="stack-lg">
          <div className="card">
            <h2 className="title-sm" style={{ marginBlockEnd: 'var(--sp-4)' }}>
              القالب الافتراضي
            </h2>
            <TemplatePicker value={templateId} onChange={setTemplateId} palette={palette} />
          </div>

          <div className="card">
            <h2 className="title-sm" style={{ marginBlockEnd: 'var(--sp-4)' }}>
              الألوان الافتراضية
            </h2>
            <ColorPanel palette={palette} onChange={setPalette} />
          </div>

          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void save()}
                disabled={status === 'saving'}
              >
                {status === 'saving' ? 'جارٍ الحفظ…' : 'حفظ التفضيلات'}
              </button>
              {status === 'saved' ? <span className="muted small">تم الحفظ ✓</span> : null}
            </div>
            {status === 'error' ? (
              <div style={{ marginBlockStart: 'var(--sp-4)' }}>
                <Alert tone="error">تعذّر حفظ التفضيلات. حاول مرة أخرى.</Alert>
              </div>
            ) : null}
          </div>

          <div className="card">
            <h2 className="title-sm">بياناتي على هذا الجهاز</h2>
            <p className="muted small" style={{ marginBlock: 'var(--sp-2) var(--sp-4)' }}>
              بيانات الطلاب التي تُدخلها في الأدوات محفوظة في متصفّحك فقط. يمكنك مسحها كلها من هنا.
            </p>
            <button type="button" className="btn btn-danger" onClick={clearAllToolData}>
              مسح بيانات جميع الأدوات
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
