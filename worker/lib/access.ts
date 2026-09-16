/**
 * تحديد صلاحية النظام (access_role).
 *
 * المبدأ: الصلاحية تُشتقّ في كل طلب من توكن Firebase الموقَّع + إعداد خادم،
 * ولا تُقرأ أبداً من جسم الطلب ولا من أي شيء يرسله العميل. حتى العمود المخزَّن
 * في قاعدة البيانات ليس مصدر الحقيقة — هو أثر للمراجعة فقط.
 *
 * لماذا؟ لأن أي قيمة يرسلها العميل قابلة للتزوير، وأي قيمة مخزَّنة قابلة
 * للتقادم. أمّا التوكن فموقَّع من Google ومُتحقَّق منه في الـ Worker.
 */
import type { Env } from '../env';
import type { AccessRole } from '@shared/types';
import type { VerifiedIdentity } from './firebase-auth';

/**
 * تطبيع البريد للمقارنة: قصّ المسافات وتوحيد حالة الأحرف.
 * لا نتعامل مع نقاط Gmail ولا علامة + لأن ذلك سلوك مزوّد بعينه، وتوسيع
 * المطابقة يوسّع سطح الهجوم بلا داعٍ.
 */
export function normalizeEmail(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * هل هذه الهوية هي مدير المنصّة؟
 *
 * الشروط الثلاثة مجتمعة:
 *   1) ADMIN_EMAIL مضبوط على الخادم (لا قيمة افتراضية في الكود).
 *   2) البريد في التوكن مطابق له بعد التطبيع.
 *   3) email_verified = true — بريد غير مؤكَّد لا يمنح شيئاً، وإلا لأمكن
 *      إنشاء حساب بأي بريد والادّعاء بملكيته.
 */
export function isPlatformAdmin(
  identity: Pick<VerifiedIdentity, 'email' | 'emailVerified'>,
  env: Pick<Env, 'ADMIN_EMAIL'>,
): boolean {
  const configured = normalizeEmail(env.ADMIN_EMAIL);
  if (!configured) return false;
  if (!identity.emailVerified) return false;

  return normalizeEmail(identity.email) === configured;
}

/**
 * صلاحية النظام لهذه الهوية. المستخدم لا يختارها ولا يرسلها إطلاقاً.
 *
 * حالة خاصة مقصودة: إذا لم يكن ADMIN_EMAIL مضبوطاً على الخادم إطلاقاً،
 * لا نُرقّي أحداً — لكن لا نُنزِّل صلاحية مخزَّنة قائمة أيضاً. السبب: إعداد
 * ناقص (سرّ لم يُرفع بعد) يجب ألّا يسلب مالك المنصّة وصوله إلى لوحته.
 * أمّا إذا كان مضبوطاً ولم يطابق، فالنتيجة user قطعاً مهما كان المخزَّن.
 */
export function resolveAccessRole(
  identity: Pick<VerifiedIdentity, 'email' | 'emailVerified'>,
  env: Pick<Env, 'ADMIN_EMAIL'>,
  storedRole: AccessRole = 'user',
): AccessRole {
  if (!normalizeEmail(env.ADMIN_EMAIL)) {
    return storedRole === 'admin' ? 'admin' : 'user';
  }
  return isPlatformAdmin(identity, env) ? 'admin' : 'user';
}
