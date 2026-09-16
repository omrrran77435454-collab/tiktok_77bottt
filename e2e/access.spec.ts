import { expect, test } from '@playwright/test';
import {
  BASE,
  authHeaders,
  completeOnboarding,
  linkTelegramAccount,
  setMemberStatus,
  signInAs,
  signInFullyVerified,
  uniqueTelegramId,
} from './helpers';

/*
 * الوصول إلى المنصّة.
 *
 * حلّت محلّ e2e/gate.spec.ts بعد إزالة بوابة تيليجرام: لم يعد الربط ولا
 * الاشتراك في القناة شرطاً لأي مسار، وهذه المواصفة تحرس ذلك من جهة المستخدم.
 */

test.describe('الدخول إلى المنصّة', () => {
  test('الزائر يرى صفحة الهبوط وزر Google', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('معلّم');
    await expect(page.getByRole('button', { name: /تسجيل الدخول بواسطة Google/ })).toBeVisible();
  });

  test('الزائر يُحوَّل من اللوحة إلى صفحة الهبوط', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(`${BASE}/`);
  });

  test('المسجّل غير المربوط بتيليجرام يدخل التهيئة مباشرة — لا بوابة', async ({
    context,
    page,
  }) => {
    await signInAs(context);
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/welcome$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'من أنت؟' })).toBeVisible();
  });

  test('المسجّل غير المربوط يستخدم الأدوات والجدول بلا أي ربط', async ({ context, page }) => {
    const token = await signInAs(context);
    await completeOnboarding(context, token);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    await page.goto('/tools');
    await expect(page).toHaveURL(/\/tools$/);
    await expect(page.locator('.tool-card').first()).toBeVisible({ timeout: 15_000 });

    await page.goto('/schedule');
    await expect(page).toHaveURL(/\/schedule$/);
  });

  test('المربوط غير المشترك في القناة يدخل لوحته كاملةً', async ({ context, page }) => {
    const telegramId = uniqueTelegramId();
    const token = await signInAs(context);
    // مربوط لكن خارج القناة صراحةً.
    await setMemberStatus(context, telegramId, 'left');
    await linkTelegramAccount(context, token, telegramId);
    await completeOnboarding(context, token);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /الخير|مرحباً/ })).toBeVisible();

    await page.goto('/tools');
    await expect(page).toHaveURL(/\/tools$/);
  });

  test('مسار /connect لم يعد موجوداً', async ({ context, page }) => {
    const token = await signInAs(context);
    await completeOnboarding(context, token);

    await page.goto('/connect');
    await expect(page.getByText('الصفحة غير موجودة')).toBeVisible({ timeout: 15_000 });
  });

  test('لا تظهر في المنصّة أي مطالبة بالاشتراك أو تأكيده', async ({ context, page }) => {
    const token = await signInAs(context);
    await completeOnboarding(context, token);

    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'زيارة القناة' })).toBeVisible({
      timeout: 15_000,
    });

    for (const phrase of ['تأكيد الاشتراك', 'تحقق من الاشتراك', 'حدّث الحالة']) {
      await expect(page.getByText(phrase)).toHaveCount(0);
    }
  });

  test('صفحة غير موجودة تعرض 404 بالعربية', async ({ page }) => {
    await page.goto('/route-that-does-not-exist');
    await expect(page.getByText('الصفحة غير موجودة')).toBeVisible();
  });
});

test.describe('ربط تيليجرام الاختياري', () => {
  test('فكّ الربط لا يغلق أي شيء', async ({ context, page }) => {
    const { token } = await signInFullyVerified(context);

    await page.goto('/account');
    await expect(page.getByText('مربوط', { exact: true })).toBeVisible({ timeout: 15_000 });

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'فكّ ربط Telegram' }).click();
    await expect(page.getByText('غير مربوط')).toBeVisible({ timeout: 15_000 });

    // الأدوات تبقى مفتوحة بعد فكّ الربط — واجهةً وواجهةَ برمجة.
    await page.goto('/tools');
    await expect(page).toHaveURL(/\/tools$/);

    const response = await context.request.get(`${BASE}/api/tools`, { headers: authHeaders(token) });
    expect(response.status()).toBe(200);
  });
});
