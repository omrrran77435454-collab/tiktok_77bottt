/**
 * لقطات مراجعة بصرية (QA) — ليست جزءاً من التطبيق.
 * التشغيل: node scripts/qa-screens.mjs [outDir]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QA_BASE ?? 'http://localhost:5173';
const MOCK = process.env.QA_MOCK ?? 'http://127.0.0.1:8788';
const WEBHOOK_SECRET = 'dev-webhook-secret-0123456789';
const outDir = process.argv[2] ?? '/tmp/qa';
mkdirSync(outDir, { recursive: true });

const unique = Date.now();

async function signInAndLink(context, { email, telegramId, member }) {
  const origin = { Origin: BASE, 'content-type': 'application/json' };
  await context.request.post(`${BASE}/api/auth/sign-up/email`, {
    headers: origin,
    data: { email, password: 'Str0ngPass!2026', name: 'عبدالله المعلّم' },
  });
  const tokenResponse = await context.request.post(`${BASE}/api/telegram/link-token`, {
    headers: origin,
  });
  const { deepLink } = await tokenResponse.json();
  const token = deepLink.split('start=')[1];

  await context.request.post(`${MOCK}/__control/member`, {
    headers: { 'content-type': 'application/json' },
    data: { userId: String(telegramId), status: member ? 'member' : 'left' },
  });
  await context.request.post(`${BASE}/api/telegram/webhook`, {
    headers: { 'content-type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET },
    data: {
      message: {
        text: `/start ${token}`,
        chat: { id: telegramId },
        from: { id: telegramId, username: 'qa_user' },
      },
    },
  });
}

async function shoot(page, name, { full = true } = {}) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: full });
  console.log('shot:', name);
}

const errors = [];

async function run() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});

  for (const [label, viewport] of [
    ['desktop', { width: 1440, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport, locale: 'ar', deviceScaleFactor: 1 });
    context.on('weberror', (error) => errors.push(`[${label}] ${error.error().message}`));
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`[${label}] console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`[${label}] pageerror: ${error.message}`));

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await shoot(page, `landing-${label}`);

    await signInAndLink(context, {
      email: `qa-${label}-${unique}@example.com`,
      telegramId: 900000 + (label === 'mobile' ? 2 : 1),
      member: false,
    });

    await page.goto(`${BASE}/connect`, { waitUntil: 'networkidle' });
    await shoot(page, `gate-${label}`);

    await context.request.post(`${MOCK}/__control/member`, {
      headers: { 'content-type': 'application/json' },
      data: { userId: String(900000 + (label === 'mobile' ? 2 : 1)), status: 'member' },
    });
    await context.request.post(`${BASE}/api/telegram/verify`, { headers: { Origin: BASE } });

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await shoot(page, `dashboard-${label}`);

    await page.goto(`${BASE}/tools`, { waitUntil: 'networkidle' });
    await shoot(page, `tools-${label}`);

    await page.goto(`${BASE}/tools/student-followup`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'بيانات نموذجية' }).click();
    await page.waitForTimeout(900);
    await shoot(page, `tool-form-${label}`);

    if (label === 'mobile') {
      await page.getByRole('tab', { name: 'المعاينة والتصدير' }).click();
      await page.waitForTimeout(900);
      await shoot(page, `tool-preview-${label}`);
    }

    await page.goto(`${BASE}/account`, { waitUntil: 'networkidle' });
    await shoot(page, `account-${label}`);

    await page.goto(`${BASE}/help`, { waitUntil: 'networkidle' });
    await shoot(page, `help-${label}`);

    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await shoot(page, `unauthorized-${label}`);

    await page.goto(`${BASE}/no-such-page`, { waitUntil: 'networkidle' });
    await shoot(page, `notfound-${label}`);

    // فحص التمرير الأفقي غير المقصود
    for (const width of [320, 360, 390, 412, 768]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ['/dashboard', '/tools/student-followup', '/account']) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (overflow > 1) errors.push(`OVERFLOW ${width}px ${path}: +${overflow}px`);
      }
    }

    await context.close();
    if (label === 'mobile') break;
  }

  await browser.close();
  console.log('\n--- issues ---');
  console.log(errors.length === 0 ? 'none' : errors.join('\n'));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
