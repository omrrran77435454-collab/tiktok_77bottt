/**
 * يولّد صورة Open Graph (1200×630) من الأيقونة الرسمية + اسم المنصّة.
 *
 * نستخدم المتصفّح للرسم بدل مكتبة صور، لأن تشكيل الحروف العربية واتجاه RTL
 * يحتاجان محرّك نصوص حقيقياً — وهو نفس السبب الذي نصدّر به المستندات.
 *
 * التشغيل (اختياري — الناتج مرفوع في المستودع):
 *     node scripts/generate-og-image.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const asDataUri = (path, mime) =>
  `data:${mime};base64,${readFileSync(join(root, path)).toString('base64')}`;

const icon = asDataUri('public/brand/teacher-tools-icon.png', 'image/png');
const fontRegular = asDataUri('public/fonts/ibm-plex-sans-arabic-400-arabic.woff2', 'font/woff2');
const fontBold = asDataUri('public/fonts/ibm-plex-sans-arabic-700-arabic.woff2', 'font/woff2');

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>
  @font-face { font-family: 'Plex'; font-weight: 400; src: url(${fontRegular}) format('woff2'); }
  @font-face { font-family: 'Plex'; font-weight: 700; src: url(${fontBold}) format('woff2'); }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; align-items: center; gap: 56px;
    padding: 0 88px; font-family: 'Plex', sans-serif; background: #0D5B58; color: #FDFBF6;
    background-image:
      radial-gradient(900px 520px at 88% -18%, rgba(133,169,140,0.30), transparent 62%),
      radial-gradient(700px 460px at -8% 118%, rgba(215,148,50,0.18), transparent 60%);
  }
  .icon { width: 260px; height: 260px; border-radius: 58px; flex: 0 0 auto;
          box-shadow: 0 26px 70px rgba(0,0,0,0.34); }
  .name { font-size: 86px; font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; }
  .tag { font-size: 40px; margin-top: 20px; color: #CFDFD1; line-height: 1.5; }
  .rule { width: 128px; height: 8px; border-radius: 99px; background: #D79432; margin-top: 34px; }
</style></head><body>
  <img class="icon" src="${icon}" alt="">
  <div>
    <div class="name">أدوات المعلم</div>
    <div class="tag">أدوات تختصر شغل المعلم</div>
    <div class="rule"></div>
  </div>
</body></html>`;

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: join(root, 'public/og-image.png') });
await browser.close();
console.log('✓ public/og-image.png (1200×630)');
