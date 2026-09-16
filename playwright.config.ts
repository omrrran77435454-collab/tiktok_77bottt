import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;

/**
 * في بعض بيئات التشغيل يكون متصفّح Chromium مثبّتاً مسبقاً في مسار مخصّص.
 * اضبط PLAYWRIGHT_CHROMIUM_PATH عندها؛ وإلا يستخدم Playwright متصفّحه الافتراضي.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ar',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  /*
   * خادمان: محاكي Telegram (حتى لا نلمس الخدمة الحقيقية ولا نحتاج توكناً)،
   * وخادم التطوير الذي يشغّل الـ Worker وقاعدة D1 المحلية.
   */
  webServer: [
    {
      command: 'node scripts/mock-telegram.mjs 8788',
      url: 'http://127.0.0.1:8788/__control/messages',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
