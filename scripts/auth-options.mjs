/**
 * نسخة مبسّطة من إعدادات Better Auth تُستخدم لتوليد الـ migrations فقط.
 * يجب أن تبقى الحقول الإضافية هنا مطابقة لِما في worker/auth.ts.
 */
export function authOptionsForMigration(database) {
  return {
    appName: 'أدوات المعلم',
    database,
    secret: 'migration-only-secret-not-used-anywhere-else',
    baseURL: 'http://localhost:5173',
    basePath: '/api/auth',
    emailAndPassword: { enabled: true },
    socialProviders: { google: { clientId: 'x', clientSecret: 'y' } },
    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'user', input: false },
      },
    },
  };
}
