/**
 * يُجهّز ملفات البيئة لتشغيل اختبارات E2E محلياً.
 *
 * لا يستبدل ملفاً موجوداً أبداً. القيم هنا وهمية بالكامل وللاختبار المحلي فقط،
 * ولا تتضمّن أي إعداد Firebase حقيقي (وضع الاختبار يتجاوز Firebase تماماً).
 */
import { existsSync, writeFileSync } from 'node:fs';

const DEV_VARS = `# ملف تطوير/اختبار محلي — قيم وهمية بالكامل، لا تستخدمها في الإنتاج.
FIREBASE_PROJECT_ID=teacher-tools-local-test
TELEGRAM_BOT_TOKEN=000000:local-dev-mock-token
TELEGRAM_BOT_USERNAME=teacher_tools_dev_bot
TELEGRAM_CHANNEL_ID=-1001234567890
TELEGRAM_CHANNEL_JOIN_URL=https://t.me/+localdevchannel
TELEGRAM_WEBHOOK_SECRET=local-dev-webhook-secret-0123456789
ADMIN_TELEGRAM_ID=5559869840

# يوجّه طلبات Telegram إلى الخادم الوهمي بدل الخدمة الحقيقية.
TELEGRAM_API_BASE=http://127.0.0.1:8788

# وضع الاختبار: يقبل توكنات اختبار موقّعة محلياً بدل Firebase.
E2E_TEST_MODE=true
E2E_TEST_SECRET=local-dev-e2e-secret
`;

const ENV_LOCAL = `# إعدادات الواجهة لاختبارات E2E — لا Firebase حقيقي هنا.
VITE_E2E_TEST_MODE=true
`;

for (const [path, content] of [
  ['.dev.vars', DEV_VARS],
  ['.env.local', ENV_LOCAL],
]) {
  if (existsSync(path)) {
    console.log(`[prepare-e2e] ${path} موجود — لم يُعدَّل.`);
  } else {
    writeFileSync(path, content, 'utf8');
    console.log(`[prepare-e2e] أُنشئ ${path}.`);
  }
}

console.log('[prepare-e2e] تأكّد من وجود: E2E_TEST_MODE=true و VITE_E2E_TEST_MODE=true');
