/** فحص مخرجات الطباعة عبر محرك الطباعة الحقيقي في المتصفّح. */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const MOCK = 'http://127.0.0.1:8788';
const SECRET = 'dev-webhook-secret-0123456789';
const out = process.argv[2] ?? '/tmp/qa-print.pdf';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const context = await browser.newContext({ locale: 'ar', viewport: { width: 1500, height: 950 } });
const page = await context.newPage();

const telegramId = 920000 + (Date.now() % 70000);
const headers = { Origin: BASE, 'content-type': 'application/json' };
await context.request.post(`${BASE}/api/auth/sign-up/email`, {
  headers,
  data: { email: `qa-print-${Date.now()}@example.com`, password: 'Str0ngPass!2026', name: 'معلّم الطباعة' },
});
const linkResponse = await context.request.post(`${BASE}/api/telegram/link-token`, { headers });
const { deepLink } = await linkResponse.json();
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
      from: { id: telegramId },
    },
  },
});

await page.goto(`${BASE}/tools/student-followup`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'بيانات نموذجية' }).click();
await page.waitForTimeout(2000);

await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(500);

// لا يجب أن يظهر أي عنصر تحكّم في وضع الطباعة.
const visibleControls = await page.evaluate(() => {
  const selectors = ['.app-header', '.preview-toolbar', '.design-panel-desktop', '.tool-tabs', '.app-footer'];
  return selectors.filter((selector) => {
    const element = document.querySelector(selector);
    if (!element) return false;
    const style = getComputedStyle(element);
    // مخفي فعلياً = display:none أو visibility:hidden أو بلا مساحة على الصفحة.
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  });
});

await page.screenshot({ path: out.replace(/\.pdf$/, '.png'), fullPage: true });
await page.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
console.log('print pdf written to', out);
console.log('visible controls in print:', visibleControls.length === 0 ? 'none ✓' : visibleControls.join(', '));

await browser.close();
