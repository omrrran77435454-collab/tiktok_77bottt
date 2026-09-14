import { execFileSync } from 'node:child_process';
import type { BrowserContext, Page } from '@playwright/test';

export const BASE = 'http://localhost:5173';
export const MOCK = 'http://127.0.0.1:8788';
export const WEBHOOK_SECRET = 'local-dev-webhook-secret-0123456789';
export const ADMIN_TELEGRAM_ID = 5559869840;

let sequence = 0;

/** معرّف تيليجرام فريد لكل اختبار (حساب تيليجرام واحد لا يُربط بحسابين). */
export function uniqueTelegramId(): number {
  sequence += 1;
  return 700000000 + ((Date.now() % 100000) * 100 + sequence);
}

export function uniqueEmail(prefix = 'e2e'): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}@example.com`;
}

/** تسجيل دخول اختباري (يعمل فقط عندما يكون E2E_TEST_MODE مفعّلاً). */
export async function signUpTestUser(context: BrowserContext, email = uniqueEmail()) {
  const response = await context.request.post(`${BASE}/api/auth/sign-up/email`, {
    headers: { Origin: BASE, 'content-type': 'application/json' },
    data: { email, password: 'Str0ngPass!2026', name: 'معلّم الاختبار' },
  });
  if (!response.ok()) throw new Error(`فشل إنشاء مستخدم الاختبار: ${response.status()}`);
  return email;
}

export async function setMemberStatus(
  context: BrowserContext,
  telegramId: number,
  status: 'member' | 'left' | 'administrator' | 'kicked',
) {
  await context.request.post(`${MOCK}/__control/member`, {
    headers: { 'content-type': 'application/json' },
    data: { userId: String(telegramId), status },
  });
}

/** يحاكي ضغط المستخدم Start في البوت عبر استدعاء الـ Webhook الحقيقي. */
export async function linkTelegramAccount(context: BrowserContext, telegramId: number) {
  const tokenResponse = await context.request.post(`${BASE}/api/telegram/link-token`, {
    headers: { Origin: BASE, 'content-type': 'application/json' },
  });
  const { deepLink } = (await tokenResponse.json()) as { deepLink: string };
  const token = deepLink.split('start=')[1];

  await context.request.post(`${BASE}/api/telegram/webhook`, {
    headers: {
      'content-type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
    },
    data: {
      message: {
        text: `/start ${token}`,
        chat: { id: telegramId },
        from: { id: telegramId, username: `e2e_${telegramId}` },
      },
    },
  });
  return token;
}

/** مستخدم جاهز تماماً: مسجّل + مربوط + مشترك. */
export async function signInFullyVerified(context: BrowserContext) {
  const telegramId = uniqueTelegramId();
  await signUpTestUser(context);
  await setMemberStatus(context, telegramId, 'member');
  await linkTelegramAccount(context, telegramId);
  return telegramId;
}

/** يتأكد أن الصفحة لا تُمرَّر أفقياً بلا داعٍ. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** يفتح تبويب «المعاينة والتصدير» على الشاشات الصغيرة (لا شيء على الكبيرة). */
export async function openPreviewTab(page: Page): Promise<void> {
  const previewTab = page.getByRole('tab', { name: 'المعاينة والتصدير' });
  if (await previewTab.isVisible().catch(() => false)) {
    await previewTab.click();
  }
  await page.locator('.preview-toolbar').first().waitFor({ state: 'visible' });
}

/**
 * يفتح لوحة «القالب والألوان».
 * على الشاشات الصغيرة تكون داخل تبويب «المعاينة والتصدير» ومطوية،
 * وعلى الشاشات الكبيرة تكون ظاهرة دائماً — هذا المساعد يغطّي الحالتين.
 */
export async function openDesignPanel(page: Page): Promise<void> {
  const previewTab = page.getByRole('tab', { name: 'المعاينة والتصدير' });
  if (await previewTab.isVisible().catch(() => false)) {
    await previewTab.click();
  }
  const toggle = page.getByRole('button', { name: 'القالب والألوان' });
  if (await toggle.isVisible().catch(() => false)) {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  }
  await page.locator('.tpl-thumb').first().waitFor({ state: 'visible' });
}

/**
 * يحرّر ارتباط حساب تيليجرام الخاص بالإدمن في قاعدة D1 المحلية.
 * معرّف الإدمن ثابت، والنظام يمنع ربط حساب تيليجرام واحد بحسابَي موقع،
 * لذلك نحتاج تحريره قبل كل اختبار يحتاج حساب إدمن جديداً.
 */
export function releaseAdminTelegramLink(): void {
  try {
    execFileSync(
      'npx',
      [
        'wrangler',
        'd1',
        'execute',
        'teacher_tools_db',
        '--local',
        '--command',
        `DELETE FROM telegram_connections WHERE telegram_user_id = '${ADMIN_TELEGRAM_ID}'`,
      ],
      { stdio: 'ignore' },
    );
  } catch {
    console.warn('[e2e] تعذّر تحرير ارتباط الإدمن. شغّل: npm run e2e:prepare');
  }
}
