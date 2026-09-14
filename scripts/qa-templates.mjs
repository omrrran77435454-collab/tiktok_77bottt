/**
 * مراجعة بصرية للقوالب السبعة + اختبار التصدير الفعلي (PNG/PDF).
 * ليست جزءاً من التطبيق — أداة فحص فقط.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QA_BASE ?? 'http://localhost:5173';
const MOCK = process.env.QA_MOCK ?? 'http://127.0.0.1:8788';
const SECRET = 'dev-webhook-secret-0123456789';
const outDir = process.argv[2] ?? '/tmp/qa-tpl';
mkdirSync(outDir, { recursive: true });

const TEMPLATES = [
  'رسمي نظيف',
  'عاجي بسيط',
  'بطاقات حديثة',
  'أكاديمي',
  'أخضر طبيعي',
  'أبيض وأسود',
  'فاخر حديث',
];

const LONG_NAME = 'عبدالرحمن بن عبدالعزيز بن محمد آل عبداللطيف الشمري القحطاني';
const LONG_SKILL = 'الاستنتاج وتحليل النص الأدبي واستخراج الفكرة العامة والأفكار الفرعية';
const LONG_NOTE =
  'الطالب يحتاج متابعة أسبوعية مع ولي الأمر ومراجعة المهارات السابقة، مع التركيز على القراءة الجهرية وتحسين سرعة الأداء داخل الحصة وخارجها.';

function buildStudents(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: index === 0 ? LONG_NAME : `الطالب رقم ${index + 1}`,
    score: index === 1 ? '' : String(((index * 7) % 21) / 2),
    weakSkill: index === 0 ? LONG_SKILL : 'الفهم القرائي',
    category: 'auto',
    action: '',
    reviewDate: index % 3 === 0 ? '2026-10-05' : '',
    notes: index === 0 ? LONG_NOTE : '',
  }));
}

async function setup(context, telegramId, email) {
  const headers = { Origin: BASE, 'content-type': 'application/json' };
  await context.request.post(`${BASE}/api/auth/sign-up/email`, {
    headers,
    data: { email, password: 'Str0ngPass!2026', name: 'معلّم الاختبار' },
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
        from: { id: telegramId, username: 'qa_tpl' },
      },
    },
  });
}

async function run() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    locale: 'ar',
    acceptDownloads: true,
  });
  const problems = [];
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('401')) {
      problems.push(`console: ${message.text()}`);
    }
  });

  await page.goto(`${BASE}/`);
  // معرّف تيليجرام فريد لكل تشغيل: حساب تيليجرام واحد لا يُربط بحسابين.
  const telegramId = 910000 + (Date.now() % 80000);
  await setup(context, telegramId, `qa-tpl-${Date.now()}@example.com`);

  // بيانات كبيرة (40 طالباً) مع حالات حدّية: اسم طويل جداً، حقل فارغ، درجات عشرية.
  await page.goto(`${BASE}/tools/student-followup`);
  await page.evaluate((students) => {
    localStorage.setItem(
      'teacher-tools:tool:student-followup',
      JSON.stringify({
        subject: 'اللغة العربية',
        grade: 'الخامس الابتدائي',
        testTitle: 'اختبار قصير — الوحدة الثانية (نص طويل لاختبار الالتفاف في الترويسة)',
        date: '2026-09-14',
        maxScore: '10',
        thresholds: { excellent: 85, good: 60 },
        students,
      }),
    );
  }, buildStudents(40));
  await page.reload({ waitUntil: 'networkidle' });
  // نُلغي التثبيت (sticky) أثناء اللقطات فقط حتى لا يغطّي الهيدر أعلى الصفحة.
  await page.addStyleTag({
    content: '.app-header,.preview-toolbar{position:static !important}',
  });
  await page.waitForTimeout(2500);

  for (let index = 0; index < TEMPLATES.length; index += 1) {
    const name = TEMPLATES[index];
    await page.getByRole('radio', { name: new RegExp(name) }).first().click();
    await page.waitForTimeout(1200);
    const pages = await page.locator('.doc-root .doc-page').count();
    console.log(`template ${index + 1} (${name}): ${pages} pages`);
    if (pages < 2) problems.push(`template ${name}: توقعنا أكثر من صفحة مع 40 طالباً`);

    await page.locator('.doc-root .doc-page').first().screenshot({
      path: `${outDir}/tpl-${index + 1}-page1.png`,
    });
    await page.locator('.doc-root .doc-page').nth(1).screenshot({
      path: `${outDir}/tpl-${index + 1}-page2.png`,
    });

    // فحص تجاوز المحتوى لحدود الصفحة
    const overflow = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('.doc-page').forEach((element, position) => {
        const box = element.getBoundingClientRect();
        const content = element.querySelector('.doc-page-content');
        if (!content) return;
        const last = content.lastElementChild;
        if (!last) return;
        const lastBox = last.getBoundingClientRect();
        const footer = element.querySelector('.doc-footer');
        const footerTop = footer ? footer.getBoundingClientRect().top : box.bottom;
        if (lastBox.bottom > footerTop + 2) {
          results.push(`page ${position + 1}: تجاوز ${Math.round(lastBox.bottom - footerTop)}px`);
        }
      });
      return results;
    });
    if (overflow.length > 0) problems.push(`template ${name}: ${overflow.join(' | ')}`);
  }

  // اختبار التصدير الفعلي على القالب الأول
  await page.getByRole('radio', { name: /رسمي نظيف/ }).first().click();
  await page.waitForTimeout(1000);

  const pdfDownload = page.waitForEvent('download', { timeout: 90_000 });
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  const pdf = await pdfDownload;
  await pdf.saveAs(`${outDir}/export.pdf`);
  console.log('pdf saved:', await pdf.suggestedFilename());

  const pngDownload = page.waitForEvent('download', { timeout: 90_000 });
  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  const png = await pngDownload;
  await png.saveAs(`${outDir}/export-page1.png`);
  console.log('png saved:', await png.suggestedFilename());

  await context.close();
  await browser.close();

  console.log('\n--- problems ---');
  console.log(problems.length === 0 ? 'none' : problems.join('\n'));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
