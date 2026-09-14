import { expect, test } from '@playwright/test';
import { horizontalOverflow, signInFullyVerified } from './helpers';

const WIDTHS = [320, 360, 390, 412, 768, 1024, 1440];
const PATHS = ['/dashboard', '/tools', '/tools/student-followup', '/tools/error-map', '/account', '/help'];

test.describe('التجاوب والاتجاه', () => {
  test('لا يوجد تمرير أفقي غير مقصود على أي مقاس', async ({ context, page }) => {
    await signInFullyVerified(context);
    const problems: string[] = [];

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of PATHS) {
        await page.goto(path);
        await page.waitForTimeout(500);
        const overflow = await horizontalOverflow(page);
        if (overflow > 1) problems.push(`${path} @${width}px: +${overflow}px`);
      }
    }

    expect(problems).toEqual([]);
  });

  test('الاتجاه RTL مضبوط على مستوى المستند', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('تبويبات الجوال تعمل والمعاينة تظهر', async ({ context, page }) => {
    await signInFullyVerified(context);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/student-followup');

    await expect(page.getByRole('tab', { name: 'البيانات' })).toBeVisible();
    await page.getByRole('tab', { name: 'المعاينة والتصدير' }).click();
    await expect(page.locator('.doc-page').first()).toBeVisible();
  });

  test('الأزرار الأساسية بمقاس مريح للمس', async ({ context, page }) => {
    await signInFullyVerified(context);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /مرحباً/ })).toBeVisible();

    const buttons = page.locator('.tool-card .btn');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const box = await buttons.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('صفحات المساعدة والحساب تعمل بدون أخطاء في الـ Console', async ({ context, page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await signInFullyVerified(context);
    for (const path of ['/help', '/account', '/tools']) {
      await page.goto(path);
      await page.waitForTimeout(400);
    }
    expect(errors).toEqual([]);
  });
});
