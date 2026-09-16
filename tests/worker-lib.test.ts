// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isActiveMember, parseStartCommand } from '../worker/lib/telegram';
import { base64UrlEncode, generateSecureToken, sha256Hex, timingSafeEqual } from '../worker/lib/crypto';
import { missingEnvVars, isTestMode } from '../worker/env';
import type { Env } from '../worker/env';

describe('isActiveMember', () => {
  it('يعتبر creator و administrator و member أعضاءً', () => {
    expect(isActiveMember({ status: 'creator' })).toBe(true);
    expect(isActiveMember({ status: 'administrator' })).toBe(true);
    expect(isActiveMember({ status: 'member' })).toBe(true);
  });

  it('يرفض left و kicked', () => {
    expect(isActiveMember({ status: 'left' })).toBe(false);
    expect(isActiveMember({ status: 'kicked' })).toBe(false);
  });

  it('يعتمد على is_member في حالة restricted', () => {
    expect(isActiveMember({ status: 'restricted', is_member: true })).toBe(true);
    expect(isActiveMember({ status: 'restricted', is_member: false })).toBe(false);
    expect(isActiveMember({ status: 'restricted' })).toBe(false);
  });

  it('يرفض القيم الفارغة أو غير المتوقّعة', () => {
    expect(isActiveMember(null)).toBe(false);
    expect(isActiveMember(undefined)).toBe(false);
    expect(isActiveMember({ status: 'anything-else' })).toBe(false);
    expect(isActiveMember({} as { status: string })).toBe(false);
  });
});

describe('parseStartCommand', () => {
  it('يستخرج التوكن من /start', () => {
    expect(parseStartCommand('/start ABC123')).toBe('ABC123');
    expect(parseStartCommand('  /start ABC123  ')).toBe('ABC123');
    expect(parseStartCommand('/start@my_bot ABC123')).toBe('ABC123');
  });

  it('يُرجع null لـ /start بلا توكن', () => {
    expect(parseStartCommand('/start')).toBeNull();
    expect(parseStartCommand('/start@my_bot')).toBeNull();
  });

  it('يتجاهل الرسائل الأخرى', () => {
    expect(parseStartCommand('مرحباً')).toBeNull();
    expect(parseStartCommand('/help ABC')).toBeNull();
    expect(parseStartCommand('/startx ABC')).toBeNull();
    expect(parseStartCommand(undefined)).toBeNull();
    expect(parseStartCommand(null)).toBeNull();
  });
});

describe('crypto helpers', () => {
  it('يولّد توكنات فريدة وبطول مناسب', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateSecureToken(32)));
    expect(tokens.size).toBe(200);
    for (const token of tokens) {
      expect(token.length).toBeGreaterThanOrEqual(42);
      // base64url فقط — صالح داخل الروابط بلا ترميز.
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('sha256Hex ثابت وبطول 64', async () => {
    const hash = await sha256Hex('teacher-tools');
    expect(hash).toHaveLength(64);
    expect(hash).toBe(await sha256Hex('teacher-tools'));
    expect(hash).not.toBe(await sha256Hex('teacher-tools '));
  });

  it('base64UrlEncode لا ينتج رموزاً تحتاج ترميزاً', () => {
    const encoded = base64UrlEncode(new Uint8Array([251, 255, 190, 0, 1, 2]));
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('timingSafeEqual يقارن بشكل صحيح', () => {
    expect(timingSafeEqual('secret', 'secret')).toBe(true);
    expect(timingSafeEqual('secret', 'secreT')).toBe(false);
    expect(timingSafeEqual('secret', 'secret-longer')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
    expect(timingSafeEqual('', 'x')).toBe(false);
  });
});

describe('env helpers', () => {
  const base = {
    FIREBASE_PROJECT_ID: 'teacher-tools',
    TELEGRAM_BOT_TOKEN: 'd',
    TELEGRAM_BOT_USERNAME: 'e',
    TELEGRAM_CHANNEL_ID: 'f',
    TELEGRAM_CHANNEL_JOIN_URL: 'g',
    TELEGRAM_WEBHOOK_SECRET: 'h',
    ADMIN_TELEGRAM_ID: '1',
    ADMIN_EMAIL: 'owner@example.com',
  } as unknown as Env;

  it('لا ينقص شيء عند اكتمال الإعداد', () => {
    expect(missingEnvVars(base)).toEqual([]);
  });

  it('يكشف القيم الفارغة أو قوالب Placeholder', () => {
    const broken = {
      ...base,
      FIREBASE_PROJECT_ID: '',
      TELEGRAM_BOT_TOKEN: '[ضع التوكن هنا]',
      ADMIN_EMAIL: '',
    } as Env;
    expect(missingEnvVars(broken)).toEqual([
      'FIREBASE_PROJECT_ID',
      'TELEGRAM_BOT_TOKEN',
      'ADMIN_EMAIL',
    ]);
  });

  it('وضع الاختبار يتطلّب العلم والسرّ معاً', () => {
    expect(isTestMode(base)).toBe(false);
    expect(isTestMode({ ...base, E2E_TEST_MODE: 'true' } as Env)).toBe(false);
    expect(isTestMode({ ...base, E2E_TEST_MODE: 'true', E2E_TEST_SECRET: 's' } as Env)).toBe(true);
    expect(isTestMode({ ...base, E2E_TEST_MODE: 'false', E2E_TEST_SECRET: 's' } as Env)).toBe(false);
  });
});
