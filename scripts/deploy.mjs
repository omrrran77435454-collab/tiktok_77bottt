/**
 * نشر "أدوات المعلم" على Cloudflare Workers — آلي بالكامل.
 *
 * ما يفعله بالترتيب:
 *   1) يتأكّد من المصادقة (CLOUDFLARE_API_TOKEN).
 *   2) ينشئ قاعدة D1 إن لم تكن موجودة، ويأخذ معرّفها.
 *   3) يكتب المعرّف في wrangler.jsonc وفي إعداد Wrangler المولَّد داخل dist.
 *   4) يطبّق الـ migrations على القاعدة البعيدة.
 *   5) يتحقّق من المعرّف ثم ينشر الـ Worker ويستخرج رابط الإنتاج.
 *   6) يضبط الأسرار من متغيّرات البيئة (بلا طباعة أي قيمة).
 *   7) يضبط Webhook تيليجرام ويتحقّق منه.
 *   8) يشغّل فحص صحّة على النسخة المنشورة.
 *
 * مبدأ التشخيص: كل ما يكتبه wrangler على stdout و stderr يُعرض كاملاً وفوراً
 * في سجل GitHub Actions — أثناء التنفيذ وعند الفشل. لا يُبتلع أي سطر ولا
 * يُقتطع أي مخرَج. الاستثناء الوحيد هو قيم الأسرار نفسها (تُستبدل بـ ***).
 *
 * التشغيل: node scripts/deploy.mjs
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  isDatabaseId,
  readDatabaseIdFromGeneratedConfig,
  resolveGeneratedConfigPath,
  setDatabaseIdInGeneratedConfig,
  setDatabaseIdInSourceConfig,
  shortId,
} from './wrangler-config.mjs';

const DB_NAME = 'teacher-tools-db';
const DB_BINDING = 'DB';
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

/**
 * القيم التي تُحجب من كل مخرَج قبل طباعته.
 *
 * نعرض كل رسائل wrangler كاملة للتشخيص، وسجلّ Actions قد يكون علنياً،
 * فنحجب قيم الأسرار الحقيقية فقط — لا رسائل الخطأ.
 */
const REDACTED_VALUES = [
  process.env.CLOUDFLARE_API_TOKEN,
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_WEBHOOK_SECRET,
].filter((value) => typeof value === 'string' && value.length >= 8);

function redact(text) {
  let output = String(text ?? '');
  for (const value of REDACTED_VALUES) output = output.split(value).join('***');
  return output;
}

function step(message) {
  console.log(`\n▸ ${message}`);
}

/** خطأ تنفيذ أمر خارجي، يحمل المخرجات كاملة ورمز الخروج الحقيقي. */
class CommandError extends Error {
  constructor(commandLine, code, signal, stdout, stderr) {
    super(`فشل الأمر (رمز الخروج ${code ?? signal}): ${commandLine}`);
    this.name = 'CommandError';
    this.commandLine = commandLine;
    this.code = code;
    this.signal = signal;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

/**
 * ينفّذ أمراً خارجياً مع بثّ مخرجاته حيّة إلى سجلّ Actions، ومع الاحتفاظ بها.
 *
 * لماذا spawn وليس execFileSync؟ لأن execFileSync إمّا أن يلتقط المخرجات
 * (فلا تظهر شيئاً أثناء التنفيذ) أو يمرّرها (فلا نستطيع تحليلها). هنا نمرّر
 * ونلتقط معاً: السجل يعرض كل شيء أولاً بأول، والسكربت يحتفظ بالنص
 * لاستخراج رابط الإنتاج أو قراءة JSON.
 */
function exec(command, args, options = {}) {
  const { input, env, label } = options;
  const commandLine = label ?? `${command} ${args.join(' ')}`;

  return new Promise((resolve, reject) => {
    console.log(`\n$ ${redact(commandLine)}`);

    const child = spawn(command, args, {
      env: env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    // تمرير + التقاط: يظهر في السجل فوراً ويبقى متاحاً للتحليل.
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      process.stdout.write(redact(chunk));
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      process.stderr.write(redact(chunk));
    });

    child.on('error', (error) => reject(error));

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new CommandError(commandLine, code, signal, stdout, stderr));
    });

    if (input !== undefined) child.stdin.write(input);
    child.stdin.end();
  });
}

