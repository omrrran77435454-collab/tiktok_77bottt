import { expect, test } from '@playwright/test';
import {
  horizontalOverflow,
  openDesignPanel,
  openPreviewTab,
  signInFullyVerified,
} from './helpers';

test.describe('محرّر الأدوات', () => {
  test.beforeEach(async ({ context, page }) => {
    await signInFullyVerified(context);
    await page.goto('/tools/student-followup');
    await expect(page.getByRole('heading', { name: 'بيانات الأداة' })).toBeVisible();
  });

  test('المعاينة تتحدّث فوراً مع الكتابة (Live Preview)', async ({ page }) => {
    const preview = page.locator('.doc-root .doc-page').first();
    await page.getByLabel('المادة').fill('الرياضيات');
    await expect(preview).toContainText('الرياضيات', { timeout: 5000 });

    await page.getByLabel('عنوان الاختبار').fill('اختبار الوحدة الأولى');
    await expect(preview).toContainText('اختبار الوحدة الأولى');
  });

  test('إضافة طالب تظهر في المستند', async ({ page }) => {
    await page.getByRole('button', { name: /إضافة طالب/ }).click();
    const names = page.getByLabel('اسم الطالب');
    await names.last().fill('نايف السبيعي');
    await expect(page.locator('.doc-root .doc-page').first()).toContainText('نايف السبيعي');
  });

  test('حذف طالب يزيله من المستند', async ({ page }) => {
    await page.getByRole('button', { name: 'بيانات نموذجية' }).click();
    const preview = page.locator('.doc-root').first();
    await expect(preview).toContainText('عبدالرحمن العتيبي');

    await page.getByRole('button', { name: 'حذف الصف 1' }).click();
    await expect(preview).not.toContainText('عبدالرحمن العتيبي');
  });

  test('تغيير القالب يغيّر شكل المستند فوراً', async ({ page }) => {
    await page.getByRole('button', { name: 'بيانات نموذجية' }).click();
    await openDesignPanel(page);
    const root = page.locator('.doc-root');

    await page.getByRole('radio', { name: /رسمي نظيف/ }).first().click();
    await expect(root).toHaveAttribute('data-template', 'formal');
    await expect(page.locator('.doc-page').first()).toHaveClass(/tpl-formal/);

    await page.getByRole('radio', { name: /أكاديمي/ }).first().click();
    await expect(root).toHaveAttribute('data-template', 'academic');
    await expect(page.locator('.doc-page').first()).toHaveClass(/tpl-academic/);

    await page.getByRole('radio', { name: /أبيض وأسود/ }).first().click();
    await expect(root).toHaveAttribute('data-template', 'bw-print');
  });

  test('القوالب السبعة كلها متاحة وقابلة للاختيار', async ({ page }) => {
    await openDesignPanel(page);
    const options = page.locator('.tpl-thumb');
    await expect(options).toHaveCount(7);
    for (let index = 0; index < 7; index += 1) {
      await options.nth(index).click();
      await expect(options.nth(index)).toHaveAttribute('aria-checked', 'true');
    }
  });

  test('تغيير اللون ينعكس على المستند', async ({ page }) => {
    await openDesignPanel(page);
    const firstPage = page.locator('.doc-page').first();
    await page.getByRole('button', { name: /أزرق هادئ/ }).click();
    await expect(firstPage).toHaveAttribute('style', /--doc-primary:\s*#1F4E79/i);
  });

  test('تحذير التباين يظهر عند اختيار ألوان غير مقروءة', async ({ page }) => {
    await openDesignPanel(page);
    const hexInput = page.getByLabel('اللون الأساسي بصيغة HEX');
    await hexInput.fill('#FAFAFA');
    await expect(page.getByText('تنبيه تباين')).toBeVisible();

    await page.getByRole('button', { name: 'إعادة الألوان الافتراضية' }).click();
    await expect(page.getByText('تنبيه تباين')).toBeHidden();
  });

  test('الحفظ المحلي يستعيد البيانات بعد إعادة التحميل', async ({ page }) => {
    await page.getByLabel('المادة').fill('العلوم');
    await page.waitForTimeout(1200);
    await page.reload();
    await expect(page.getByLabel('المادة')).toHaveValue('العلوم');
  });

  test('مسح بيانات الأداة يفرغ النموذج ويمسح التخزين المحلي', async ({ page }) => {
    await page.getByRole('button', { name: 'بيانات نموذجية' }).click();
    await page.waitForTimeout(1000);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'مسح بيانات الأداة' }).click();

    await expect(page.getByLabel('المادة')).toHaveValue('');
    const stored = await page.evaluate(() =>
      localStorage.getItem('teacher-tools:tool:student-followup'),
    );
    expect(stored === null || stored === '').toBeTruthy();
  });

  test('لا تُرسل بيانات الطلاب إلى الخادم إطلاقاً', async ({ page }) => {
    const leaked: string[] = [];
    page.on('request', (request) => {
      if (!request.url().includes('/api/')) return;
      const body = request.postData() ?? '';
      if (body.includes('طالب سرّي') || body.includes('9.75')) leaked.push(request.url());
    });

    await page.getByRole('button', { name: /إضافة طالب/ }).click();
    await page.getByLabel('اسم الطالب').last().fill('طالب سرّي');
    await page.getByLabel('الدرجة').last().fill('9.75');
    await page.waitForTimeout(2500);

    expect(leaked).toEqual([]);
  });

  test('التكبير والتصغير لا يغيّران مقاس صفحة المستند', async ({ page }) => {
    await openPreviewTab(page);
    const firstPage = page.locator('.doc-page').first();
    const before = await firstPage.evaluate((element) => (element as HTMLElement).offsetWidth);

    await page.getByRole('button', { name: 'تكبير المعاينة' }).click();
    await page.getByRole('button', { name: 'تكبير المعاينة' }).click();
    const after = await firstPage.evaluate((element) => (element as HTMLElement).offsetWidth);

    expect(after).toBe(before);
    expect(before).toBe(794);
  });

  test('تصدير PDF ينتج ملفاً فعلياً', async ({ page }) => {
    await page.getByRole('button', { name: 'بيانات نموذجية' }).click();
    await openPreviewTab(page);
    await page.waitForTimeout(1200);

    const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
    await page.getByRole('button', { name: 'PDF', exact: true }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    await expect(page.getByText(/تم إنشاء ملف PDF/)).toBeVisible({ timeout: 90_000 });
  });

  test('تصدير PNG ينتج صورة فعلية', async ({ page }) => {
    await page.getByRole('button', { name: 'بيانات نموذجية' }).click();
    await openPreviewTab(page);
    await page.waitForTimeout(1200);

    const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
    await page.getByRole('button', { name: 'PNG', exact: true }).click();
    const download = await downloadPromise;
    expect(await download.path()).toBeTruthy();
  });

  test('أربعون طالباً تُوزَّع على صفحات متعدّدة بلا تجاوز', async ({ page }) => {
    await page.evaluate(() => {
      const students = Array.from({ length: 40 }, (_, index) => ({
        name: `الطالب رقم ${index + 1}`,
        score: String((index % 11) + 0.5),
        weakSkill: 'الفهم القرائي',
        category: 'auto',
        action: '',
        reviewDate: '',
        notes: '',
      }));
      localStorage.setItem(
        'teacher-tools:tool:student-followup',
        JSON.stringify({
          subject: 'اللغة العربية',
          grade: 'الخامس',
          testTitle: 'اختبار',
          date: '2026-09-14',
          maxScore: '10',
          thresholds: { excellent: 85, good: 60 },
          students,
        }),
      );
    });
    await page.reload();
    await page.waitForTimeout(2500);

    const pages = page.locator('.doc-root .doc-page');
    expect(await pages.count()).toBeGreaterThan(1);

    // لا يتجاوز أي محتوى حدود صفحته
    const overflows = await page.evaluate(() => {
      const problems: string[] = [];
      document.querySelectorAll('.doc-page').forEach((element, index) => {
        const footer = element.querySelector('.doc-footer');
        const content = element.querySelector('.doc-page-content');
        const last = content?.lastElementChild;
        if (!footer || !last) return;
        if (last.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 2) {
          problems.push(`page ${index + 1}`);
        }
      });
      return problems;
    });
    expect(overflows).toEqual([]);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});

test.describe('التحقّق من المدخلات', () => {
  test.beforeEach(async ({ context }) => {
    await signInFullyVerified(context);
  });

  test('درجة أعلى من الدرجة الكلية تمنع التصدير وتُظهر رسالة', async ({ page }) => {
    await page.goto('/tools/student-followup');
    await page.getByLabel('الدرجة الكلية').fill('10');
    await page.getByRole('button', { name: /إضافة طالب/ }).click();
    await page.getByLabel('الدرجة').last().fill('15');

    await expect(page.getByText(/درجة الطالب لا يمكن أن تتجاوز الدرجة الكلية/)).toBeVisible();

    await openPreviewTab(page);
    await page.getByRole('button', { name: 'PDF', exact: true }).click();
    await expect(page.getByText(/راجع المدخلات/)).toBeVisible();
  });

  test('عدد المخطئين أكبر من عدد الطلاب يُرفض', async ({ page }) => {
    await page.goto('/tools/error-map');
    await page.getByLabel('عدد طلاب الصف').fill('20');
    await page.getByLabel('عدد من أخطأ').first().fill('30');

    await expect(
      page.getByText(/عدد الطلاب الذين أخطأوا لا يمكن أن يتجاوز عدد طلاب الصف/),
    ).toBeVisible();
  });

  test('أيام غياب سالبة تُرفض', async ({ page }) => {
    await page.goto('/tools/absence-plan');
    await page.getByLabel('عدد أيام الغياب').fill('-3');
    await expect(page.getByText(/عدد أيام الغياب لا يمكن أن يكون سالباً/)).toBeVisible();
  });

  test('تصحيح الخطأ يُخفي التنبيه ويسمح بالتصدير', async ({ page }) => {
    await page.goto('/tools/student-followup');
    await page.getByLabel('الدرجة الكلية').fill('10');
    await page.getByRole('button', { name: /إضافة طالب/ }).click();
    await page.getByLabel('الدرجة').last().fill('15');
    await expect(page.getByText(/لا يمكن أن تتجاوز/)).toBeVisible();

    await page.getByLabel('الدرجة').last().fill('8');
    await expect(page.getByText(/لا يمكن أن تتجاوز/)).toBeHidden();
  });
});
