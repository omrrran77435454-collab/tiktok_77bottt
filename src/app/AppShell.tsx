import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/useSession';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/lib/useAuth';
import { BottomNav } from '@/components/BottomNav';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'الرئيسية', icon: 'home' as const },
  { to: '/schedule', label: 'أسبوعي', icon: 'calendar' as const },
  { to: '/tools', label: 'الأدوات', icon: 'tools' as const },
  { to: '/documents', label: 'مستنداتي', icon: 'doc' as const },
  { to: '/account', label: 'حسابي', icon: 'settings' as const },
  { to: '/help', label: 'المساعدة', icon: 'help' as const },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  const { signOut } = useAuth();
  const location = useLocation();
  // نربط حالة القائمة بالمسار الحالي، فتُغلق تلقائياً عند الانتقال
  // بدون الحاجة إلى تأثير جانبي يعيد الرسم.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath === location.pathname;
  const setMenuOpen = (next: boolean) => setOpenPath(next ? location.pathname : null);

  const authenticated = status === 'authenticated' && !!data;

  return (
    <div className={`app-shell${authenticated ? ' has-bottom-nav' : ''}`}>
      <a className="skip-link" href="#main">
        تخطَّ إلى المحتوى
      </a>

      <header className="app-header no-print">
        <div className="container app-header-inner">
          <Link className="brand" to={authenticated ? '/dashboard' : '/'}>
            {/* اسم المنصّة مكتوب بجانبها، لذلك الأيقونة زخرفية لقارئ الشاشة. */}
            <img className="brand-mark" src="/icon-192.png" alt="" width={38} height={38} />
            <span className="brand-text">
              <span className="brand-name">أدوات المعلم</span>
              <span className="brand-tag">أدوات تختصر شغل المعلم</span>
            </span>
          </Link>

          {authenticated ? (
            <>
              <nav className="app-nav" aria-label="التنقّل الرئيسي">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
                {data.user.role === 'admin' ? (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
                  >
                    الإدارة
                  </NavLink>
                ) : null}
              </nav>

              <div className="app-header-actions">
                <div className="user-chip">
                  {data.user.image ? (
                    <img className="avatar" src={data.user.image} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="avatar avatar-fallback">{data.user.name.charAt(0)}</span>
                  )}
                  <span className="user-name">{data.user.name.split(' ')[0]}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => void signOut()}
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                >
                  <Icon name="logout" size={18} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon menu-toggle"
                  aria-expanded={menuOpen}
                  aria-controls="mobile-nav"
                  aria-label="فتح القائمة"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  ☰
                </button>
              </div>
            </>
          ) : (
            <nav className="app-nav" aria-label="التنقّل">
              <NavLink to="/help" className="nav-link">
                المساعدة
              </NavLink>
            </nav>
          )}
        </div>

        {authenticated && menuOpen ? (
          <nav className="mobile-nav" id="mobile-nav" aria-label="قائمة الجوال">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </NavLink>
            ))}
            {data?.user.role === 'admin' ? (
              <NavLink to="/admin" className="mobile-nav-link">
                <Icon name="settings" size={18} />
                لوحة الإدارة
              </NavLink>
            ) : null}
          </nav>
        ) : null}
      </header>

      <main id="main" className="app-main">
        {children}
      </main>

      {authenticated ? <BottomNav /> : null}

      <footer className="app-footer no-print">
        <div className="container app-footer-inner">
          <span className="muted small">أدوات المعلم — أدوات تختصر شغل المعلم</span>
          <nav className="footer-links" aria-label="روابط قانونية">
            <Link to="/privacy">سياسة الخصوصية</Link>
            <Link to="/terms">شروط الاستخدام</Link>
            <Link to="/help">المساعدة</Link>
          </nav>
          <span className="muted small">بيانات طلابك تبقى على جهازك</span>
        </div>
      </footer>
    </div>
  );
}
