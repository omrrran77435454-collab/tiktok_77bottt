/**
 * نصوص رسائل بوت تيليجرام + مصدر واحد لرابط القناة.
 *
 * قاعدة: رابط القناة لا يُكتب داخل أي رسالة يدوياً. كل الرسائل تُبنى من هنا،
 * فيكفي تغيير إعداد واحد ليتغيّر الرابط في كل مكان.
 *
 * لا تحتوي أي رسالة هنا على سرّ، ولا توكن ربط، ولا معرّف Firebase.
 */
import type { Env } from '../env';

/** رابط القناة الافتراضي عندما لا يكون TELEGRAM_CHANNEL_JOIN_URL مضبوطاً. */
export const DEFAULT_CHANNEL_URL = 'https://t.me/PromptsArabic';

/**
 * المصدر الوحيد لرابط القناة: الإعداد إن وُجد، وإلا الافتراضي.
 * نتجاهل القيم الفارغة أو النائبة (مثل "[ضع الرابط]") لأنها ليست روابط.
 */
export function channelUrl(env: Pick<Env, 'TELEGRAM_CHANNEL_JOIN_URL'>): string {
  const configured = env.TELEGRAM_CHANNEL_JOIN_URL;
  if (typeof configured !== 'string') return DEFAULT_CHANNEL_URL;

  const trimmed = configured.trim();
  if (!trimmed || trimmed.startsWith('[') || !/^https?:\/\//i.test(trimmed)) {
    return DEFAULT_CHANNEL_URL;
  }
  return trimmed;
}

/** ذيل ثابت يُلحق بكل رسالة: رابط القناة قابل للضغط في آخر الرسالة. */
export function channelFooter(env: Pick<Env, 'TELEGRAM_CHANNEL_JOIN_URL'>): string {
  const url = channelUrl(env);
  return `\n\n📣 رابط القناة\n<a href="${url}">${url}</a>`;
}

/** يضيف ذيل القناة إلى أي نص رسالة. */
export function withChannelFooter(
  env: Pick<Env, 'TELEGRAM_CHANNEL_JOIN_URL'>,
  body: string,
): string {
  return `${body.trimEnd()}${channelFooter(env)}`;
}

type MessageEnv = Pick<Env, 'TELEGRAM_CHANNEL_JOIN_URL'>;

/** رسائل البوت — كلها تنتهي برابط القناة عبر withChannelFooter. */
export const botMessages = {
  /** /start بلا توكن: المستخدم لم يبدأ الربط من الموقع. */
  welcome: (env: MessageEnv) =>
    withChannelFooter(
      env,
      '👋 مرحباً بك في <b>أدوات المعلم</b>\n\n' +
        'لربط حسابك، افتح الموقع وسجّل الدخول ثم اضغط زر «ربط Telegram».',
    ),

  /** ربط ناجح والاشتراك غير مؤكَّد بعد. */
  linkedNeedsSubscription: (env: MessageEnv) =>
    withChannelFooter(
      env,
      '✅ <b>تم ربط حسابك بنجاح</b>\n\n' +
        'بقيت خطوة واحدة:\n' +
        'اشترك في القناة ثم ارجع إلى الموقع واضغط «تحقق من الاشتراك».',
    ),

  /** ربط ناجح والاشتراك مؤكَّد. */
  linkedSubscribed: (env: MessageEnv) =>
    withChannelFooter(
      env,
      '✅ <b>حسابك مربوط واشتراكك في القناة مؤكَّد</b>\n\n' +
        'يمكنك استخدام أدوات المنصّة الآن — ارجع إلى الموقع.',
    ),

  /** الحساب مربوط مسبقاً ويرسل /start من جديد. */
  alreadyLinked: (env: MessageEnv) =>
    withChannelFooter(
      env,
      '✅ <b>حسابك مربوط بالفعل</b>\n\n' +
        'لا تحتاج إلى إرسال /start مرة أخرى. ارجع إلى الموقع لمتابعة استخدام الأدوات.',
    ),

  /** توكن منتهٍ أو مستخدَم. */
  expiredToken: (env: MessageEnv) =>
    withChannelFooter(
      env,
      '⛔ <b>انتهت صلاحية رابط الربط أو سبق استخدامه</b>\n\n' +
        'ارجع إلى الموقع واضغط «ربط Telegram» من جديد.',
    ),

  /** حساب تيليجرام مرتبط بحساب منصّة آخر. */
  linkedToAnotherAccount: (env: MessageEnv) =>
    withChannelFooter(
      env,
      '⛔ <b>حساب تيليجرام هذا مرتبط بحساب آخر في المنصة</b>\n\n' +
        'استخدم نفس الحساب الذي ربطته سابقاً، أو افصل الربط من صفحة «حسابي».',
    ),
} as const;
