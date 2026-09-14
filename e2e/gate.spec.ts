import { expect, test } from '@playwright/test';
import {
  BASE,
  linkTelegramAccount,
  setMemberStatus,
  signUpTestUser,
  uniqueTelegramId,
} from './helpers';

test.describe('بوابة الدخول والاشتراك', () => {
  test('الزائر يرى صفحة الهبوط وزر Google', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('معلّم');
    await expect(
      page.getByRole('button', { name: /تسجيل الدخول بواسطة Google/ }),
    ).toBeVisible();
  });

  test('الزائر يُحوَّل من اللوحة إلى صفحة الهبوط', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(`${BASE}/`);
  });

  test('المسجّل غير المربوط يُحوَّل إلى صفحة الربط', async ({ context, page }) => {
    await signUpTestUser(context);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/connect$/);
    await expect(page.getByRole('button', { name: 'ربط Telegram' })).toBeVisible();
  });

  test('المربوط غير المشترك يبقى على البوابة ويرى رسالة واضحة', async ({ context, page }) => {
    const telegramId = uniqueTelegramId();
    await signUpTestUser(context);
    await setMemberStatus(context, telegramId, 'left');
    await linkTelegramAccount(context, telegramId);

    await page.goto('/connect');
    await expect(page.getByRole('link', { name: 'الانضمام للقناة' })).toBeVisible();

    await page.getByRole('button', { name: 'تحقق من الاشتراك' }).click();
    await expect(page.getByText('لا يزال الاشتراك غير مؤكّد')).toBeVisible();
    await expect(page).toHaveURL(/\/connect$/);
  });

  test('بعد الاشتراك يفتح التحقق الأدوات', async ({ context, page }) => {
    const telegramId = uniqueTelegramId();
    await signUpTestUser(context);
    await setMemberStatus(context, telegramId, 'left');
    await linkTelegramAccount(context, telegramId);

    await page.goto('/connect');
    await setMemberStatus(context, telegramId, 'member');
    await page.getByRole('button', { name: 'تحقق من الاشتراك' }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /مرحباً/ })).toBeVisible();
  });

  test('لا يُطلب الربط مرة أخرى بعد نجاحه', async ({ context, page }) => {
    const telegramId = uniqueTelegramId();
    await signUpTestUser(context);
    await setMemberStatus(context, telegramId, 'member');
    await linkTelegramAccount(context, telegramId);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/connect');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('صفحة غير موجودة تعرض 404 بالعربية', async ({ page }) => {
    await page.goto('/route-that-does-not-exist');
    await expect(page.getByText('الصفحة غير موجودة')).toBeVisible();
  });
});
