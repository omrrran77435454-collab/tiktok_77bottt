import { expect, test } from '@playwright/test';
import {
  horizontalOverflow,
  signInAs,
  signInFullyVerified,
  linkTelegramAccount,
  setMemberStatus,
  uniqueTelegramId,
} from './helpers';

/**
 * مسارات المنصّة الكاملة: التهيئة، لوحة المعلم، الجدول الأسبوعي،
 * ولوحة الطالب وأدواته.
 */

test.describe('تهيئة الحساب', () => {
  test('المستخدم الجديد يمرّ بالمعالج مرة واحدة ثم يصل لوحته', async ({ context, page }) => {
    await signInFullyVerified(context, { skipOnboarding: true });

    await page.goto('/dashboard');
    // بلا ملف مكتمل ⇒ تحويل تلقائي إلى التهيئة.
    await expect(page).toHaveURL(/\/welcome$/, { timeout: 15_000 });

    // 1) الدور
    await expect(page.getByRole('heading', { name: 'من أنت؟' })).toBeVisible();
    await page.getByRole('button', { name: /^معلم/ }).click();
    await page.getByRole('button', { name: 'التالي' }).click();

    // 2) المرحلة
    await expect(page.getByRole('heading', { name: 'ما المرحلة؟' })).toBeVisible();
    await page.getByRole('button', { name: 'ابتدائي' }).click();
    await page.getByRole('button', { name: 'التالي' }).click();

    // 3) الصف
    await expect(page.getByRole('heading', { name: 'ما الصف؟' })).toBeVisible();
    await page.getByRole('button', { name: 'الخامس الابتدائي' }).click();
    await page.getByRole('button', { name: 'التالي' }).click();

    // 4) المواد
    await expect(page.getByRole('heading', { name: 'ما المواد؟' })).toBeVisible();
    await page.getByRole('button', { name: 'الرياضيات' }).first().click();
    await page.getByRole('button', { name: 'ابدأ استخدام أدوات المعلم' }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    // لا تظهر التهيئة مرة أخرى.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'من أنت؟' })).toHaveCount(0);
  });

  test('زر التالي معطّل قبل الاختيار', async ({ context, page }) => {
    await signInFullyVerified(context, { skipOnboarding: true });
    await page.goto('/welcome');

    await page.getByRole('button', { name: /^معلم/ }).click();
    await page.getByRole('button', { name: 'التالي' }).click();

    // خطوة المرحلة: لا اختيار بعد ⇒ التالي معطّل.
    await expect(page.getByRole('button', { name: 'التالي' })).toBeDisabled();
  });
});

test.describe('لوحة المعلم', () => {
  test.beforeEach(async ({ context }) => {
    await signInFullyVerified(context);
  });

  test('تعرض التحية والاختصارات وتدعو لإضافة الجدول', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /الخير|مرحباً بك/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'جدولي الأسبوعي' })).toBeVisible();
    // بلا جدول بعد ⇒ دعوة صريحة لإضافته.
    await expect(page.getByRole('link', { name: /أضف جدولك/ })).toBeVisible();
  });

  test('شريط التنقّل السفلي يعمل على الجوال', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'الشريط السفلي للجوال فقط');

    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'التنقّل السريع' });
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: 'أسبوعي' }).click();
    await expect(page).toHaveURL(/\/schedule$/);

    await nav.getByRole('link', { name: 'الأدوات' }).click();
    await expect(page).toHaveURL(/\/tools$/);
  });
});

