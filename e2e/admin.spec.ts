import { expect, test } from '@playwright/test';
import {
  ADMIN_TELEGRAM_ID,
  BASE,
  linkTelegramAccount,
  setMemberStatus,
  releaseAdminTelegramLink,
  signInFullyVerified,
  signUpTestUser,
} from './helpers';

test.describe('صلاحيات لوحة الإدارة', () => {
  test('المستخدم العادي يرى صفحة «ليس لديك صلاحية»', async ({ context, page }) => {
    await signInFullyVerified(context);
    await page.goto('/admin');
    await expect(page.getByText('ليس لديك صلاحية')).toBeVisible();
    await expect(page.getByText('403')).toBeVisible();
  });

  test('واجهة الـ API ترفض المستخدم العادي بـ 403', async ({ context }) => {
    await signInFullyVerified(context);
    const response = await context.request.get(`${BASE}/api/admin/stats`);
    expect(response.status()).toBe(403);
  });

  test('الزائر غير المسجّل يُرفض من API الإدارة بـ 401', async ({ request }) => {
    const response = await request.get(`${BASE}/api/admin/stats`);
    expect(response.status()).toBe(401);
  });

  test('رابط الإدارة لا يظهر لغير الإدمن', async ({ context, page }) => {
    await signInFullyVerified(context);
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'الإدارة' })).toHaveCount(0);
  });

  test('الإدمن يرى الإحصاءات كاملة', async ({ context, page }) => {
    releaseAdminTelegramLink();
    await signUpTestUser(context);
    await setMemberStatus(context, ADMIN_TELEGRAM_ID, 'administrator');
    await linkTelegramAccount(context, ADMIN_TELEGRAM_ID);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'إحصاءات المنصة' })).toBeVisible();
    await expect(page.getByText('إجمالي المستخدمين')).toBeVisible();
    await expect(page.getByText('حسابات مرتبطة')).toBeVisible();
    await expect(page.getByText('أكثر الأدوات استخداماً')).toBeVisible();
    await expect(page.getByText('آخر المستخدمين المسجّلين')).toBeVisible();
  });
});
