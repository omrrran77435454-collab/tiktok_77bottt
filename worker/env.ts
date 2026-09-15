/**
 * متغيّرات البيئة التي يعتمد عليها الـ Worker.
 *
 * كل القيم الحسّاسة تأتي من Cloudflare Secrets (أو ملف .dev.vars محلياً)
 * ولا يوجد أي منها داخل الكود أو داخل حزمة الواجهة.
 *
 * ملاحظة: إعدادات Firebase الخاصة بالواجهة (VITE_FIREBASE_*) ليست أسراراً —
 * فهي تُضمَّن في حزمة المتصفّح بحكم تصميم Firebase، والحماية الحقيقية تأتي من
 * التحقّق من التوقيع في الخادم ومن قواعد Firebase Console.
 */
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;

  /** معرّف مشروع Firebase — يُستخدم للتحقّق من issuer و audience. */
  FIREBASE_PROJECT_ID: string;

  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  TELEGRAM_CHANNEL_ID: string;
  TELEGRAM_CHANNEL_JOIN_URL: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  /** عنوان Telegram Bot API — قابل للتغيير في الاختبارات فقط. */
  TELEGRAM_API_BASE?: string;

  ADMIN_TELEGRAM_ID: string;

  /**
   * بريد مدير المنصّة. ليس سرّاً تشفيرياً، لكنه إعداد خادم: العميل لا يقرأه
   * ولا يقرّر بناءً عليه. المقارنة تقع في الـ Worker مع بريد مؤكَّد من التوكن.
   */
  ADMIN_EMAIL: string;

  /** وضع الاختبار: يقبل توكنات اختبار موقّعة محلياً بدل Firebase. */
  E2E_TEST_MODE?: string;
  E2E_TEST_SECRET?: string;
}

/** هل وضع الاختبار مفعّل؟ يتطلّب العلم + سرّاً غير فارغ معاً. */
export function isTestMode(env: Env): boolean {
  return env.E2E_TEST_MODE === 'true' && !!env.E2E_TEST_SECRET;
}

/** أسماء المتغيّرات المطلوبة لتشغيل النظام في الإنتاج. */
const REQUIRED_VARS = [
  'FIREBASE_PROJECT_ID',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNAME',
  'TELEGRAM_CHANNEL_ID',
  'TELEGRAM_CHANNEL_JOIN_URL',
  'TELEGRAM_WEBHOOK_SECRET',
  'ADMIN_TELEGRAM_ID',
  'ADMIN_EMAIL',
] as const;

/** يُرجع قائمة المتغيّرات الناقصة (للتشخيص، لا يطبع أي قيمة). */
export function missingEnvVars(env: Env): string[] {
  return REQUIRED_VARS.filter((key) => {
    const value = env[key];
    return typeof value !== 'string' || value.trim() === '' || value.startsWith('[');
  });
}
