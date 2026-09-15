// @vitest-environment node
/**
 * يثبت أن رابط القناة يظهر في نهاية كل رسالة بوت، من مصدر واحد،
 * وأن أي سرّ لا يتسرّب إلى نصوص الرسائل.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHANNEL_URL,
  botMessages,
  channelFooter,
  channelUrl,
  withChannelFooter,
} from '../worker/lib/telegram-messages';

const CONFIGURED = 'https://t.me/TeacherToolsChannel';

const envWith = (value: unknown) =>
  ({ TELEGRAM_CHANNEL_JOIN_URL: value }) as { TELEGRAM_CHANNEL_JOIN_URL: string };

const allMessages = Object.entries(botMessages);

describe('channelUrl', () => {
  it('يستخدم قيمة TELEGRAM_CHANNEL_JOIN_URL عندما تكون موجودة', () => {
    expect(channelUrl(envWith(CONFIGURED))).toBe(CONFIGURED);
  });

  it('يتجاهل المسافات حول القيمة المضبوطة', () => {
    expect(channelUrl(envWith(`  ${CONFIGURED}  `))).toBe(CONFIGURED);
  });

  it('يرجع https://t.me/PromptsArabic عندما يكون الإعداد غائباً', () => {
    expect(DEFAULT_CHANNEL_URL).toBe('https://t.me/PromptsArabic');
    expect(channelUrl(envWith(undefined))).toBe(DEFAULT_CHANNEL_URL);
    expect(channelUrl(envWith(''))).toBe(DEFAULT_CHANNEL_URL);
    expect(channelUrl(envWith('   '))).toBe(DEFAULT_CHANNEL_URL);
  });

  it('يتجاهل القيم النائبة أو غير الصالحة ويعود للافتراضي', () => {
    expect(channelUrl(envWith('[ضع رابط القناة]'))).toBe(DEFAULT_CHANNEL_URL);
    expect(channelUrl(envWith('PromptsArabic'))).toBe(DEFAULT_CHANNEL_URL);
    expect(channelUrl(envWith(42))).toBe(DEFAULT_CHANNEL_URL);
  });
});

describe('channelFooter', () => {
  it('يجعل الرابط قابلاً للضغط', () => {
    const footer = channelFooter(envWith(CONFIGURED));
    expect(footer).toContain(`<a href="${CONFIGURED}">${CONFIGURED}</a>`);
  });

  it('يُلحق الرابط في نهاية النص لا في وسطه', () => {
    const message = withChannelFooter(envWith(CONFIGURED), 'نص الرسالة');
    expect(message.startsWith('نص الرسالة')).toBe(true);
    expect(message.trimEnd().endsWith('</a>')).toBe(true);
  });
});

describe('رسائل البوت', () => {
  it.each(allMessages)('رسالة %s تنتهي برابط القناة الافتراضي', (_name, build) => {
    const text = build(envWith(undefined));
    expect(text).toContain('رابط القناة');
    expect(text).toContain(DEFAULT_CHANNEL_URL);
    expect(text.trimEnd().endsWith(`<a href="${DEFAULT_CHANNEL_URL}">${DEFAULT_CHANNEL_URL}</a>`)).toBe(
      true,
    );
  });

  it.each(allMessages)('رسالة %s تستخدم الرابط المضبوط عندما يوجد', (_name, build) => {
    const text = build(envWith(CONFIGURED));
    expect(text).toContain(CONFIGURED);
    expect(text).not.toContain(DEFAULT_CHANNEL_URL);
  });

  it.each(allMessages)('رسالة %s لا تحتوي أي سرّ أو معرّف داخلي', (_name, build) => {
    const text = build(envWith(CONFIGURED));
    const forbidden = [
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_WEBHOOK_SECRET',
      'CLOUDFLARE',
      'firebase',
      'Firebase',
      'uid',
      'UID',
      'token=',
      'Bearer',
    ];
    for (const needle of forbidden) {
      expect(text).not.toContain(needle);
    }
    // لا أرقام طويلة تشبه التوكنات.
    expect(text).not.toMatch(/\d{9,}/);
  });

  it('رسالة الترحيب توجّه المستخدم إلى الموقع لا إلى كتابة أوامر', () => {
    const text = botMessages.welcome(envWith(CONFIGURED));
    expect(text).toContain('أدوات المعلم');
    expect(text).toContain('ربط Telegram');
  });

  it('رسالة ما بعد الربط تشرح الخطوة الواحدة المتبقّية', () => {
    const text = botMessages.linkedNeedsSubscription(envWith(CONFIGURED));
    expect(text).toContain('تم ربط حسابك بنجاح');
    expect(text).toContain('تحقق من الاشتراك');
  });

  it('رسالة المشترك تؤكّد أن كل شيء جاهز', () => {
    const text = botMessages.linkedSubscribed(envWith(CONFIGURED));
    expect(text).toContain('مؤكَّد');
  });

  it('رسالة الحساب المربوط مسبقاً لا تطلب /start من جديد', () => {
    const text = botMessages.alreadyLinked(envWith(CONFIGURED));
    expect(text).toContain('مربوط بالفعل');
    expect(text).toContain('لا تحتاج إلى إرسال /start مرة أخرى');
  });
});
