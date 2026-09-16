import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/useSession';
import { BootSplash } from '@/components/BootSplash';
import { ErrorPage } from '@/pages/ErrorPage';
import { UnauthorizedPage } from '@/pages/Unauthorized';
import { destinationFor } from '@/lib/destination';

/**
 * حراس المسارات في الواجهة.
 *
 * مهم: هذه الحراسة لتحسين التجربة فقط. الحماية الحقيقية في الخادم —
 * كل نقطة API تتحقق من الجلسة والصلاحية بنفسها، ولا تثق بأي شيء من العميل.
 *
 * لا يوجد هنا حارس لتيليجرام: الربط والاشتراك اختياريان ولا يمنعان أي مسار.
 */

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, errorMessage, refresh } = useSession();
  const location = useLocation();

  if (status === 'loading') return <BootSplash />;
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

/**
 * يمنع البقاء على صفحة لم تعد وجهة المستخدم الصحيحة.
 * يُستخدم على /welcome: بمجرّد اكتمال التهيئة ينتقل المستخدم تلقائياً إلى
 * وجهته التالية بلا تحديث يدوي.
 */
export function RedirectWhenDone({ path, children }: { path: string; children: ReactNode }) {
  const { data, status } = useSession();
  if (status === 'loading') return <BootSplash />;

  if (status === 'authenticated' && data) {
    const destination = destinationFor(data);
    if (destination !== path) return <Navigate to={destination} replace />;
  }
  return <>{children}</>;
}

/**
 * لوحة الإدارة لمالك المنصّة — تعتمد على access_role وحده.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  if (status === 'loading') return <BootSplash />;
  if (data?.user.role !== 'admin') return <UnauthorizedPage />;
  return <>{children}</>;
}

/** يمنع المستخدم المسجَّل من رؤية صفحة الهبوط مرة أخرى. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  if (status === 'loading') return <BootSplash />;
  if (status === 'authenticated' && data) {
    return <Navigate to={destinationFor(data)} replace />;
  }
  return <>{children}</>;
}
