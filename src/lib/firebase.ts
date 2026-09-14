import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

/**
 * تهيئة Firebase للواجهة.
 *
 * هذه القيم ليست أسراراً: Firebase يصمّم إعدادات الويب لتكون علنية داخل
 * حزمة المتصفّح. الحماية الحقيقية في مكانين: التحقّق من توقيع ID Token
 * في الـ Worker، وقائمة النطاقات المصرّح بها في Firebase Console.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

function hasValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && !value.startsWith('[');
}

/** هل الإعداد مكتمل؟ نعرض رسالة واضحة بدل انهيار غامض إن كان ناقصاً. */
export const isFirebaseConfigured =
  hasValue(config.apiKey) && hasValue(config.authDomain) && hasValue(config.projectId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (!authInstance) {
    app = initializeApp({
      apiKey: config.apiKey as string,
      authDomain: config.authDomain as string,
      projectId: config.projectId as string,
      appId: config.appId as string,
      messagingSenderId: config.messagingSenderId as string,
    });
    authInstance = getAuth(app);
    authInstance.languageCode = 'ar';
  }
  return authInstance;
}

export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // نطلب البريد والملف الشخصي فقط — لا صلاحيات إضافية.
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/** هل نحن في وضع اختبار E2E؟ يُحسم وقت البناء فيُحذف الفرع في الإنتاج. */
export const isE2ETestMode = import.meta.env.VITE_E2E_TEST_MODE === 'true';

export const E2E_TOKEN_KEY = 'teacher-tools:e2e-id-token';
