import { E2E_TOKEN_KEY, getFirebaseAuth, isE2ETestMode } from './firebase';

/**
 * يُرجع Firebase ID Token الحالي لإرفاقه بطلبات الـ API.
 *
 * دالة عادية خارج شجرة React عن قصد: لو كانت مسجَّلة عبر useEffect لكان
 * ترتيب التأثيرات (تأثيرات الابن قبل الأب) يعني أن أول طلب ‎/api/me‎ يخرج
 * قبل تسجيل مصدر التوكن فيرجع 401. هكذا التوكن متاح دائماً من أول طلب.
 */
export async function getIdToken(): Promise<string | null> {
  if (isE2ETestMode) {
    try {
      return localStorage.getItem(E2E_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return null;

  try {
    // Firebase يجدّد التوكن تلقائياً عند اقتراب انتهائه.
    return await user.getIdToken();
  } catch {
    return null;
  }
}
