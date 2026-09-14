/**
 * يُجهّز ملف ‎.dev.vars‎ لتشغيل اختبارات E2E محلياً.
 *
 * لا يستبدل ملفاً موجوداً أبداً — إن كان لديك ‎.dev.vars‎ بالفعل،
 * تأكّد فقط أنه يحتوي القيم الثلاث المذكورة في آخر الرسالة.
 * القيم هنا وهمية بالكامل وللاختبار المحلي فقط.
 */
import { existsSync, writeFileSync } from 'node:fs';

const TARGET = '.dev.vars';

const CONTENT = `# ملف تطوير/اختبار محلي — قيم وهمية بالكامل، لا تستخدمها في الإنتاج.
GOOGLE_CLIENT_ID=local-dev-google-client-id
GOOGLE_CLIENT_SECRET=local-dev-google-client-secret
BETTER_AUTH_SECRET=local-dev-secret-not-for-production-0123456789abcdef
BETTER_AUTH_URL=http://localhost:5173
TELEGRAM_BOT_TOKEN=000000:local-dev-mock-token
TELEGRAM_BOT_USERNAME=teacher_tools_dev_bot
TELEGRAM_CHANNEL_ID=-1001234567890
TELEGRAM_CHANNEL_JOIN_URL=https://t.me/+localdevchannel
TELEGRAM_WEBHOOK_SECRET=local-dev-webhook-secret-0123456789
ADMIN_TELEGRAM_ID=5559869840

# يوجّه طلبات Telegram إلى الخادم الوهمي بدل الخدمة الحقيقية.
TELEGRAM_API_BASE=http://127.0.0.1:8788

# وضع الاختبار: يفعّل تسجيل الدخول بالبريد لاختبارات E2E فقط.
E2E_TEST_MODE=true
E2E_TEST_SECRET=local-dev-e2e-secret
`;

if (existsSync(TARGET)) {
  console.log(`[prepare-e2e] الملف ${TARGET} موجود — لم يُعدَّل.`);
  console.log('[prepare-e2e] تأكّد أنه يحتوي:');
  console.log('  E2E_TEST_MODE=true');
  console.log('  E2E_TEST_SECRET=<أي قيمة>');
  console.log('  TELEGRAM_API_BASE=http://127.0.0.1:8788');
} else {
  writeFileSync(TARGET, CONTENT, 'utf8');
  console.log(`[prepare-e2e] أُنشئ ${TARGET} بقيم اختبار وهمية.`);
}
