/**
 * استخراج آمن لرمز خطأ Firebase وعرضه للمستخدم.
 *
 * لماذا؟ كانت رسالة الفشل تُختزل إلى نص عام واحد («تعذّر تسجيل الدخول بقوقل»)
 * لأن دالة الترجمة تُرجع الرسالة الافتراضية لأي رمز غير معروف — فيضيع
 * FirebaseError.code وهو المعلومة الوحيدة التي تحدّد السبب الحقيقي.
 *
 * مبدأ الأمان هنا: قائمة سماح بالشكل (allowlist) لا قائمة منع. لا يصل إلى
 * الواجهة إلا نصٌّ يطابق شكل رموز Firebase «خدمة/رمز» بأحرف صغيرة وشرطات
 * فقط. أي توكن أو بريد أو رابط أو stack trace لا يطابق هذا الشكل إطلاقاً،
 * فيُرفض ويُعاد null بدل تسريبه.
 */

/** شكل رموز Firebase: «auth/unauthorized-domain»، «app/no-app» … */
const FIREBASE_CODE_PATTERN = /^[a-z][a-z0-9-]{0,31}\/[a-z0-9-]{1,63}$/;

/** يُرجع رمز الخطأ إن كان بشكل رموز Firebase، وإلا null. */
export function extractAuthErrorCode(error: unknown): string | null {
  const raw = (error as { code?: unknown } | null | undefined)?.code;
  if (typeof raw !== 'string') return null;

  const code = raw.trim().toLowerCase();
  return FIREBASE_CODE_PATTERN.test(code) ? code : null;
}

/** رسائل عربية لأشهر أخطاء تسجيل الدخول. */
export function messageForSignInError(code: string | null): string {
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
    case 'auth/web-storage-unsupported':
      return 'المتصفّح يمنع تخزين بيانات تسجيل الدخول. أوقف التصفّح الخاص أو اسمح بملفات تعريف الارتباط ثم حاول مرة ثانية.';
    default:
      return 'تعذّر تسجيل الدخول بقوقل. حاول مرة ثانية.';
  }
}

/** ما يُعرض تحت الرسالة العامة — رمز الخطأ وحده، بلا أي بيانات أخرى. */
export function describeSignInError(error: unknown): { message: string; code: string | null } {
  const code = extractAuthErrorCode(error);
  return { message: messageForSignInError(code), code };
}

/**
 * يسجّل تفاصيل الفشل في console للتشخيص (code و message و name فقط).
 * لا يُسجَّل الكائن كاملاً حتى لا يظهر أي توكن أو بيانات حساب في سجل المتصفّح.
 */
export function logSignInError(context: string, error: unknown): void {
  const details = error as { code?: unknown; message?: unknown; name?: unknown } | null | undefined;
  console.error(`[auth] ${context}`, {
    code: typeof details?.code === 'string' ? details.code : '(بلا رمز)',
    message: typeof details?.message === 'string' ? details.message : String(error),
    name: typeof details?.name === 'string' ? details.name : '(بلا اسم)',
  });
}
