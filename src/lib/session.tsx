import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { MeResponse } from '@shared/types';
import { ApiRequestError, apiFetch } from './api';
import { SessionContext, type SessionState } from './session-context';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState['status']>('loading');
  const [data, setData] = useState<MeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await apiFetch<MeResponse>('/api/me');
      setData(response);
      setErrorMessage(null);
      setStatus('authenticated');
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setData(null);
        setErrorMessage(null);
        setStatus('anonymous');
        return;
      }
      setData(null);
      setErrorMessage(
        error instanceof ApiRequestError ? error.message : 'تعذّر تحميل بيانات الحساب.',
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // جلب بيانات الجلسة عند الإقلاع. التحديث يحدث بعد انتهاء الطلب
    // (داخل Promise) وليس بشكل متزامن، لذا لا توجد دورة إعادة رسم متتالية.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const value = useMemo<SessionState>(
    () => ({ status, data, errorMessage, refresh, setData }),
    [status, data, errorMessage, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
