import type { ApiError } from '@shared/types';

/** خطأ API برسالة عربية جاهزة للعرض للمستخدم. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

const NETWORK_MESSAGE = 'تعذّر الاتصال بالخادم. تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.';

type TokenProvider = () => Promise<string | null>;

let getToken: TokenProvider = async () => null;

/**
 * يسجّل مصدر Firebase ID Token.
 *
 * كل طلب إلى ‎/api/*‎ يحمل ترويسة ‎Authorization: Bearer <idToken>‎،
 * والخادم يتحقّق من توقيع التوكن. لا نستخدم كوكيز للجلسة إطلاقاً،
 * وهذا يُلغي الحاجة لحماية CSRF على مستوى الكوكي.
 */
export function setTokenProvider(provider: TokenProvider): void {
  getToken = provider;
}

/**
 * غلاف fetch موحّد:
 *  - يرفق Firebase ID Token تلقائياً.
 *  - يحوّل أي خطأ إلى رسالة عربية مفهومة بدون تفاصيل تقنية.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK', NETWORK_MESSAGE);
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = payload as ApiError | null;
    throw new ApiRequestError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.error ?? 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    );
  }

  return payload as T;
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body === undefined ? '{}' : JSON.stringify(body),
  });
}
