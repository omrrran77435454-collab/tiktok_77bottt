import { Navigate } from 'react-router-dom';
import { useSession } from '@/lib/useSession';
import { BootSplash } from '@/components/BootSplash';
import { ChannelCard } from '@/components/ChannelCard';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentDashboard } from './StudentDashboard';

/**
 * موزّع اللوحات حسب دور تجربة الاستخدام.
 *
 * المستخدم الذي لم يُكمل التهيئة يُوجَّه إليها مرة واحدة فقط — بعدها
 * onboardingCompleted = true فلا تظهر مجدداً.
 *
 * لا شرط آخر للدخول: تسجيل الدخول والتهيئة فقط.
 */
export function DashboardPage() {
  const { data, status } = useSession();

  if (status === 'loading' || !data) return <BootSplash />;
  if (!data.profile.onboardingCompleted) return <Navigate to="/welcome" replace />;

  return (
    <>
      {/* دعوة اختيارية لزيارة القناة — أعلى الصفحة، ولا تمنع شيئاً. */}
      <ChannelCard />
      {data.profile.role === 'student' ? <StudentDashboard /> : <TeacherDashboard />}
    </>
  );
}
