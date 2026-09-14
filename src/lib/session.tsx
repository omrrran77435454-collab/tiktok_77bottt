import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MeResponse } from '@shared/types';
import { ApiRequestError, apiFetch, apiPost } from './api';
import { SessionContext, type SessionState } from './session-context';
import { useAuth } from './useAuth';

type FetchState = 'idle' | 'authenticated' | 'error';

/**
 * يجلب ملف المستخدم من الخادم بعد أن تستقرّ حالة Firebase.
 *
 * الخادم هو مصدر الحقيقة: هو من يتحقّق من التوكن، وينشئ صفّ المستخدم،
 * ويقرّر الدور وحالة بوابة تيليجرام. الواجهة لا تفترض شيئاً من ذلك.
 *
 * ملاحظة على التصميم: حالة الجلسة مشتقّة من حالة Firebase ولا تُخزَّن مرّتين،
 * فلا حاجة لتصفير الحالة يدوياً عند تسجيل الخروج.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth();
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [data, setData] = useState<MeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginRecorded = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const response = await apiFetch<MeResponse>('/api/me');
      setData(response);
      setErrorMessage(null);
      setFetchState('authenticated');

      // نسجّل حدث الدخول مرة واحدة لكل جلسة متصفّح.
      if (!loginRecorded.current) {
        loginRecorded.current = true;
        void apiPost('/api/me/login').catch(() => undefined);
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setData(null);
        setErrorMessage(null);
        setFetchState('idle');
        return;
      }
      setData(null);
      setErrorMessage(
        error instanceof ApiRequestError ? error.message : 'تعذّر تحميل بيانات الحساب.',
      );
      setFetchState('error');
    }
  }, []);

  useEffect(() => {
    if (authStatus !== 'signed-in') {
      loginRecorded.current = false;
      return;
    }
    // جلب بيانات الحساب عند استقرار حالة الدخول. تحديث الحالة يقع بعد
    // انتهاء الطلب (داخل Promise) وليس بشكل متزامن، فلا دورة إعادة رسم متتالية.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [authStatus, refresh]);

  const status = useMemo<SessionState['status']>(() => {
    if (authStatus === 'loading') return 'loading';
    if (authStatus !== 'signed-in') return 'anonymous';
    if (fetchState === 'authenticated') return 'authenticated';
    if (fetchState === 'error') return 'error';
    return 'loading';
  }, [authStatus, fetchState]);

  const value = useMemo<SessionState>(
    () => ({
      status,
      data: status === 'authenticated' ? data : null,
      errorMessage,
      refresh,
      setData,
    }),
    [status, data, errorMessage, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
