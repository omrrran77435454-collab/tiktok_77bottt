/**
 * نشر "أدوات المعلم" على Cloudflare Workers — آلي بالكامل.
 *
 * ما يفعله بالترتيب:
 *   1) يتأكّد من المصادقة (CLOUDFLARE_API_TOKEN).
 *   2) ينشئ قاعدة D1 إن لم تكن موجودة، ويأخذ معرّفها.
 *   3) يكتب المعرّف في wrangler.jsonc.
 *   4) يطبّق الـ migrations على القاعدة البعيدة.
 *   5) ينشر الـ Worker ويستخرج رابط الإنتاج.
 *   6) يضبط الأسرار من متغيّرات البيئة (بلا طباعة أي قيمة).
 *   7) يضبط Webhook تيليجرام ويتحقّق منه.
 *   8) يشغّل فحص صحّة على النسخة المنشورة.
 *
 * التشغيل: node scripts/deploy.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const DB_NAME = 'teacher-tools-db';
const CONFIG = 'wrangler.jsonc';

/** الأسرار التي تُرفع إلى Cloudflare. القيم تأتي من البيئة ولا تُطبع أبداً. */
const SECRET_NAMES = [
  'FIREBASE_PROJECT_ID',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNAME',
  'TELEGRAM_CHANNEL_ID',
  'TELEGRAM_CHANNEL_JOIN_URL',
  'TELEGRAM_WEBHOOK_SECRET',
  'ADMIN_TELEGRAM_ID',
];

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options });
}

function wrangler(args, options = {}) {
  return run('npx', ['wrangler', ...args], options);
}

function step(message) {
  console.log(`\n▸ ${message}`);
}

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

/* ------------------------------ 1) المصادقة ------------------------------ */
step('التحقّق من المصادقة مع Cloudflare');
if (!process.env.CLOUDFLARE_API_TOKEN) {
  fail('المتغيّر CLOUDFLARE_API_TOKEN غير مضبوط.');
}
try {
  const who = wrangler(['whoami']);
  const account = /│\s*(.+?)\s*│\s*([0-9a-f]{32})\s*│/.exec(who);
  console.log(account ? `  الحساب: ${account[1]}` : '  المصادقة سليمة.');
} catch (error) {
  fail(`تعذّر التحقّق من الحساب:\n${error.stdout ?? error.message}`);
}

/* ------------------------------ 2) قاعدة D1 ------------------------------ */
step(`تجهيز قاعدة D1 «${DB_NAME}»`);
let databaseId = '';
try {
  const list = JSON.parse(wrangler(['d1', 'list', '--json']));
  databaseId = list.find((entry) => entry.name === DB_NAME)?.uuid ?? '';
} catch {
  databaseId = '';
}

if (!databaseId) {
  console.log('  القاعدة غير موجودة — سيتم إنشاؤها.');
  wrangler(['d1', 'create', DB_NAME]);
  const list = JSON.parse(wrangler(['d1', 'list', '--json']));
  databaseId = list.find((entry) => entry.name === DB_NAME)?.uuid ?? '';
}

if (!databaseId) fail('تعذّر الحصول على معرّف قاعدة D1.');
console.log(`  معرّف القاعدة جاهز (${databaseId.slice(0, 8)}…).`);

/* --------------------------- 3) تحديث الإعدادات --------------------------- */
step('كتابة معرّف القاعدة في wrangler.jsonc');
const config = readFileSync(CONFIG, 'utf8');
const updated = config.replace(
  /("database_id"\s*:\s*")[^"]*(")/,
  (_match, prefix, suffix) => `${prefix}${databaseId}${suffix}`,
);
if (updated === config && !config.includes(databaseId)) {
  fail('لم يُعثر على حقل database_id في ملف الإعدادات.');
}
writeFileSync(CONFIG, updated, 'utf8');
console.log('  تم.');

/* ------------------------------ 4) Migrations ----------------------------- */
step('تطبيق الـ migrations على قاعدة الإنتاج');
try {
  const output = wrangler(['d1', 'migrations', 'apply', DB_NAME, '--remote'], {
    input: 'y\n',
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  });
  console.log(output.split('\n').filter((line) => line.includes('✅') || line.includes('No migrations')).join('\n') || '  تم.');
} catch (error) {
  fail(`فشل تطبيق الـ migrations:\n${error.stdout ?? error.message}`);
}

/* -------------------------------- 5) النشر -------------------------------- */
step('نشر الـ Worker');
let productionUrl = '';
try {
  const output = wrangler(['deploy'], {
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  });
  console.log(output.trim().split('\n').slice(-12).join('\n'));
  productionUrl = (/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i.exec(output) ?? [''])[0];
} catch (error) {
  fail(`فشل النشر:\n${error.stdout ?? error.message}`);
}

if (!productionUrl) fail('تعذّر استخراج رابط الإنتاج من مخرجات النشر.');
console.log(`\n  رابط الإنتاج: ${productionUrl}`);

/* ------------------------------- 6) الأسرار ------------------------------- */
step('رفع الأسرار إلى Cloudflare');
for (const name of SECRET_NAMES) {
  const value = process.env[name];
  if (!value) {
    console.log(`  ⚠ ${name}: غير مضبوط في البيئة — تخطّي.`);
    continue;
  }
  wrangler(['secret', 'put', name], {
    input: `${value}\n`,
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  });
  console.log(`  ✓ ${name}`); // الاسم فقط — لا تُطبع أي قيمة أبداً.
}

/* ---------------------------- 7) Webhook تيليجرام --------------------------- */
step('ضبط Webhook تيليجرام');
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (botToken && webhookSecret) {
  const webhookUrl = `${productionUrl}/api/telegram/webhook`;
  const setResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  });
  const setResult = await setResponse.json();
  console.log(`  setWebhook: ${setResult.ok ? 'نجح' : `فشل — ${setResult.description}`}`);

  const infoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const info = await infoResponse.json();
  if (info.ok) {
    console.log(`  عنوان الـ Webhook: ${info.result.url}`);
    console.log(`  تحديثات معلّقة: ${info.result.pending_update_count ?? 0}`);
    console.log(`  آخر خطأ: ${info.result.last_error_message ?? 'لا يوجد'}`);
  }
} else {
  console.log('  ⚠ متغيّرات تيليجرام ناقصة — تخطّي ضبط الـ Webhook.');
}

/* ----------------------------- 8) فحص الصحّة ----------------------------- */
step('فحص صحّة النسخة المنشورة');
await new Promise((resolve) => setTimeout(resolve, 4000));

const health = await fetch(`${productionUrl}/api/health`).then((response) => response.json());
console.log(`  ok=${health.ok}  testMode=${health.testMode}`);
if (health.missingConfig?.length) {
  console.log(`  ⚠ إعدادات ناقصة: ${health.missingConfig.join(', ')}`);
}

for (const path of ['/', '/privacy', '/terms', '/favicon.ico', '/icon-192.png', '/site.webmanifest']) {
  const response = await fetch(`${productionUrl}${path}`);
  console.log(`  ${path} → ${response.status}`);
}

console.log(`\n✅ اكتمل النشر: ${productionUrl}`);
writeFileSync('deploy-url.txt', productionUrl, 'utf8');