function wrangler(args, options = {}) {
  return exec('npx', ['wrangler', ...args], {
    ...options,
    env: {
      ...process.env,
      CI: 'true',
      WRANGLER_SEND_METRICS: 'false',
      ...(options.env ?? {}),
    },
  });
}

/**
 * ينهي التنفيذ بعد طباعة سبب الفشل كاملاً.
 * عندما يكون السبب فشل أمر خارجي نعيد طباعة stdout و stderr صراحةً
 * (رغم بثّهما مسبقاً) حتى يكون السبب ظاهراً في آخر السجل ولا يضيع وسط الضجيج.
 */
function fail(message, error) {
  console.error(`\n${'='.repeat(72)}`);
  console.error(`✖ ${message}`);

  if (error instanceof CommandError) {
    console.error(`  الأمر     : ${redact(error.commandLine)}`);
    console.error(`  رمز الخروج: ${error.code ?? `إشارة ${error.signal}`}`);

    const stdout = redact(error.stdout).trim();
    const stderr = redact(error.stderr).trim();

    console.error(`\n--- stdout (${stdout ? `${stdout.length} حرفاً` : 'فارغ'}) ---`);
    if (stdout) console.error(stdout);

    console.error(`\n--- stderr (${stderr ? `${stderr.length} حرفاً` : 'فارغ'}) ---`);
    if (stderr) console.error(stderr);

    if (!stdout && !stderr) {
      console.error('لم يكتب الأمر أي مخرَج. جرّب WRANGLER_LOG=debug لمزيد من التفاصيل.');
    }
  } else if (error) {
    console.error(`\n${redact(error.stack ?? error.message ?? String(error))}`);
  }

  console.error(`${'='.repeat(72)}\n`);
  process.exit(typeof error?.code === 'number' && error.code !== 0 ? error.code : 1);
}

/* ------------------------------ 0) معلومات البيئة ------------------------------ */
step('معلومات البيئة');
console.log(`  Node: ${process.version}`);
try {
  const { stdout } = await wrangler(['--version']);
  console.log(`  Wrangler: ${stdout.trim().split('\n').pop()}`);
} catch (error) {
  fail('تعذّر تشغيل wrangler.', error);
}

/* ------------------------------ 1) المصادقة ------------------------------ */
step('التحقّق من المصادقة مع Cloudflare');
if (!process.env.CLOUDFLARE_API_TOKEN) {
  fail('المتغيّر CLOUDFLARE_API_TOKEN غير مضبوط.');
}
try {
  const { stdout } = await wrangler(['whoami']);
  const account = /│\s*(.+?)\s*│\s*([0-9a-f]{32})\s*│/.exec(stdout);
  if (account) console.log(`\n  الحساب: ${account[1]}`);
} catch (error) {
  fail('تعذّر التحقّق من الحساب. تأكّد أن CLOUDFLARE_API_TOKEN صالح وبالصلاحيات المطلوبة.', error);
}

/* ------------------------------ 2) قاعدة D1 ------------------------------ */
step(`تجهيز قاعدة D1 «${DB_NAME}»`);

/** يقرأ قائمة قواعد D1. يُرجع null إذا فشل الأمر (مع إظهار السبب). */
async function listDatabases() {
  try {
    const { stdout } = await wrangler(['d1', 'list', '--json']);
    const start = stdout.indexOf('[');
    if (start === -1) {
      console.warn('  ⚠ لم يُرجع الأمر JSON صالحاً.');
      return null;
    }
    return JSON.parse(stdout.slice(start));
  } catch (error) {
    if (error instanceof CommandError) {
      console.warn(`  ⚠ تعذّر سرد قواعد D1 (رمز ${error.code}). التفاصيل أعلاه.`);
      return null;
    }
    throw error;
  }
}

let databases = await listDatabases();
if (databases === null) {
  fail('تعذّر سرد قواعد D1. غالباً تحتاج صلاحية D1:Edit في الـ API Token.');
}