test.describe('الجدول الأسبوعي', () => {
  test.beforeEach(async ({ context, page }) => {
    await signInFullyVerified(context);
    await page.goto('/schedule');
    await expect(page.getByRole('heading', { name: 'جدولي الأسبوعي' })).toBeVisible();
  });

  test('إضافة حصة ثم تعديلها ثم حذفها', async ({ page }) => {
    await page.getByRole('button', { name: 'الأحد' }).click();
    await expect(page.getByText('ليس لديك حصص في هذا اليوم بعد')).toBeVisible();

    await page.getByRole('button', { name: 'إضافة حصة' }).click();
    await page.getByLabel('عنوان الدرس').fill('جمع الكسور');
    await page.getByLabel('الفصل').fill('أ');
    await page.getByRole('button', { name: 'إضافة الحصة' }).click();

    await expect(page.getByText('جمع الكسور')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'تعديل' }).first().click();
    await page.getByLabel('عنوان الدرس').fill('طرح الكسور');
    await page.getByRole('button', { name: 'حفظ التعديل' }).click();

    await expect(page.getByText('طرح الكسور')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('جمع الكسور')).toHaveCount(0);

    await page.getByRole('button', { name: 'حذف' }).first().click();
    await expect(page.getByText('ليس لديك حصص في هذا اليوم بعد')).toBeVisible({ timeout: 10_000 });
  });

  test('تغيير إعدادات الجدول يعيد حساب أوقات الحصص', async ({ page }) => {
    await page.getByRole('button', { name: 'إعدادات الجدول' }).click();
    await page.getByLabel('وقت بداية اليوم').fill('08:00');
    await page.getByLabel('مدة الحصة (دقيقة)').fill('50');
    await page.getByRole('button', { name: 'حفظ الإعدادات' }).click();

    await page.getByRole('button', { name: 'إضافة حصة' }).click();
    await page.getByLabel('عنوان الدرس').fill('حصة التوقيت');
    await page.getByRole('button', { name: 'إضافة الحصة' }).click();

    await expect(page.getByText('08:00', { exact: false })).toBeVisible({ timeout: 10_000 });
  });

  test('لا تمرير أفقي على الجوال', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'يخصّ الجوال');
    expect(await horizontalOverflow(page)).toBe(false);
  });
});

test.describe('حساب الطالب', () => {
  test('يرى لوحة الطالب وأدواته لا أدوات المعلم', async ({ context, page }) => {
    await signInFullyVerified(context, { role: 'student', subjects: ['math'] });

    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'خطة المذاكرة' })).toBeVisible({ timeout: 15_000 });

    await page.goto('/tools');
    await expect(page.getByRole('heading', { name: 'خطة المذاكرة' })).toBeVisible({
      timeout: 15_000,
    });
    // أدوات المعلم لا تظهر للطالب.
    await expect(page.getByRole('heading', { name: 'خريطة أخطاء الصف' })).toHaveCount(0);
  });

  test('أداة خطة المذاكرة تُنتج مستنداً حيّاً', async ({ context, page }) => {
    await signInFullyVerified(context, { role: 'student', subjects: ['math'] });

    await page.goto('/tools/study-plan');
    await expect(page.getByRole('heading', { name: 'خطة المذاكرة' }).first()).toBeVisible();

    await page.getByLabel('اسمك').fill('نورة');
    await expect(page.locator('.doc-root .doc-page').first()).toContainText('نورة', {
      timeout: 10_000,
    });
  });
});

test.describe('بوابة تيليجرام', () => {
  test('لا يظهر زر التحقق قبل ظهور زر الاشتراك', async ({ context, page }) => {
    await signInAs(context);
    await page.goto('/connect');

    // غير مربوط: زر الربط وحده.
    await expect(page.getByRole('button', { name: 'ربط Telegram' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'تحقق من الاشتراك' })).toHaveCount(0);
  });

  test('بعد الربط بلا اشتراك يظهر زر الاشتراك ومعه زر التحقق', async ({ context, page }) => {
    const token = await signInAs(context);
    const telegramId = uniqueTelegramId();
    await setMemberStatus(context, telegramId, 'left');
    await linkTelegramAccount(context, token, telegramId);

    await page.goto('/connect');

    await expect(page.getByRole('link', { name: 'اشترك في القناة' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'تحقق من الاشتراك' })).toBeVisible();
  });
});
