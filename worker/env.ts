/**
 * متغيّرات البيئة التي يعتمد عليها الـ Worker.
 * جميع القيم الحسّاسة تأتي من Cloudflare Secrets (أو ملف .dev.vars محلياً)
 * ولا يوجد أي منها داخل الكود أو داخل حزمة الواجهة.
 */
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;

  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;

  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  TELEGRAM_CHANNEL_ID: string;
  TELEGRAM_CHANNEL_JOIN_URL: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  /** عنوان Telegram Bot API — قابل للتغيير في الاختبارات فقط. */
  TELEGRAM_API_BASE?: string;

  ADMIN_TELEGRAM_ID: string;

  /** وضع الاختبار: يفعّل تسجيل دخول بالبريد لأغراض E2E فقط. */
  E2E_TEST_MODE?: string;
  E2E_TEST_SECRET?: string;
}

/** هل وضع الاختبار مفعّل؟ يتطلّب العلم + سرّاً غير فارغ معاً. */
export function isTestMode(env: Env): boolean {
  return env.E2E_TEST_MODE === 'true' && !!env.E2E_TEST_SECRET;
}

/** أسماء المتغيّرات المطلوبة لتشغيل النظام في الإنتاج. */
const REQUIRED_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNAME',
  'TELEGRAM_CHANNEL_ID',
  'TELEGRAM_CHANNEL_JOIN_URL',
  'TELEGRAM_WEBHOOK_SECRET',
  'ADMIN_TELEGRAM_ID',
] as const;

/** يُرجع قائمة المتغيّرات الناقصة (للتشخيص، لا يطبع أي قيمة). */
export function missingEnvVars(env: Env): string[] {
  return REQUIRED_VARS.filter((key) => {
    const value = env[key];
    return typeof value !== 'string' || value.trim() === '' || value.startsWith('[');
  });
}
