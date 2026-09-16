import { createHash } from 'node:crypto';
import type { BrowserContext, Page } from '@playwright/test';

export const BASE = 'http://localhost:5173';
export const MOCK = 'http://127.0.0.1:8788';
export const WEBHOOK_SECRET = 'local-dev-webhook-secret-0123456789';
export const E2E_SECRET = 'local-dev-e2e-secret';
export const E2E_TOKEN_KEY = 'teacher-tools:e2e-id-token';
export const ADMIN_TELEGRAM_ID = 5559869840;

/**
 * بريد مدير المنصّة في بيئة الاختبار.
 * يجب أن يطابق ADMIN_EMAIL في `.dev.vars` (يولّده scripts/prepare-e2e.mjs).
 * بريد محايد عمداً: لا يوجد بريد إنتاج حقيقي داخل المستودع.
 */
export const ADMIN_EMAIL = 'platform.owner@example.test';

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
export function makeIdToken(
  uid: string,
  options: { name?: string; email?: string; emailVerified?: boolean } = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: uid,
    email: options.email ?? `${uid}@example.com`,
    // Google يُرجع بريداً مؤكَّداً، فهذا هو الوضع الطبيعي في الاختبارات.
    // نمرّر false صراحةً عند اختبار رفض البريد غير المؤكَّد.
    email_verified: options.emailVerified ?? true,
    name: options.name ?? 'معلّم الاختبار',
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
export async function signInAs(
  context: BrowserContext,
  uid = uniqueUid(),
  options: { name?: string; email?: string; emailVerified?: boolean } = {},
): Promise<string> {
  const token = makeIdToken(uid, options);
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

/**
 * يسجّل الدخول بهوية مالك المنصّة.
 *
 * الصلاحية لا تأتي من تيليجرام ولا من قاعدة البيانات ولا من العميل: الخادم
 * يقارن البريد المؤكَّد في التوكن مع ADMIN_EMAIL في كل طلب. لذلك يكفي هنا
 * توكن ببريد مطابق ومؤكَّد — ومرّر emailVerified: false لاختبار الرفض.
 */
export async function signInAsAdmin(
  context: BrowserContext,
  options: { emailVerified?: boolean } = {},
): Promise<string> {
  return signInAs(context, uniqueUid('admin'), {
    email: ADMIN_EMAIL,
    emailVerified: options.emailVerified ?? true,
    name: 'مالك المنصّة',
  });
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

/** يُكمل تهيئة الحساب عبر الـ API — يوفّر المرور بالمعالج في كل اختبار. */
export async function completeOnboarding(
  context: BrowserContext,
  token: string,
  overrides: Partial<{
    role: 'teacher' | 'student';
    stageId: string;
    gradeId: string;
    trackId: string | null;
    subjects: string[];
  }> = {},
) {
  const role = overrides.role ?? 'teacher';
  // نموذجان مختلفان: المعلم بنصاب متعدّد، والطالب بمرحلة وصف مفردين.
  const data =
    role === 'teacher'
      ? {
          role,
          stageId: null,
          gradeId: null,
          trackId: null,
          subjects: [],
          assignments: [
            {
              stageId: overrides.stageId ?? 'primary',
              gradeId: overrides.gradeId ?? 'p5',
              subjectId: (overrides.subjects ?? ['arabic'])[0],
              className: 'أ',
            },
          ],
          onboardingCompleted: true,
        }
      : {
          role,
          stageId: overrides.stageId ?? 'primary',
          gradeId: overrides.gradeId ?? 'p5',
          trackId: overrides.trackId ?? null,
          subjects: overrides.subjects ?? ['arabic'],
          onboardingCompleted: true,
        };

  await context.request.post(`${BASE}/api/me/profile`, {
    headers: authHeaders(token),
    data,
  });
}

/**
 * مستخدم جاهز تماماً: مسجّل + مربوط + مشترك + مُهيّأ.
 * التهيئة مُكمَلة افتراضياً حتى تختبر بقيّة المواصفات ما تقصده فعلاً؛
 * مرّر skipOnboarding لاختبار معالج التهيئة نفسه.
 */
export async function signInFullyVerified(
  context: BrowserContext,
  options: {
    skipOnboarding?: boolean;
    role?: 'teacher' | 'student';
    subjects?: string[];
  } = {},
): Promise<{ token: string; telegramId: number }> {
  const token = await signInAs(context);
  const telegramId = uniqueTelegramId();
  await setMemberStatus(context, telegramId, 'member');
  await linkTelegramAccount(context, token, telegramId);

  if (!options.skipOnboarding) {
    await completeOnboarding(context, token, {
      role: options.role,
      ...(options.subjects ? { subjects: options.subjects } : {}),
    });
  }

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
