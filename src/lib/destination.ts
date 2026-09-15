/**
 * أين يذهب المستخدم الآن؟ — مصدر واحد لقرار التوجيه.
 *
 * كان القرار موزّعاً على عدة أماكن (الحرّاس، صفحة البوابة، اللوحة) فتفرّعت
 * الاحتمالات واختلفت، فظهر ارتداد إلى بوابة تيليجرام بعد نجاحها. الآن كل
 * جهة تسأل هذه الدالة وحدها.
 *
 * المدخل حالة الخادم كما هي (من /api/me) — لا React state ولا localStorage.
 */
import type { MeResponse } from '@shared/types';

export type Destination = '/' | '/connect' | '/welcome' | '/dashboard';

/**
 * القاعدة بالترتيب:
 *   1) غير مسجّل            ← صفحة الهبوط
 *   2) لم يجتز بوابة تيليجرام ← /connect
 *   3) لم يُكمل التهيئة       ← /welcome
 *   4) غير ذلك               ← /dashboard (وهي توزّع على لوحة المعلم أو الطالب)
 *
 * ملاحظة: اللوحة واحدة في التوجيه، والتفريق بين المعلم والطالب يقع داخلها
 * اعتماداً على profile.role، فلا نكرّر المنطق في مكانين.
 */
export function destinationFor(session: MeResponse | null | undefined): Destination {
  if (!session) return '/';
  if (!session.canUseTools) return '/connect';
  // ملف ناقص (رد قديم أو جزئي) يُعامل كتهيئة غير مكتملة: وجهة آمنة تُحمّل
  // البيانات الحقيقية، بدل انهيار التوجيه كلّه.
  if (!session.profile?.onboardingCompleted) return '/welcome';
  return '/dashboard';
}

/** هل يُسمح للمستخدم بالبقاء على هذا المسار بحالته الحالية؟ */
export function isAllowedOn(session: MeResponse | null | undefined, path: string): boolean {
  return destinationFor(session) === path;
}
