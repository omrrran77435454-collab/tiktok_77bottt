import { Alert } from '@/components/ui';

/**
 * تنبيه فشل تسجيل الدخول: رسالة عربية عامة، وتحتها رمز خطأ Firebase للتشخيص.
 *
 * الرمز يمرّ عبر extractAuthErrorCode قبل الوصول إلى هنا، فلا يُعرض إلا نصٌّ
 * بشكل «خدمة/رمز». لا توكن ولا بيانات حساب ولا stack trace.
 */
export function SignInErrorAlert({ message, code }: { message: string; code?: string | null }) {
  return (
    <Alert tone="error" title="تعذّر تسجيل الدخول">
      {message}
      {code ? (
        <div className="sign-in-error-code">
          رمز الخطأ: <code data-testid="sign-in-error-code">{code}</code>
        </div>
      ) : null}
    </Alert>
  );
}
