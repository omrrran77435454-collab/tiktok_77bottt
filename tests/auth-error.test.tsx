/**
 * يثبت أن رمز خطأ Firebase يُستخرج ويُعرض للمستخدم، وأن شيئاً غيره لا يتسرّب.
 *
 * السياق: كانت الواجهة تعرض «تعذّر تسجيل الدخول بقوقل» لأي رمز غير معروف،
 * فضاع FirebaseError.code وهو المعلومة الوحيدة التي تحدّد السبب الحقيقي.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  describeSignInError,
  extractAuthErrorCode,
  logSignInError,
  messageForSignInError,
} from '@/lib/auth-error';
import { SignInErrorAlert } from '@/components/SignInErrorAlert';

/** خطأ Firebase كما يصل فعلاً إلى catch. */
function firebaseError(code: string, message = 'Firebase: Error.') {
  return Object.assign(new Error(message), { code, name: 'FirebaseError' });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('extractAuthErrorCode', () => {
  it('يستخرج الرموز التي نحتاجها للتشخيص', () => {
    const codes = [
      'auth/unauthorized-domain',
      'auth/popup-blocked',
      'auth/network-request-failed',
      'auth/internal-error',
      'auth/operation-not-allowed',
      'auth/web-storage-unsupported',
      'app/no-app',
    ];
    for (const code of codes) {
      expect(extractAuthErrorCode(firebaseError(code))).toBe(code);
    }
  });

  it('يقبل الرمز ولو جاء بمسافات أو أحرف كبيرة', () => {
    expect(extractAuthErrorCode(firebaseError('  AUTH/Unauthorized-Domain '))).toBe(
      'auth/unauthorized-domain',
    );
  });

  it('يُرجع null عندما لا يوجد رمز أصلاً', () => {
    expect(extractAuthErrorCode(new Error('boom'))).toBeNull();
    expect(extractAuthErrorCode(null)).toBeNull();
    expect(extractAuthErrorCode(undefined)).toBeNull();
    expect(extractAuthErrorCode('auth/popup-blocked')).toBeNull();
    expect(extractAuthErrorCode({ code: 42 })).toBeNull();
  });

  it('يرفض أي قيمة حسّاسة قد تُدسّ في حقل code', () => {
    const sensitive = [
      'ya29.a0AfB_byC-ACCESS-TOKEN',
      'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJzdWIiOiIxIn0.sig',
      'AIzaSyD-EXAMPLE-API-KEY',
      'teacher@example.com',
      'https://teacher-tools-144e6.firebaseapp.com/__/auth/handler?token=abc',
      'Error: boom\n    at signIn (app.js:1:1)',
      `auth/${'x'.repeat(200)}`,
    ];
    for (const value of sensitive) {
      expect(extractAuthErrorCode({ code: value })).toBeNull();
    }
  });
});

describe('describeSignInError', () => {
  it('يعطي رسالة عربية مخصّصة مع الرمز للأخطاء المعروفة', () => {
    const result = describeSignInError(firebaseError('auth/unauthorized-domain'));
    expect(result.code).toBe('auth/unauthorized-domain');
    expect(result.message).toContain('غير مصرّح به');
  });

  it('يبقي الرسالة العامة لكن يحتفظ بالرمز للأخطاء غير المعروفة', () => {
    const result = describeSignInError(firebaseError('auth/internal-error'));
    expect(result.message).toBe('تعذّر تسجيل الدخول بقوقل. حاول مرة ثانية.');
    expect(result.code).toBe('auth/internal-error');
  });

  it('لا يسرّب نص رسالة Firebase إلى ما يُعرض للمستخدم', () => {
    const error = firebaseError(
      'auth/internal-error',
      'Firebase: HTTP Cloud Function returned token ya29.SECRET (auth/internal-error).',
    );
    const result = describeSignInError(error);
    expect(result.message).not.toContain('ya29');
    expect(result.message).not.toContain('SECRET');
  });

  it('يستعمل الرسالة العامة بلا رمز عندما يكون الخطأ مجهول الشكل', () => {
    expect(describeSignInError(new Error('boom'))).toEqual({
      message: 'تعذّر تسجيل الدخول بقوقل. حاول مرة ثانية.',
      code: null,
    });
  });
});

describe('messageForSignInError', () => {
  it('يترجم الرموز الشائعة إلى رسائل عربية مفهومة', () => {
    expect(messageForSignInError('auth/popup-blocked')).toContain('النوافذ المنبثقة');
    expect(messageForSignInError('auth/network-request-failed')).toContain('الإنترنت');
    expect(messageForSignInError('auth/operation-not-allowed')).toContain('غير مفعّل');
    expect(messageForSignInError(null)).toBe('تعذّر تسجيل الدخول بقوقل. حاول مرة ثانية.');
  });
});

describe('logSignInError', () => {
  it('يسجّل code و message و name فقط — لا الكائن كاملاً', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('Firebase: Error (auth/internal-error).'), {
      code: 'auth/internal-error',
      name: 'FirebaseError',
      customData: { idToken: 'eyJhbGciOi.SECRET' },
    });

    logSignInError('signInWithPopup', error);

    expect(spy).toHaveBeenCalledTimes(1);
    const [label, details] = spy.mock.calls[0];
    expect(label).toBe('[auth] signInWithPopup');
    expect(details).toEqual({
      code: 'auth/internal-error',
      message: 'Firebase: Error (auth/internal-error).',
      name: 'FirebaseError',
    });
    expect(Object.keys(details as object)).toEqual(['code', 'message', 'name']);
  });
});

describe('SignInErrorAlert', () => {
  it('يعرض رمز الخطأ تحت الرسالة العامة', () => {
    render(
      <SignInErrorAlert
        message="تعذّر تسجيل الدخول بقوقل. حاول مرة ثانية."
        code="auth/unauthorized-domain"
      />,
    );

    expect(screen.getByText('تعذّر تسجيل الدخول بقوقل. حاول مرة ثانية.')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-error-code')).toHaveTextContent('auth/unauthorized-domain');
  });

  it('لا يعرض سطر الرمز عندما لا يوجد رمز', () => {
    render(<SignInErrorAlert message="تعذّر تسجيل الدخول بقوقل. حاول مرة ثانية." code={null} />);
    expect(screen.queryByTestId('sign-in-error-code')).not.toBeInTheDocument();
    expect(screen.queryByText(/رمز الخطأ/)).not.toBeInTheDocument();
  });

  it('لا يعرض سوى الرسالة والرمز — لا أي بيانات أخرى', () => {
    const { container } = render(
      <SignInErrorAlert message="تعذّر تسجيل الدخول بقوقل. حاول مرة ثانية." code="auth/internal-error" />,
    );
    const text = container.textContent ?? '';
    expect(text).toBe('تعذّر تسجيل الدخولتعذّر تسجيل الدخول بقوقل. حاول مرة ثانية.رمز الخطأ: auth/internal-error');
  });
});
