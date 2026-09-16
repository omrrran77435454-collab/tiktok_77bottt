/**
 * يُجهّز ملفات البيئة لتشغيل اختبارات E2E محلياً.
 *
 * لا يستبدل قيمة موجودة أبداً. القيم هنا وهمية بالكامل وللاختبار المحلي فقط،
 * ولا تتضمّن أي إعداد Firebase حقيقي (وضع الاختبار يتجاوز Firebase تماماً).
 *
 * إن كان الملف موجوداً مسبقاً بقيَم قديمة، نُضيف المفاتيح الناقصة فقط في
 * نهايته ولا نمسّ ما كتبه المطوّر — وإلا فشلت اختبارات جديدة تعتمد على مفتاح
 * أُضيف لاحقاً بسبب ملف قديم على القرص.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DEV_VARS = `# ملف تطوير/اختبار محلي — قيم وهمية بالكامل، لا تستخدمها في الإنتاج.
FIREBASE_PROJECT_ID=teacher-tools-local-test
TELEGRAM_BOT_TOKEN=000000:local-dev-mock-token
TELEGRAM_BOT_USERNAME=teacher_tools_dev_bot
TELEGRAM_CHANNEL_ID=-1001234567890
TELEGRAM_CHANNEL_JOIN_URL=https://t.me/+localdevchannel
TELEGRAM_WEBHOOK_SECRET=local-dev-webhook-secret-0123456789
ADMIN_TELEGRAM_ID=5559869840

# بريد مدير المنصّة في الاختبارات فقط — بريد محايد لا علاقة له بالإنتاج.
# الصلاحية تُمنح لمن يطابق هذا البريد ببريد مؤكَّد في التوكن، لا بمعرّف تيليجرام.
ADMIN_EMAIL=platform.owner@example.test

# يوجّه طلبات Telegram إلى الخادم الوهمي بدل الخدمة الحقيقية.
TELEGRAM_API_BASE=http://127.0.0.1:8788

# وضع الاختبار: يقبل توكنات اختبار موقّعة محلياً بدل Firebase.
E2E_TEST_MODE=true
E2E_TEST_SECRET=local-dev-e2e-secret
`;

const ENV_LOCAL = `# إعدادات الواجهة لاختبارات E2E — لا Firebase حقيقي هنا.
VITE_E2E_TEST_MODE=true
`;

/** أسماء المفاتيح المعرَّفة في نصّ قالب. */
function keysOf(content) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.slice(0, line.indexOf('=')).trim());
}

/** أسطر القالب الخاصّة بمفاتيح غير موجودة في الملف الحالي. */
function missingLines(template, current) {
  const present = new Set(keysOf(current));
  return template
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return false;
      return !present.has(trimmed.slice(0, trimmed.indexOf('=')).trim());
    });
}

for (const [path, content] of [
  ['.dev.vars', DEV_VARS],
  ['.env.local', ENV_LOCAL],
]) {
  if (!existsSync(path)) {
    writeFileSync(path, content, 'utf8');
    console.log(`[prepare-e2e] أُنشئ ${path}.`);
    continue;
  }

  const current = readFileSync(path, 'utf8');
  const missing = missingLines(content, current);
  if (missing.length === 0) {
    console.log(`[prepare-e2e] ${path} موجود ومكتمل — لم يُعدَّل.`);
    continue;
  }

  const suffix = `${current.endsWith('\n') ? '' : '\n'}\n# أُضيفت تلقائياً لأنها ناقصة.\n${missing.join('\n')}\n`;
  writeFileSync(path, current + suffix, 'utf8');
  console.log(`[prepare-e2e] ${path} موجود — أُضيفت مفاتيح ناقصة: ${missing.map((l) => l.slice(0, l.indexOf('='))).join(', ')}`);
}

console.log('[prepare-e2e] تأكّد من وجود: E2E_TEST_MODE=true و VITE_E2E_TEST_MODE=true');
