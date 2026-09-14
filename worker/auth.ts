import { betterAuth } from 'better-auth';
import type { Env } from './env';
import { isTestMode } from './env';

/**
 * إعداد Better Auth.
 *
 * - قاعدة البيانات: Cloudflare D1 مباشرةً (دعم رسمي في Better Auth ≥ 1.7).
 * - المزوّد الوحيد في الإنتاج: Google OAuth.
 * - حقل `role` إضافي على المستخدم مع `input: false` حتى لا يستطيع العميل
 *   إرساله أو تعديله إطلاقاً — الترقية إلى admin تتم من الخادم فقط.
 */
function createAuth(env: Env) {
  const baseURL = env.BETTER_AUTH_URL || 'http://localhost:5173';
  const isSecure = baseURL.startsWith('https://');

  const auth = betterAuth({
    appName: 'أدوات المعلم',
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    basePath: '/api/auth',
    trustedOrigins: [baseURL],

    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },

    // تسجيل الدخول بالبريد مُعطَّل تماماً في الإنتاج، ويُفعَّل فقط في وضع E2E.
    emailAndPassword: {
      enabled: isTestMode(env),
      requireEmailVerification: false,
    },

    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'user',
          // مهم أمنياً: يمنع العميل من إرسال role عند التسجيل أو التحديث.
          input: false,
        },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // كاش قصير في الكوكي يقلّل قراءات D1 بشكل كبير.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },

    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isSecure,
        path: '/',
      },
      useSecureCookies: isSecure,
    },

    telemetry: { enabled: false },
  });

  return auth;
}

type AuthInstance = ReturnType<typeof createAuth>;

// نُنشئ نسخة واحدة لكل isolate بدل إنشائها في كل طلب (أسرع وأقل استهلاكاً).
let cached: { auth: AuthInstance; key: string } | null = null;

export function getAuth(env: Env): AuthInstance {
  const key = `${env.BETTER_AUTH_URL}|${isTestMode(env)}`;
  if (cached && cached.key === key) return cached.auth;
  const auth = createAuth(env);
  cached = { auth, key };
  return auth;
}

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/** يقرأ الجلسة الحالية من الكوكي. يُرجع null إذا لم تكن هناك جلسة صالحة. */
export async function getSessionUser(request: Request, env: Env): Promise<AuthedUser | null> {
  try {
    const auth = getAuth(env);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return null;
    return {
      id: session.user.id,
      name: session.user.name ?? '',
      email: session.user.email ?? '',
      image: session.user.image ?? null,
    };
  } catch {
    return null;
  }
}
