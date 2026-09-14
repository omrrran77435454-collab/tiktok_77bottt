import { expect, test } from '@playwright/test';
import {
  ADMIN_TELEGRAM_ID,
  BASE,
  authHeaders,
  linkTelegramAccount,
  releaseAdminTelegramLink,
  setMemberStatus,
  signInAs,
  signInFullyVerified,
} from './helpers';

test.describe('صلاحيات لوحة الإدارة', () => {
  test('المستخدم العادي يرى صفحة «ليس لديك صلاحية»', async ({ context, page }) => {
    await signInFullyVerified(context);
    await page.goto('/admin');
    await expect(page.getByText('ليس لديك صلاحية')).toBeVisible();
    await expect(page.getByText('403')).toBeVisible();
  });

  test('واجهة الـ API ترفض المستخدم العادي بـ 403', async ({ context }) => {
    const { token } = await signInFullyVerified(context);
    const response = await context.request.get(`${BASE}/api/admin/stats`, {
      headers: authHeaders(token),
    });
    expect(response.status()).toBe(403);
  });

  test('الزائر بلا توكن يُرفض من API الإدارة بـ 401', async ({ request }) => {
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
    const token = await signInAs(context);
    await setMemberStatus(context, ADMIN_TELEGRAM_ID, 'administrator');
    await linkTelegramAccount(context, token, ADMIN_TELEGRAM_ID);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'إحصاءات المنصة' })).toBeVisible();
    await expect(page.getByText('إجمالي المستخدمين')).toBeVisible();
    await expect(page.getByText('حسابات مرتبطة')).toBeVisible();
    await expect(page.getByText('أكثر الأدوات استخداماً')).toBeVisible();
    await expect(page.getByText('آخر المستخدمين المسجّلين')).toBeVisible();
  });
});

test.describe('الإدمن بلا اشتراك مؤكَّد', () => {
  test('يدخل لوحة الإدارة حتى لو لم يُؤكَّد اشتراكه في القناة', async ({ context, page }) => {
    releaseAdminTelegramLink();
    const token = await signInAs(context);
    // مربوط لكن غير مشترك
    await setMemberStatus(context, ADMIN_TELEGRAM_ID, 'left');
    await linkTelegramAccount(context, token, ADMIN_TELEGRAM_ID);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'إحصاءات المنصة' })).toBeVisible();

    // ومع ذلك الأدوات تبقى مغلقة عليه كأي مستخدم.
    await page.goto('/tools');
    await expect(page).toHaveURL(/\/connect$/);
  });
});
