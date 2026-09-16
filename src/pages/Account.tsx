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
import { useAuth } from '@/lib/useAuth';
import { ProfileCard } from '@/components/ProfileCard';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import type { LinkTokenResponse } from '@shared/types';

export function AccountPage() {
  const { data, setData, refresh } = useSession();
  const { signOut } = useAuth();
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
  const [unlinkState, setUnlinkState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [linkState, setLinkState] = useState<'idle' | 'busy' | 'opened' | 'error'>('idle');

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

  /**
   * ربط اختياري بالكامل: يفتح البوت بتوكن لمرة واحدة. لا شيء في المنصّة
   * يتوقّف على نتيجته، ولذلك لا ننتظرها ولا نُجبر المستخدم على تحديث حالة.
   */
  const linkTelegram = async () => {
    setLinkState('busy');
    try {
      const response = await apiPost<LinkTokenResponse>('/api/telegram/link-token');
      window.open(response.deepLink, '_blank', 'noopener,noreferrer');
      setLinkState('opened');
    } catch {
      setLinkState('error');
    }
  };

  const unlinkTelegram = async () => {
    const confirmed = window.confirm(
      'سيتم فكّ ربط حساب تيليجرام. لن يُحذف حسابك ولا بياناتك، وستبقى كل الأدوات مفتوحة لك كما هي. هل تريد المتابعة؟',
    );
    if (!confirmed) return;

    setUnlinkState('busy');
    try {
      await apiPost('/api/telegram/unlink');
      await refresh();
      setUnlinkState('idle');
    } catch {
      setUnlinkState('error');
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

      <div style={{ marginBlockStart: 'var(--sp-6)' }}>
        <ProfileCard />
      </div>

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
                {/*
                  شارتان مستقلّتان: صلاحية النظام شيء، ودور التجربة شيء آخر.
                  «مدير المنصة» تظهر للمدير وحده ولا تحلّ محل «معلّم» أو «طالب».
                */}
                {data.user.role === 'admin' ? <Badge tone="brand">مدير المنصة</Badge> : null}
                <Badge tone="neutral">
                  {data.profile.role === 'student' ? 'طالب' : 'معلّم'}
                </Badge>
              </div>

              {data.user.role === 'admin' ? (
                <Link
                  className="btn btn-secondary btn-sm"
                  to="/admin"
                  style={{ marginBlockStart: 'var(--sp-3)' }}
                >
                  <Icon name="settings" size={16} /> فتح لوحة الإدارة
                </Link>
              ) : null}
            </div>
          </div>

          <hr className="divider" />

          <h3 className="title-sm">ربط Telegram (اختياري)</h3>
          <p className="muted small" style={{ marginBlock: 'var(--sp-2) var(--sp-3)' }}>
            الربط ميزة إضافية فقط. المنصّة وأدواتها مفتوحة لك كاملةً سواء ربطت حسابك أم لا.
          </p>
          <dl className="kv-list">
            <div className="kv">
              <dt>الحالة</dt>
              <dd>
                {data.telegram.linked ? (
                  <Badge tone="success">مربوط</Badge>
                ) : (
                  <Badge tone="neutral">غير مربوط</Badge>
                )}
              </dd>
            </div>
            <div className="kv">
              <dt>اسم المستخدم</dt>
              {/* اسم المستخدم لاتيني يبدأ بـ @ — نعزله حتى لا ينقلب داخل نص عربي. */}
              <dd className="muted small" dir="ltr">
                {data.telegram.telegramUsername ? `@${data.telegram.telegramUsername}` : '—'}
              </dd>
            </div>
          </dl>

          <div style={{ marginBlockStart: 'var(--sp-4)' }}>
            {data.telegram.linked ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => void unlinkTelegram()}
                disabled={unlinkState === 'busy'}
              >
                {unlinkState === 'busy' ? 'جارٍ فكّ الربط…' : 'فكّ ربط Telegram'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void linkTelegram()}
                disabled={linkState === 'busy'}
              >
                <Icon name="link" size={16} /> {linkState === 'busy' ? 'جارٍ التحضير…' : 'ربط Telegram'}
              </button>
            )}
          </div>

          {linkState === 'opened' ? (
            <div style={{ marginBlockStart: 'var(--sp-3)' }}>
              <Alert tone="info">
                فتحنا لك محادثة البوت. اضغط <strong>Start</strong> هناك ليكتمل الربط.
              </Alert>
            </div>
          ) : null}
          {linkState === 'error' ? (
            <div style={{ marginBlockStart: 'var(--sp-3)' }}>
              <Alert tone="error">تعذّر تحضير رابط الربط. حاول مرة أخرى.</Alert>
            </div>
          ) : null}
          {unlinkState === 'error' ? (
            <div style={{ marginBlockStart: 'var(--sp-3)' }}>
              <Alert tone="error">تعذّر فكّ الربط. حاول مرة أخرى.</Alert>
            </div>
          ) : null}

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
