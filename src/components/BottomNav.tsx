import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '@/components/Icon';

/**
 * شريط التنقّل السفلي (Mobile First).
 *
 * خمسة عناصر كحدّ أقصى — أي زيادة تجعل أهداف اللمس أصغر من المريح.
 * زر لوحة الإدارة ليس هنا عن قصد: مكانه الترويسة وصفحة الحساب، فهو يخصّ
 * مالك المنصّة لا المستخدم العادي.
 */
const ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/dashboard', label: 'الرئيسية', icon: 'home' },
  { to: '/schedule', label: 'أسبوعي', icon: 'calendar' },
  { to: '/tools', label: 'الأدوات', icon: 'tools' },
  { to: '/documents', label: 'مستنداتي', icon: 'doc' },
  { to: '/account', label: 'حسابي', icon: 'settings' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav no-print" aria-label="التنقّل السريع">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-link${isActive ? ' is-active' : ''}`}
        >
          <Icon name={item.icon} size={20} />
          <span>{item.label}</span>
          <span className="bottom-nav-dot" aria-hidden="true" />
        </NavLink>
      ))}
    </nav>
  );
}
