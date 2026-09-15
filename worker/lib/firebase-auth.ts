import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Env } from '../env';
import { isTestMode } from '../env';
import { timingSafeEqual } from './crypto';

/**
 * التحقّق من Firebase ID Token على الخادم.
 *
 * لا نثق إطلاقاً بأي uid أو email أو role يرسله المتصفّح؛ كل هوية المستخدم
 * تُستخرج من توكن موقّع تحقّقنا منه هنا.
 *
 * ما يُفحص (حسب توثيق Firebase للتحقّق من التوكن بطرف ثالث):
 *   • الخوارزمية RS256 والتوقيع مقابل مفاتيح Google العامة.
 *   • iss = https://securetoken.google.com/<PROJECT_ID>
 *   • aud = <PROJECT_ID>
 *   • exp في المستقبل و iat/auth_time في الماضي.
 *   • sub غير فارغ (هو الـ uid).
 */

const JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
);

/** المفاتيح تتغيّر نادراً؛ التخزين المؤقّت يمنع طلباً خارجياً مع كل تحقّق. */
const JWKS_CACHE_MS = 6 * 60 * 60 * 1000;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(JWKS_URL, {
      cacheMaxAge: JWKS_CACHE_MS,
      cooldownDuration: 30_000,
      timeoutDuration: 8_000,
    });
  }
  return jwks;
}

export interface VerifiedIdentity {
  /** Firebase uid (claim: sub). */
  uid: string;
  email: string;
  /**
   * هل أكّد المزوّد ملكية البريد؟ (claim: email_verified)
   * حاسم لتحديد المدير: بريد غير مؤكَّد لا يمنح أي صلاحية.
   */
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

export type VerifyResult =
  | { ok: true; identity: VerifiedIdentity }
  | { ok: false; reason: 'missing' | 'invalid' | 'expired' | 'unavailable' };

/** يستخرج التوكن من ترويسة Authorization. */
export function readBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function identityFromClaims(payload: JWTPayload): VerifiedIdentity | null {
  const uid = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  if (!uid) return null;

  const email = typeof payload.email === 'string' ? payload.email : '';
  const name = typeof payload.name === 'string' ? payload.name : '';
  const picture = typeof payload.picture === 'string' ? payload.picture : null;
  // لا نقبل إلا القيمة المنطقية true صراحةً — أي شيء آخر يعني «غير مؤكَّد».
  const emailVerified = payload.email_verified === true;

  return { uid, email, emailVerified, name: name || email.split('@')[0] || 'معلّم', picture };
}

/**
 * توكن اختبار محلي (E2E فقط).
 * الصيغة: `test.<base64url(json)>.<sha256(payload + السرّ)>`
 * لا يعمل إطلاقاً ما لم يكن E2E_TEST_MODE=true مع سرّ غير فارغ.
 */
async function verifyTestToken(token: string, env: Env): Promise<VerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'test') return { ok: false, reason: 'invalid' };

  const { sha256Hex } = await import('./crypto');
  const expected = await sha256Hex(`${parts[1]}.${env.E2E_TEST_SECRET}`);
  if (!timingSafeEqual(parts[2], expected)) return { ok: false, reason: 'invalid' };

  try {
    // atob يُرجع سلسلة بايتات (latin-1) لا نصاً UTF-8، فالأسماء العربية
    // تتشوّه إن قرأناها مباشرة. نمرّ بالبايتات ثم TextDecoder.
    const binary = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder('utf-8').decode(bytes)) as JWTPayload;
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return { ok: false, reason: 'expired' };
    }
    const identity = identityFromClaims(payload);
    return identity ? { ok: true, identity } : { ok: false, reason: 'invalid' };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export async function verifyIdToken(token: string | null, env: Env): Promise<VerifyResult> {
  if (!token) return { ok: false, reason: 'missing' };

  if (isTestMode(env) && token.startsWith('test.')) {
    return verifyTestToken(token, env);
  }

  const projectId = (env.FIREBASE_PROJECT_ID ?? '').trim();
  if (!projectId) return { ok: false, reason: 'unavailable' };

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      clockTolerance: 60,
    });

    // auth_time يجب أن يكون في الماضي (شرط يذكره توثيق Firebase صراحةً).
    if (typeof payload.auth_time === 'number' && payload.auth_time * 1000 > Date.now() + 60_000) {
      return { ok: false, reason: 'invalid' };
    }

    const identity = identityFromClaims(payload);
    return identity ? { ok: true, identity } : { ok: false, reason: 'invalid' };
  } catch (error) {
    const code = (error as { code?: string })?.code ?? '';
    if (code === 'ERR_JWT_EXPIRED') return { ok: false, reason: 'expired' };
    // تعذّر جلب مفاتيح Google (شبكة) ≠ توكن غير صالح.
    if (code === 'ERR_JWKS_TIMEOUT' || code === 'ERR_JWKS_NO_MATCHING_KEY') {
      return { ok: false, reason: 'unavailable' };
    }
    return { ok: false, reason: 'invalid' };
  }
}
