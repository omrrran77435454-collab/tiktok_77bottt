import { createHash } from 'node:crypto';

/**
 * يبني توكن اختبار بنفس الصيغة التي يقبلها الـ Worker في وضع E2E.
 * لا علاقة له بـ Firebase ولا يعمل إطلاقاً إذا كان E2E_TEST_MODE مُعطّلاً.
 */
export function makeTestToken(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const signature = createHash('sha256').update(`${body}.${secret}`).digest('hex');
  return `test.${body}.${signature}`;
}

export function identityToken(
  options: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string | null;
    expiresInSeconds?: number;
  },
  secret: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  return makeTestToken(
    {
      sub: options.uid,
      email: options.email ?? `${options.uid}@example.com`,
      name: options.name ?? 'معلّم الاختبار',
      picture: options.picture ?? null,
      iat: now,
      exp: now + (options.expiresInSeconds ?? 3600),
    },
    secret,
  );
}