let databaseId = databases.find((entry) => entry.name === DB_NAME)?.uuid ?? '';

if (!databaseId) {
  console.log(`\n  القاعدة «${DB_NAME}» غير موجودة — سيتم إنشاؤها.`);
  try {
    await wrangler(['d1', 'create', DB_NAME]);
  } catch (error) {
    fail(`تعذّر إنشاء قاعدة D1 «${DB_NAME}».`, error);
  }

  databases = await listDatabases();
  if (databases === null) fail('تعذّر سرد قواعد D1 بعد الإنشاء.');
  databaseId = databases.find((entry) => entry.name === DB_NAME)?.uuid ?? '';
}

if (!databaseId) {
  fail(`تعذّر الحصول على معرّف قاعدة D1 «${DB_NAME}» رغم نجاح السرد.`);
}
console.log(`\n  معرّف القاعدة جاهز (${databaseId.slice(0, 8)}…).`);

/* --------------------------- 3) تحديث الإعدادات --------------------------- */
step('كتابة معرّف القاعدة في إعدادات Wrangler');

// أ) الملف الأصلي — يستخدمه wrangler d1 migrations وأي أمر لا يمرّ بالتحويل.
const sourceConfig = readFileSync(CONFIG, 'utf8');
const sourceResult = setDatabaseIdInSourceConfig(sourceConfig, databaseId);
if (!sourceResult.changed) {
  fail(`لم يُعثر على حقل database_id في ${CONFIG}.`);
}
writeFileSync(CONFIG, sourceResult.text, 'utf8');
console.log(`  ${CONFIG}: تم.`);

// ب) الإعداد المولَّد داخل dist — هو ما يقرأه wrangler deploy فعلياً.
const D1_TARGET = { binding: DB_BINDING, databaseName: DB_NAME };
let generatedConfigPath;
try {
  generatedConfigPath = resolveGeneratedConfigPath();
} catch (error) {
  fail(`تعذّر تحديد الإعداد المولَّد الذي سيستخدمه Wrangler: ${error.message}`);
}
if (!generatedConfigPath) {
  fail(
    `لم يُعثر على ${'.wrangler/deploy/config.json'} — لم يُنفَّذ npm run build قبل النشر.\n` +
      '  إضافة @cloudflare/vite-plugin تولّد إعداد Wrangler أثناء البناء، و wrangler deploy يقرأ ذلك الإعداد.\n' +
      '  بدونه سيُنشر الـ Worker بقيمة database_id النائبة ويفشل. أوقفنا النشر.',
  );
}

try {
  const generated = readFileSync(generatedConfigPath, 'utf8');
  const generatedResult = setDatabaseIdInGeneratedConfig(generated, databaseId, D1_TARGET);
  writeFileSync(generatedConfigPath, generatedResult.text, 'utf8');
  console.log(`  ${generatedConfigPath}: تم (${generatedResult.updated} binding).`);
} catch (error) {
  fail(`تعذّر تحديث D1 binding داخل الإعداد المولَّد: ${error.message}`);
}

/* ------------------------------ 4) Migrations ----------------------------- */
step('تطبيق الـ migrations على قاعدة الإنتاج');
try {
  await wrangler(['d1', 'migrations', 'apply', DB_NAME, '--remote'], { input: 'y\n' });
} catch (error) {
  fail('فشل تطبيق الـ migrations على قاعدة الإنتاج.', error);
}

/* -------------------------------- 5) النشر -------------------------------- */
// تحقّق صريح قبل النشر: نقرأ من القرص الملف الذي سيقرأه Wrangler نفسه،
// ونؤكّد أن database_id معرّف حقيقي — لا فارغ ولا القيمة النائبة.
step('التحقّق من إعداد Wrangler قبل النشر');
try {
  const effective = readDatabaseIdFromGeneratedConfig(
    readFileSync(generatedConfigPath, 'utf8'),
    D1_TARGET,
  );
  if (!isDatabaseId(effective)) {
    fail(
      `الـ binding «${DB_BINDING}» في الإعداد الذي سيستخدمه Wrangler لا يحمل معرّفاً صالحاً (${shortId(effective)}).\n` +
        '  النشر سيفشل حتماً بـ: Binding DB of type d1 must have a valid database_id specified. أوقفنا النشر.',
    );
  }
  console.log(`  الملف: ${generatedConfigPath}`);
  console.log(`  ${DB_BINDING}.database_id = ${shortId(effective)} ✓`);
} catch (error) {
  fail(`تعذّر التحقّق من الإعداد المولَّد قبل النشر: ${error.message}`);
}

