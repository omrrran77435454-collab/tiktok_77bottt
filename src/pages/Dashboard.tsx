import { Navigate } from 'react-router-dom';
import { useSession } from '@/lib/useSession';
import { BootSplash } from '@/components/BootSplash';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentDashboard } from './StudentDashboard';

/**
 * موزّع اللوحات حسب دور تجربة الاستخدام.
 *
 * المستخدم الذي لم يُكمل التهيئة يُوجَّه إليها مرة واحدة فقط — بعدها
 * onboardingCompleted = true فلا تظهر مجدداً.
 */
export function DashboardPage() {
  const { data, status } = useSession();

  if (status === 'loading' || !data) return <BootSplash />;
  if (!data.profile.onboardingCompleted) return <Navigate to="/welcome" replace />;

  return data.profile.role === 'student' ? <StudentDashboard /> : <TeacherDashboard />;
}
