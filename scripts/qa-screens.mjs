/**
 * لقطات مراجعة بصرية (QA) — أداة فحص وليست جزءاً من التطبيق.
 * التشغيل: node scripts/qa-screens.mjs [outDir]
 */
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QA_BASE ?? 'http://localhost:5173';
const MOCK = process.env.QA_MOCK ?? 'http://127.0.0.1:8788';
const WEBHOOK_SECRET = 'local-dev-webhook-secret-0123456789';
const E2E_SECRET = 'local-dev-e2e-secret';
const TOKEN_KEY = 'teacher-tools:e2e-id-token';
const outDir = process.argv[2] ?? '/tmp/qa';
mkdirSync(outDir, { recursive: true });

function makeToken(uid, name = 'عبدالله المعلّم') {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: uid, email: `${uid}@example.com`, name, picture: null, iat: now, exp: now + 3600 };
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `test.${body}.${createHash('sha256').update(`${body}.${E2E_SECRET}`).digest('hex')}`;
}

async function link(context, token, telegramId, status = 'member') {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const response = await context.request.post(`${BASE}/api/telegram/link-token`, { headers });
  const { deepLink } = await response.json();
  await context.request.post(`${MOCK}/__control/member`, {
    headers: { 'content-type': 'application/json' },
    data: { userId: String(telegramId), status },
  });
  await context.request.post(`${BASE}/api/telegram/webhook`, {
    headers: { 'content-type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET },
    data: {
      message: {
        text: `/start ${deepLink.split('start=')[1]}`,
        chat: { id: telegramId },
        from: { id: telegramId, username: 'qa_user' },
      },
    },
  });
}

const issues = [];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});

for (const [label, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const context = await browser.newContext({ viewport, locale: 'ar' });
  const page = await context.newPage();
  page.on('pageerror', (error) => issues.push(`[${label}] pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/401|403/.test(message.text())) {
      issues.push(`[${label}] console: ${message.text()}`);
    }
  });

  const shoot = async (name) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${outDir}/${name}-${label}.png`, fullPage: true });
    console.log('shot:', `${name}-${label}`);
  };

  // زائر
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await shoot('landing');
  await page.goto(`${BASE}/privacy`, { waitUntil: 'networkidle' });
  await shoot('privacy');
  await page.goto(`${BASE}/terms`, { waitUntil: 'networkidle' });
  await shoot('terms');

  // مستخدم مسجّل غير مربوط
  const isAdmin = label === 'desktop';
  const uid = `qa-${label}-${Date.now()}`;
  const token = makeToken(uid);
  await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [TOKEN_KEY, token]);

  await page.goto(`${BASE}/connect`, { waitUntil: 'networkidle' });
  await shoot('gate');

  const telegramId = isAdmin ? 5559869840 : 940000 + (Date.now() % 40000);
  await link(context, token, telegramId, 'member');

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await shoot('dashboard');

  await page.goto(`${BASE}/account`, { waitUntil: 'networkidle' });
  await shoot('account');

  await page.goto(`${BASE}/tools/student-followup`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'بيانات نموذجية' }).click();
  await page.waitForTimeout(1000);
  if (label === 'mobile') {
    await page.getByRole('tab', { name: 'المعاينة والتصدير' }).click();
    await page.waitForTimeout(900);
  }
  await shoot('tool');

  if (isAdmin) {
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await shoot('admin');
  }

  await context.close();
}

await browser.close();
console.log('\nissues:', issues.length === 0 ? 'none' : issues.join('\n'));
