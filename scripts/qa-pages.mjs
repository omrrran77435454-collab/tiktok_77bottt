/** لقطات مراجعة بصرية للصفحات المتبقّية (لوحة الإدارة والأداتين الأخريين). */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const MOCK = 'http://127.0.0.1:8788';
const SECRET = 'local-dev-webhook-secret-0123456789';
const outDir = process.argv[2] ?? '/tmp/qa-pages';
mkdirSync(outDir, { recursive: true });

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const issues = [];

async function setup(context, telegramId, email) {
  const headers = { Origin: BASE, 'content-type': 'application/json' };
  await context.request.post(`${BASE}/api/auth/sign-up/email`, {
    headers,
    data: { email, password: 'Str0ngPass!2026', name: 'عبدالله المعلّم' },
  });
  const response = await context.request.post(`${BASE}/api/telegram/link-token`, { headers });
  const { deepLink } = await response.json();
  await context.request.post(`${MOCK}/__control/member`, {
    headers: { 'content-type': 'application/json' },
    data: { userId: String(telegramId), status: 'member' },
  });
  await context.request.post(`${BASE}/api/telegram/webhook`, {
    headers: { 'content-type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': SECRET },
    data: {
      message: {
        text: `/start ${deepLink.split('start=')[1]}`,
        chat: { id: telegramId },
        from: { id: telegramId, username: 'qa_pages' },
      },
    },
  });
}

for (const [label, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const context = await browser.newContext({ viewport, locale: 'ar' });
  const page = await context.newPage();
  page.on('pageerror', (error) => issues.push(`[${label}] ${error.message}`));

  await page.goto(BASE);
  const isAdmin = label === 'desktop';
  await setup(
    context,
    isAdmin ? 5559869840 : 930000 + (Date.now() % 50000),
    `qa-pages-${label}-${Date.now()}@example.com`,
  );

  for (const [name, path, action] of [
    ['errormap', '/tools/error-map', true],
    ['absence', '/tools/absence-plan', true],
    ['account', '/account', false],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (action) {
      await page.getByRole('button', { name: 'بيانات نموذجية' }).click();
      await page.waitForTimeout(1200);
      if (label === 'mobile') {
        await page.getByRole('tab', { name: 'المعاينة والتصدير' }).click();
        await page.waitForTimeout(1000);
      }
    }
    await page.screenshot({ path: `${outDir}/${name}-${label}.png`, fullPage: true });
    console.log('shot:', `${name}-${label}`);
  }

  if (isAdmin) {
    // نولّد بعض الأحداث حتى تظهر الإحصاءات غير صفرية.
    for (const event of [
      { eventType: 'tool_opened', toolId: 'student-followup' },
      { eventType: 'export_pdf', toolId: 'student-followup', templateId: 'formal', primaryColor: '#11554F' },
      { eventType: 'export_png', toolId: 'error-map', templateId: 'academic', primaryColor: '#4F7358' },
      { eventType: 'print', toolId: 'absence-plan', templateId: 'modern-premium', primaryColor: '#11554F' },
    ]) {
      await context.request.post(`${BASE}/api/events`, {
        headers: { Origin: BASE, 'content-type': 'application/json' },
        data: event,
      });
    }
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/admin-${label}.png`, fullPage: true });
    console.log('shot: admin-desktop');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/admin-mobile.png`, fullPage: true });
    console.log('shot: admin-mobile');
  }

  await context.close();
}

await browser.close();
console.log('\nissues:', issues.length === 0 ? 'none' : issues.join('\n'));
