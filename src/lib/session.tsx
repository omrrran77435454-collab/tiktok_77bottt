import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MeResponse } from '@shared/types';
import { ApiRequestError, apiFetch, apiPost } from './api';
import { SessionContext, type SessionState } from './session-context';
import { useAuth } from './useAuth';

type FetchOutcome = 'authenticated' | 'unauthorized' | 'error';

/** نتيجة آخر جلب، مربوطة بالجلسة التي جُلبت من أجلها. */
interface FetchResult {
  /** يميّز جلسة الدخول التي تنتمي إليها النتيجة. */
  session: string;
  outcome: FetchOutcome;
  data: MeResponse | null;
  errorMessage: string | null;
}

const EMPTY: FetchResult = { session: '', outcome: 'unauthorized', data: null, errorMessage: null };

/**
 * يجلب ملف المستخدم من الخادم بعد أن تستقرّ حالة Firebase.
 *
 * الخادم هو مصدر الحقيقة: هو من يتحقّق من التوكن، وينشئ صفّ المستخدم،
 * ويقرّر الدور وحالة بوابة تيليجرام. الواجهة لا تفترض شيئاً من ذلك.
 *
 * ملاحظة على التصميم: النتيجة مرتبطة بمعرّف الجلسة التي جُلبت لأجلها، فتُشتقّ
 * حالة «جارٍ التحميل» تلقائياً عند تغيّر حالة الدخول بلا تصفير يدوي.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, firebaseUser } = useAuth();
  const [result, setResult] = useState<FetchResult>(EMPTY);
  const loginRecorded = useRef<string | null>(null);

  // معرّف الجلسة: يتغيّر عند تبديل المستخدم أو تسجيل الخروج والدخول.
  const sessionKey = authStatus === 'signed-in' ? (firebaseUser?.uid ?? 'session') : '';

  const refresh = useCallback(async () => {
    const key = sessionKey || 'session';
    try {
      const response = await apiFetch<MeResponse>('/api/me');
      setResult({ session: key, outcome: 'authenticated', data: response, errorMessage: null });

      // نسجّل حدث الدخول مرة واحدة لكل جلسة.
      if (loginRecorded.current !== key) {
        loginRecorded.current = key;
        void apiPost('/api/me/login').catch(() => undefined);
      }
    } catch (error) {
      // الخادم رفض التوكن (منتهٍ أو لمشروع آخر): نعامله كغير مسجّل
      // بدل إبقاء المستخدم على شاشة تحميل لا تنتهي.
      if (error instanceof ApiRequestError && error.status === 401) {
        setResult({ session: key, outcome: 'unauthorized', data: null, errorMessage: null });
        return;
      }
      setResult({
        session: key,
        outcome: 'error',
        data: null,
        errorMessage:
          error instanceof ApiRequestError ? error.message : 'تعذّر تحميل بيانات الحساب.',
      });
    }
  }, [sessionKey]);

  useEffect(() => {
    if (authStatus !== 'signed-in') {
      loginRecorded.current = null;
      return;
    }
    // جلب بيانات الحساب عند استقرار حالة الدخول. تحديث الحالة يقع بعد انتهاء
    // الطلب (داخل Promise) وليس بشكل متزامن، فلا توجد دورة إعادة رسم متتالية.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [authStatus, refresh]);

  const status = useMemo<SessionState['status']>(() => {
    if (authStatus === 'loading') return 'loading';
    if (authStatus !== 'signed-in') return 'anonymous';
    // نتيجة تخصّ جلسة سابقة ⇒ ما زلنا نحمّل الحالية.
    if (result.session !== (sessionKey || 'session')) return 'loading';
    if (result.outcome === 'authenticated') return 'authenticated';
    if (result.outcome === 'unauthorized') return 'anonymous';
    return 'error';
  }, [authStatus, result, sessionKey]);

  const setData = useCallback((data: MeResponse) => {
    setResult((current) => ({ ...current, data }));
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      status,
      data: status === 'authenticated' ? result.data : null,
      errorMessage: result.errorMessage,
      refresh,
      setData,
    }),
    [status, result, refresh, setData],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