step('نشر الـ Worker');
let deployOutput = '';
try {
  const result = await wrangler(['deploy']);
  // نضمّ stdout و stderr معاً: wrangler قد يكتب الرابط على أيٍّ منهما.
  deployOutput = `${result.stdout}\n${result.stderr}`;
} catch (error) {
  fail('فشل نشر الـ Worker. الرسالة الكاملة من wrangler أعلاه.', error);
}

const productionUrl = (/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i.exec(deployOutput) ?? [''])[0];
if (!productionUrl) {
  fail('نجح أمر النشر لكن تعذّر استخراج رابط الإنتاج من مخرجاته (انظر المخرَج الكامل أعلاه).');
}
console.log(`\n  رابط الإنتاج: ${productionUrl}`);

/* ------------------------------- 6) الأسرار ------------------------------- */
step('رفع الأسرار إلى Cloudflare');
for (const name of SECRET_NAMES) {
  const value = process.env[name];
  if (!value) {
    console.log(`  ⚠ ${name}: غير مضبوط في البيئة — تخطّي.`);
    continue;
  }
  try {
    // الاسم فقط في السجل — القيمة تمرّ عبر stdin ولا تُطبع إطلاقاً.
    await wrangler(['secret', 'put', name], {
      input: `${value}\n`,
      label: `npx wrangler secret put ${name}`,
    });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    fail(`تعذّر رفع السرّ ${name}.`, error);
  }
}

/* ---------------------------- 7) Webhook تيليجرام --------------------------- */
step('ضبط Webhook تيليجرام');
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (botToken && webhookSecret) {
  try {
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
    console.log(`  setWebhook: ${setResult.ok ? 'نجح' : `فشل — ${redact(setResult.description)}`}`);

    const infoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const info = await infoResponse.json();
    if (info.ok) {
      console.log(`  عنوان الـ Webhook: ${info.result.url}`);
      console.log(`  تحديثات معلّقة: ${info.result.pending_update_count ?? 0}`);
      console.log(`  آخر خطأ: ${info.result.last_error_message ?? 'لا يوجد'}`);
    }
  } catch (error) {
    // فشل تيليجرام لا يُبطل نشراً ناجحاً — نُبلّغ ونكمل.
    console.error(`  ⚠ تعذّر ضبط الـ Webhook: ${redact(error.message)}`);
  }
} else {
  console.log('  ⚠ متغيّرات تيليجرام ناقصة — تخطّي ضبط الـ Webhook.');
}

/* ----------------------------- 8) فحص الصحّة ----------------------------- */
step('فحص صحّة النسخة المنشورة');
await new Promise((resolve) => setTimeout(resolve, 4000));

try {
  const health = await fetch(`${productionUrl}/api/health`).then((response) => response.json());
  console.log(`  ok=${health.ok}  testMode=${health.testMode}`);
  if (health.missingConfig?.length) {
    console.log(`  ⚠ إعدادات ناقصة: ${health.missingConfig.join(', ')}`);
  }

  for (const path of ['/', '/privacy', '/terms', '/favicon.ico', '/icon-192.png', '/site.webmanifest']) {
    const response = await fetch(`${productionUrl}${path}`);
    console.log(`  ${path} → ${response.status}`);
  }
} catch (error) {
  console.error(`  ⚠ تعذّر إكمال فحص الصحّة: ${redact(error.message)}`);
}

console.log(`\n✅ اكتمل النشر: ${productionUrl}`);
writeFileSync('deploy-url.txt', productionUrl, 'utf8');
