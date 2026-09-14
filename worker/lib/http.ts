import type { ApiError } from '@shared/types';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
}

/**
 * خطأ موحّد برسالة عربية جاهزة للعرض + رمز ثابت للتعامل البرمجي.
 * لا نُرجع أبداً تفاصيل تقنية أو Stack Trace للمستخدم.
 */
export function apiError(status: number, code: string, message: string): Response {
  const body: ApiError = { error: message, code };
  return json(body, { status });
}

export const errors = {
  unauthorized: (message = 'يجب تسجيل الدخول أولاً.') =>
    apiError(401, 'UNAUTHORIZED', message),
  forbidden: () => apiError(403, 'FORBIDDEN', 'ليس لديك صلاحية للوصول إلى هذه الصفحة.'),
  notFound: () => apiError(404, 'NOT_FOUND', 'الصفحة أو المورد غير موجود.'),
  badRequest: (message = 'البيانات المُرسلة غير صحيحة.') => apiError(400, 'BAD_REQUEST', message),
  tooManyRequests: (message = 'عدد المحاولات كبير، انتظر قليلاً ثم أعد المحاولة.') =>
    apiError(429, 'TOO_MANY_REQUESTS', message),
  serverError: () => apiError(500, 'SERVER_ERROR', 'حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.'),
  serviceUnavailable: (message = 'الخدمة غير متاحة حالياً. حاول بعد قليل.') =>
    apiError(503, 'SERVICE_UNAVAILABLE', message),
  notConfigured: () =>
    apiError(503, 'NOT_CONFIGURED', 'النظام غير مكتمل الإعداد. راجع إعدادات الخادم.'),
};

/** يقرأ JSON من الطلب بأمان دون رمي استثناء. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
