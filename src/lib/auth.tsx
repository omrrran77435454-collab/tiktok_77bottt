import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  E2E_TOKEN_KEY,
  getFirebaseAuth,
  googleProvider,
  isE2ETestMode,
  isFirebaseConfigured,
} from './firebase';
import { setTokenProvider } from './api';
import { AuthContext, type AuthState, type AuthStatus } from './auth-context';

/** يقرأ توكن الاختبار من التخزين المحلي (وضع E2E فقط). */
function readE2EToken(): string | null {
  try {
    return localStorage.getItem(E2E_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** رسائل عربية لأشهر أخطاء تسجيل الدخول. */
function messageForSignInError(code: string): string {
  switch (code) {
    case 'auth/popup-blocked':
      return 'تعذّر فتح نافذة تسجيل الدخول. تأكد من السماح بالنوافذ المنبثقة ثم حاول مرة ثانية.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'أُغلقت نافذة تسجيل الدخول قبل إكمالها. حاول مرة ثانية.';
    case 'auth/network-request-failed':
      return 'تعذّر الاتصال بخدمة تسجيل الدخول. تأكد من اتصالك بالإنترنت ثم حاول مرة ثانية.';
    case 'auth/unauthorized-domain':
      return 'هذا النطاق غير مصرّح به في إعدادات تسجيل الدخول. تواصل مع مشرف المنصة.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بحساب Google غير مفعّل حالياً. تواصل مع مشرف المنصة.';
    default:
      return 'تعذّر تسجيل الدخول بقوقل. حاول مرة ثانية.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => {
    // في وضع الاختبار تُحسم الحالة فوراً من التخزين المحلي بلا انتظار.
    if (isE2ETestMode) return readE2EToken() ? 'signed-in' : 'signed-out';
    return isFirebaseConfigured ? 'loading' : 'unconfigured';
  });
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  // يمنح طبقة الـ API وسيلة للحصول على توكن حديث قبل كل طلب.
  useEffect(() => {
    setTokenProvider(async () => {
      if (isE2ETestMode) {
        try {
          const stored = localStorage.getItem(E2E_TOKEN_KEY);
          if (stored) return stored;
        } catch {
          /* تخزين محظور — نتابع بالمسار العادي */
        }
      }
      const auth = getFirebaseAuth();
      const current = auth?.currentUser;
      if (!current) return tokenRef.current;
      try {
        // Firebase يجدّد التوكن تلقائياً عند اقتراب انتهائه.
        return await current.getIdToken();
      } catch {
        return tokenRef.current;
      }
    });
  }, []);

  useEffect(() => {
    if (isE2ETestMode) {
      tokenRef.current = readE2EToken();
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) return;

    // نتيجة مسار Redirect الاحتياطي (عندما يُحظر الـ popup).
    void getRedirectResult(auth).catch(() => undefined);

    return onIdTokenChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        tokenRef.current = null;
        setStatus('signed-out');
        return;
      }
      void user
        .getIdToken()
        .then((token) => {
          tokenRef.current = token;
        })
        .finally(() => setStatus('signed-in'));
    });
  }, []);

  const signIn = useCallback(async () => {
    setSignInError(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      setSignInError('خدمة تسجيل الدخول غير مُعدّة على هذا الموقع. تواصل مع مشرف المنصة.');
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider());
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      // المتصفّحات التي تحظر النوافذ المنبثقة: ننتقل إلى مسار Redirect.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider());
          return;
        } catch {
          setSignInError(messageForSignInError('auth/popup-blocked'));
          return;
        }
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      setSignInError(messageForSignInError(code));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isE2ETestMode) {
      try {
        localStorage.removeItem(E2E_TOKEN_KEY);
      } catch {
        /* تجاهل */
      }
      tokenRef.current = null;
      setStatus('signed-out');
      window.location.assign('/');
      return;
    }
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
    tokenRef.current = null;
    window.location.assign('/');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, firebaseUser, signInError, signIn, signOut }),
    [status, firebaseUser, signInError, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
