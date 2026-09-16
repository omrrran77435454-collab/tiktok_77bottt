/**
 * أين يذهب المستخدم الآن؟ — مصدر واحد لقرار التوجيه.
 *
 * القرار يعتمد على ثلاثة أشياء فقط: هل سجّل الدخول، وهل أكمل التهيئة،
 * ثم دوره داخل اللوحة. لا يدخل فيه إطلاقاً ربط تيليجرام ولا الاشتراك في
 * القناة ولا نتيجة أي نداء خارجي — فلا يستطيع عطل في خدمة أخرى أن يحبس
 * المستخدم خارج المنصّة.
 */
import type { MeResponse } from '@shared/types';

export type Destination = '/' | '/welcome' | '/dashboard';

/**
 * القاعدة بالترتيب:
 *   1) غير مسجّل       ← صفحة الهبوط
 *   2) لم يُكمل التهيئة ← /welcome
 *   3) غير ذلك          ← /dashboard
 *
 * ملاحظتان:
 *  - اللوحة واحدة في التوجيه، والتفريق بين المعلم والطالب يقع داخلها
 *    اعتماداً على profile.role (persona)، فلا نكرّر المنطق في مكانين.
 *  - صلاحية النظام (access_role) لا تغيّر الوجهة الافتراضية: المدير مستخدم
 *    له persona أيضاً، ولوحة الإدارة مسار إضافي يحرسه RequireAdmin لا وجهة
 *    إجبارية تسلبه لوحته.
 */
export function destinationFor(session: MeResponse | null | undefined): Destination {
  if (!session) return '/';
  // ملف ناقص (رد قديم أو جزئي) يُعامل كتهيئة غير مكتملة: وجهة آمنة تُحمّل
  // البيانات الحقيقية، بدل انهيار التوجيه كلّه.
  if (!session.profile?.onboardingCompleted) return '/welcome';
  return '/dashboard';
}

/** هل يُسمح للمستخدم بالبقاء على هذا المسار بحالته الحالية؟ */
export function isAllowedOn(session: MeResponse | null | undefined, path: string): boolean {
  return destinationFor(session) === path;
}
