import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type { BrowserContext, Page } from '@playwright/test';

export const BASE = 'http://localhost:5173';
export const MOCK = 'http://127.0.0.1:8788';
export const WEBHOOK_SECRET = 'local-dev-webhook-secret-0123456789';
export const E2E_SECRET = 'local-dev-e2e-secret';
export const E2E_TOKEN_KEY = 'teacher-tools:e2e-id-token';
export const ADMIN_TELEGRAM_ID = 5559869840;

let sequence = 0;

/** معرّف تيليجرام فريد لكل اختبار (حساب تيليجرام واحد لا يُربط بحسابين). */
export function uniqueTelegramId(): number {
  sequence += 1;
  return 700000000 + ((Date.now() % 100000) * 100 + sequence);
}

/**
 * يبني توكن هوية اختباري بنفس الصيغة التي يقبلها الـ Worker في وضع E2E.
 * لا علاقة له بـ Firebase الحقيقي، ولا يعمل إن كان E2E_TEST_MODE مُعطّلاً.
 */
export function makeIdToken(uid: string, name = 'معلّم الاختبار'): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: uid,
    email: `${uid}@example.com`,
    name,
    picture: null,
    iat: now,
    exp: now + 3600,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const signature = createHash('sha256').update(`${body}.${E2E_SECRET}`).digest('hex');
  return `test.${body}.${signature}`;
}

export function uniqueUid(prefix = 'e2e'): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

/**
 * "يسجّل الدخول" في المتصفّح: يضع توكن الاختبار في التخزين المحلي قبل تحميل
 * أي صفحة، تماماً كما يفعل Firebase SDK بتوكنه الحقيقي.
 */
export async function signInAs(context: BrowserContext, uid = uniqueUid()): Promise<string> {
  const token = makeIdToken(uid);
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key as string, value as string);
      } catch {
        /* تخزين محظور — الاختبار سيُبلّغ عن الفشل */
      }
    },
    [E2E_TOKEN_KEY, token] as const,
  );
  return token;
}

/** يطلب من الـ API مباشرة بنفس توكن المتصفّح. */
export function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
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
export async function linkTelegramAccount(
  context: BrowserContext,
  token: string,
  telegramId: number,
) {
  const tokenResponse = await context.request.post(`${BASE}/api/telegram/link-token`, {
    headers: authHeaders(token),
  });
  const { deepLink } = (await tokenResponse.json()) as { deepLink: string };

  await context.request.post(`${BASE}/api/telegram/webhook`, {
    headers: {
      'content-type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': WEBHOOK_SECRET,
    },
    data: {
      message: {
        text: `/start ${deepLink.split('start=')[1]}`,
        chat: { id: telegramId },
        from: { id: telegramId, username: `e2e_${telegramId}` },
      },
    },
  });
}

/** مستخدم جاهز تماماً: مسجّل + مربوط + مشترك. */
export async function signInFullyVerified(context: BrowserContext): Promise<{
  token: string;
  telegramId: number;
}> {
  const token = await signInAs(context);
  const telegramId = uniqueTelegramId();
  await setMemberStatus(context, telegramId, 'member');
  await linkTelegramAccount(context, token, telegramId);
  return { token, telegramId };
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
  await openPreviewTab(page);
  const toggle = page.getByRole('button', { name: 'القالب والألوان' });
  if (await toggle.isVisible().catch(() => false)) {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  }
  await page.locator('.tpl-thumb').first().waitFor({ state: 'visible' });
}

/**
 * يحرّر ارتباط حساب تيليجرام الخاص بالإدمن في قاعدة D1 المحلية.
 * معرّف الإدمن ثابت، والنظام يمنع ربط حساب تيليجرام واحد بحسابَي منصّة،
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
        'teacher-tools-db',
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
