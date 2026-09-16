import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ensureAuthPersistence,
  getFirebaseAuth,
  googleProvider,
  isE2ETestMode,
  isFirebaseConfigured,
} from './firebase';
import { AuthContext, type AuthState, type AuthStatus } from './auth-context';
import { describeSignInError, extractAuthErrorCode, logSignInError } from './auth-error';

/** يقرأ توكن الاختبار من التخزين المحلي (وضع E2E فقط). */
function readE2EToken(): string | null {
  try {
    return localStorage.getItem(E2E_TOKEN_KEY);
  } catch {
    return null;
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
  const [signInErrorCode, setSignInErrorCode] = useState<string | null>(null);

  const reportSignInError = useCallback((context: string, error: unknown) => {
    logSignInError(context, error);
    const { message, code } = describeSignInError(error);
    setSignInError(message);
    setSignInErrorCode(code);
  }, []);

  useEffect(() => {
    if (isE2ETestMode) return;

    const auth = getFirebaseAuth();
    if (!auth) return;

    // نتيجة مسار Redirect الاحتياطي (عندما يُحظر الـ popup).
    // كان الفشل هنا يُبتلع تماماً، وهو المسار الذي تسلكه أجهزة Android غالباً.
    void getRedirectResult(auth).catch((error: unknown) => {
      reportSignInError('getRedirectResult', error);
    });

    return onIdTokenChanged(auth, (user) => {
      setFirebaseUser(user);
      setStatus(user ? 'signed-in' : 'signed-out');
    });
  }, [reportSignInError]);

  const signIn = useCallback(async () => {
    setSignInError(null);
    setSignInErrorCode(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      setSignInError('خدمة تسجيل الدخول غير مُعدّة على هذا الموقع. تواصل مع مشرف المنصة.');
      setSignInErrorCode(null);
      return;
    }

    try {
      // ننتظر تثبيت بقاء الجلسة قبل الدخول، وإلا قد تُكتب الجلسة في تخزين مؤقّت.
      await ensureAuthPersistence(auth);
      await signInWithPopup(auth, googleProvider());
    } catch (error) {
      logSignInError('signInWithPopup', error);
      const code = extractAuthErrorCode(error);
      // المتصفّحات التي تحظر النوافذ المنبثقة: ننتقل إلى مسار Redirect.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider());
          return;
        } catch (redirectError) {
          reportSignInError('signInWithRedirect', redirectError);
          return;
        }
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      const { message } = describeSignInError(error);
      setSignInError(message);
      setSignInErrorCode(code);
    }
  }, [reportSignInError]);

  const signOut = useCallback(async () => {
    if (isE2ETestMode) {
      try {
        localStorage.removeItem(E2E_TOKEN_KEY);
      } catch {
        /* تجاهل */
      }
      setStatus('signed-out');
      window.location.assign('/');
      return;
    }
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
    window.location.assign('/');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, firebaseUser, signInError, signInErrorCode, signIn, signOut }),
    [status, firebaseUser, signInError, signInErrorCode, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
