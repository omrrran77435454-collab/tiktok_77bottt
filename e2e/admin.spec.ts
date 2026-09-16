import { expect, test } from '@playwright/test';
import {
  BASE,
  authHeaders,
  linkTelegramAccount,
  setMemberStatus,
  signInAsAdmin,
  signInFullyVerified,
  uniqueTelegramId,
} from './helpers';

/*
 * صلاحية الإدارة مفصولة تماماً عن دور التجربة (معلم/طالب) وعن تيليجرام.
 * مصدرها الوحيد: بريد مؤكَّد في توكن الهوية يطابق ADMIN_EMAIL على الخادم.
 * لذلك لا يوجد في هذه المواصفة أي «ترقية» عبر معرّف تيليجرام.
 */

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
    const token = await signInAsAdmin(context);
    const telegramId = uniqueTelegramId();
    await setMemberStatus(context, telegramId, 'member');
    await linkTelegramAccount(context, token, telegramId);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'إحصاءات المنصة' })).toBeVisible();
    await expect(page.getByText('إجمالي المستخدمين')).toBeVisible();
    await expect(page.getByText('حسابات مرتبطة')).toBeVisible();
    await expect(page.getByText('أكثر الأدوات استخداماً')).toBeVisible();
    await expect(page.getByText('آخر المستخدمين المسجّلين')).toBeVisible();
  });

  test('بريد الإدمن غير المؤكَّد لا يمنح أي صلاحية', async ({ context, page }) => {
    // نفس البريد تماماً، لكن email_verified = false في التوكن.
    const token = await signInAsAdmin(context, { emailVerified: false });

    const response = await context.request.get(`${BASE}/api/admin/stats`, {
      headers: authHeaders(token),
    });
    expect(response.status()).toBe(403);

    await page.goto('/admin');
    await expect(page.getByText('ليس لديك صلاحية')).toBeVisible();
  });
});

test.describe('الإدمن بلا اشتراك مؤكَّد', () => {
  test('يدخل لوحة الإدارة حتى لو لم يُؤكَّد اشتراكه في القناة', async ({ context, page }) => {
    // لا ربط ولا اشتراك إطلاقاً — الصلاحية من البريد المؤكَّد وحده.
    await signInAsAdmin(context);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'إحصاءات المنصة' })).toBeVisible();

    // ومع ذلك الأدوات تبقى مغلقة عليه كأي مستخدم.
    await page.goto('/tools');
    await expect(page).toHaveURL(/\/connect$/);
  });
});
