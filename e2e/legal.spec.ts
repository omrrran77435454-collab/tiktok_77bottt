import { expect, test } from '@playwright/test';
import { horizontalOverflow } from './helpers';

test.describe('الصفحات القانونية والهوية', () => {
  test('سياسة الخصوصية متاحة للزائر وتشرح سياسة بيانات الطلاب', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'سياسة الخصوصية' })).toBeVisible();
    await expect(page.getByText(/تبقى في متصفّحك/)).toBeVisible();
    await expect(page.getByText('Firebase').first()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });

  test('شروط الاستخدام متاحة وتوضّح أن المخرجات ليست اعتماداً رسمياً', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'شروط الاستخدام' })).toBeVisible();
    await expect(page.getByText(/ليست اعتماداً رسمياً/)).toBeVisible();
  });

  test('روابط التذييل تصل إلى الصفحتين', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'سياسة الخصوصية' }).first().click();
    await expect(page).toHaveURL(/\/privacy$/);

    await page.getByRole('link', { name: 'شروط الاستخدام' }).first().click();
    await expect(page).toHaveURL(/\/terms$/);
  });

  test('ملفات الأيقونة كلها متاحة بلا 404', async ({ request }) => {
    const paths = [
      '/favicon.ico',
      '/favicon-16x16.png',
      '/favicon-32x32.png',
      '/favicon-48x48.png',
      '/apple-touch-icon.png',
      '/icon-192.png',
      '/icon-512.png',
      '/maskable-icon-192.png',
      '/maskable-icon-512.png',
      '/og-image.png',
      '/site.webmanifest',
    ];
    for (const path of paths) {
      const response = await request.get(path);
      expect(response.status(), `${path} يجب أن يعمل`).toBe(200);
      expect(Number(response.headers()['content-length'] ?? '1')).toBeGreaterThan(0);
    }
  });

  test('الـ manifest صالح ويشير إلى أيقونات موجودة', async ({ request }) => {
    const response = await request.get('/site.webmanifest');
    const manifest = (await response.json()) as {
      name: string;
      theme_color: string;
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    expect(manifest.name).toBe('أدوات المعلم');
    expect(manifest.theme_color).toBe('#0D5B58');
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).status(), `${icon.src}`).toBe(200);
    }
  });

  test('الأيقونة الرسمية تظهر في الهيدر وصفحة الهبوط', async ({ page }) => {
    await page.goto('/');
    const headerIcon = page.locator('.brand-mark');
    await expect(headerIcon).toBeVisible();
    await expect(headerIcon).toHaveAttribute('src', '/icon-192.png');
    // بجانبها اسم المنصّة، لذلك alt فارغ حتى لا يكرّر قارئ الشاشة الاسم.
    await expect(headerIcon).toHaveAttribute('alt', '');

    const heroIcon = page.locator('.hero-brand-icon');
    await expect(heroIcon).toBeVisible();
    await expect(heroIcon).toHaveAttribute('alt', 'أدوات المعلم');
  });

  test('بيانات الصفحة (title / description / theme-color) صحيحة', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('أدوات المعلم — أدوات تختصر شغل المعلم');

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('أدوات عربية تساعد المعلم');

    const theme = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(theme).toBe('#0D5B58');

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toContain('أدوات المعلم');
  });
});
