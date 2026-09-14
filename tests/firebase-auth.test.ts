// @vitest-environment node
/**
 * اختبارات التحقّق من Firebase ID Token.
 *
 * نُولّد توكنات RS256 حقيقية بمفتاح اختبار ونخدم JWKS محلياً عبر اعتراض fetch،
 * حتى نختبر نفس مسار الكود المستخدم في الإنتاج (jose + jwtVerify) بلا شبكة.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair, type JWK } from 'jose';
import { readBearerToken, verifyIdToken } from '../worker/lib/firebase-auth';
import type { Env } from '../worker/env';

const PROJECT_ID = 'teacher-tools-prod';
const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let privateKey: CryptoKey;
let publicJwk: JWK;
let wrongKey: CryptoKey;

const env = { FIREBASE_PROJECT_ID: PROJECT_ID } as Env;

interface TokenOptions {
  sub?: string;
  issuer?: string;
  audience?: string;
  expiresIn?: number;
  issuedAt?: number;
  authTime?: number;
  key?: CryptoKey;
  algorithm?: string;
  extra?: Record<string, unknown>;
}

async function makeToken(options: TokenOptions = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = new SignJWT({
    email: 'teacher@example.com',
    name: 'معلّم الاختبار',
    picture: 'https://example.com/a.png',
    auth_time: options.authTime ?? now - 10,
    ...(options.extra ?? {}),
  })
    .setProtectedHeader({ alg: options.algorithm ?? 'RS256', kid: 'test-key' })
    .setSubject(options.sub ?? 'firebase-uid-1')
    .setIssuer(options.issuer ?? `https://securetoken.google.com/${PROJECT_ID}`)
    .setAudience(options.audience ?? PROJECT_ID)
    .setIssuedAt(options.issuedAt ?? now - 10)
    .setExpirationTime(now + (options.expiresIn ?? 3600));

  return jwt.sign(options.key ?? privateKey);
}

beforeAll(async () => {
  const pair = await generateKeyPair('RS256', { extractable: true });
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  wrongKey = (await generateKeyPair('RS256', { extractable: true })).privateKey;

  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(JWKS_URL)) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error(`طلب شبكة غير متوقّع: ${url}`);
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('readBearerToken', () => {
  const withHeader = (value: string) =>
    new Request('https://x.test/api/me', { headers: { authorization: value } });

  it('يقرأ التوكن من ترويسة Bearer', () => {
    expect(readBearerToken(withHeader('Bearer abc.def.ghi'))).toBe('abc.def.ghi');
    expect(readBearerToken(withHeader('bearer abc'))).toBe('abc');
    expect(readBearerToken(withHeader('  Bearer   abc  '))).toBe('abc');
  });

  it('يُرجع null لأي صيغة أخرى', () => {
    expect(readBearerToken(withHeader('Basic abc'))).toBeNull();
    expect(readBearerToken(withHeader('abc'))).toBeNull();
    expect(readBearerToken(new Request('https://x.test/api/me'))).toBeNull();
  });
});

describe('verifyIdToken', () => {
  it('يقبل توكناً صحيحاً ويستخرج الهوية', async () => {
    const result = await verifyIdToken(await makeToken(), env);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity).toEqual({
        uid: 'firebase-uid-1',
        email: 'teacher@example.com',
        name: 'معلّم الاختبار',
        picture: 'https://example.com/a.png',
      });
    }
  });

  it('يرفض توكناً بلا توكن أصلاً', async () => {
    const result = await verifyIdToken(null, env);
    expect(result).toEqual({ ok: false, reason: 'missing' });
  });

  it('يرفض توقيعاً بمفتاح آخر', async () => {
    const result = await verifyIdToken(await makeToken({ key: wrongKey }), env);
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('يرفض issuer خاطئاً', async () => {
    const result = await verifyIdToken(
      await makeToken({ issuer: 'https://securetoken.google.com/another-project' }),
      env,
    );
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('يرفض audience خاطئاً', async () => {
    const result = await verifyIdToken(await makeToken({ audience: 'another-project' }), env);
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('يرفض توكناً منتهي الصلاحية', async () => {
    const result = await verifyIdToken(await makeToken({ expiresIn: -120 }), env);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('يرفض auth_time في المستقبل', async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const result = await verifyIdToken(await makeToken({ authTime: future }), env);
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('يرفض توكناً بلا sub', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ email: 'a@b.c' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(`https://securetoken.google.com/${PROJECT_ID}`)
      .setAudience(PROJECT_ID)
      .setIssuedAt(now - 10)
      .setExpirationTime(now + 600)
      .sign(privateKey);

    expect(await verifyIdToken(token, env)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('يرفض نصاً ليس توكناً', async () => {
    for (const bad of ['', 'abc', 'a.b', 'a.b.c.d']) {
      const result = await verifyIdToken(bad, env);
      expect(result.ok).toBe(false);
    }
  });

  it('يرفض التحقق إذا لم يُضبط معرّف المشروع', async () => {
    const result = await verifyIdToken(await makeToken(), { FIREBASE_PROJECT_ID: '' } as Env);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('يستنتج اسماً معقولاً عند غياب claim الاسم', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ email: 'omar@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject('uid-no-name')
      .setIssuer(`https://securetoken.google.com/${PROJECT_ID}`)
      .setAudience(PROJECT_ID)
      .setIssuedAt(now - 5)
      .setExpirationTime(now + 600)
      .sign(privateKey);

    const result = await verifyIdToken(token, env);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.identity.name).toBe('omar');
  });

  it('لا يقبل توكن الاختبار ما لم يكن وضع الاختبار مفعّلاً', async () => {
    const result = await verifyIdToken('test.eyJzdWIiOiJ4In0.abc', env);
    expect(result.ok).toBe(false);
  });
});
