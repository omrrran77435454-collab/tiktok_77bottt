import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/useSession';
import { LoadingScreen } from '@/components/ui';
import { ErrorPage } from '@/pages/ErrorPage';
import { UnauthorizedPage } from '@/pages/Unauthorized';

/**
 * حراس المسارات في الواجهة.
 *
 * مهم: هذه الحراسة لتحسين التجربة فقط. الحماية الحقيقية في الخادم —
 * كل نقطة API تتحقق من الجلسة والصلاحية بنفسها، ولا تثق بأي شيء من العميل.
 */

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, errorMessage, refresh } = useSession();
  const location = useLocation();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error') {
    return (
      <ErrorPage
        title="تعذّر تحميل حسابك"
        message={errorMessage ?? 'حاول تحديث الصفحة.'}
        onRetry={() => void refresh()}
      />
    );
  }
  if (status === 'anonymous') return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** يتطلّب اجتياز بوابة تيليجرام (مربوط + اشتراك مؤكَّد). */
export function RequireTools({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  if (status === 'loading') return <LoadingScreen />;
  if (data && !data.canUseTools) return <Navigate to="/connect" replace />;
  return <>{children}</>;
}

/**
 * لوحة الإدارة لمالك المنصّة.
 * لا تمرّ عبر RequireTools عن قصد: الإدمن يدخل لوحته حتى لو كانت حالة
 * اشتراكه في القناة غير مؤكَّدة، لأنه مالك المنصّة لا مستخدم عادي.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  if (status === 'loading') return <LoadingScreen />;
  if (data?.user.role !== 'admin') return <UnauthorizedPage />;
  return <>{children}</>;
}

/** يمنع المستخدم المسجَّل من رؤية صفحة الهبوط مرة أخرى. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'authenticated' && data) {
    return <Navigate to={data.canUseTools ? '/dashboard' : '/connect'} replace />;
  }
  return <>{children}</>;
}
