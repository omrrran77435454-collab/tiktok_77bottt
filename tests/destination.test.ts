/**
 * قرار التوجيه بعد تسجيل الدخول.
 *
 * القرار يعتمد على تسجيل الدخول وإكمال التهيئة فقط. بوابة تيليجرام أُزيلت
 * تماماً، وهذه الاختبارات تحرس ألّا تعود: أي حالة تيليجرام — مربوط أو غير
 * مربوط، مشترك أو غير مشترك — تُعطي نفس الوجهة.
 */
import { describe, expect, it } from 'vitest';
import { destinationFor, isAllowedOn } from '@/lib/destination';
import type { MeResponse } from '@shared/types';

function session(
  overrides: {
    linked?: boolean;
    onboardingCompleted?: boolean;
    role?: 'teacher' | 'student';
    accessRole?: 'user' | 'admin';
  } = {},
): MeResponse {
  return {
    user: {
      id: 'u1',
      name: 'مستخدم',
      email: 'a@b.c',
      image: null,
      role: overrides.accessRole ?? 'user',
      emailVerified: true,
    },
    telegram: {
      linked: overrides.linked ?? false,
      telegramUsername: null,
      channelUrl: 'https://t.me/PromptsArabic',
      botUsername: 'bot',
    },
    preferences: null,
    profile: {
      role: overrides.role ?? 'teacher',
      stageId: null,
      gradeId: null,
      trackId: null,
      subjects: [],
      onboardingCompleted: overrides.onboardingCompleted ?? true,
      completedAt: null,
      assignments: [],
    },
  };
}

describe('destinationFor', () => {
  it('غير المسجّل ← صفحة الهبوط', () => {
    expect(destinationFor(null)).toBe('/');
    expect(destinationFor(undefined)).toBe('/');
  });

  it('مسجّل ولم يُكمل التهيئة ← /welcome', () => {
    expect(destinationFor(session({ onboardingCompleted: false }))).toBe('/welcome');
  });

  it('مسجّل وأكمل التهيئة ← /dashboard', () => {
    expect(destinationFor(session({ onboardingCompleted: true }))).toBe('/dashboard');
  });

  it('غير المربوط بتيليجرام يذهب إلى لوحته مثل المربوط تماماً', () => {
    expect(destinationFor(session({ linked: false }))).toBe('/dashboard');
    expect(destinationFor(session({ linked: true }))).toBe('/dashboard');
  });

  it('لا توجد وجهة /connect إطلاقاً في أي تركيبة', () => {
    const combinations = [true, false].flatMap((linked) =>
      [true, false].map((onboardingCompleted) => session({ linked, onboardingCompleted })),
    );
    for (const state of combinations) {
      expect(destinationFor(state)).not.toBe('/connect');
    }
  });

  it('الوجهة واحدة للمعلم والطالب — التفريق داخل اللوحة لا في التوجيه', () => {
    expect(destinationFor(session({ role: 'teacher' }))).toBe('/dashboard');
    expect(destinationFor(session({ role: 'student' }))).toBe('/dashboard');
  });

  it('صلاحية المدير لا تسلبه لوحته ولا تغيّر وجهته الافتراضية', () => {
    expect(destinationFor(session({ accessRole: 'admin' }))).toBe('/dashboard');
    expect(destinationFor(session({ accessRole: 'admin', onboardingCompleted: false }))).toBe(
      '/welcome',
    );
  });

  it('بعد إكمال التهيئة لا تبقى /welcome وجهةً صحيحة', () => {
    const ready = session({ onboardingCompleted: true });
    expect(isAllowedOn(ready, '/welcome')).toBe(false);
    expect(isAllowedOn(ready, '/dashboard')).toBe(true);
  });
});

describe('صلابة القرار', () => {
  it('لا ينهار على جلسة بلا ملف — يُعامَل كتهيئة غير مكتملة', () => {
    expect(destinationFor({} as MeResponse)).toBe('/welcome');
  });

  it('لا ينهار على جلسة بلا حالة تيليجرام', () => {
    const noTelegram = { profile: { onboardingCompleted: true } } as MeResponse;
    expect(destinationFor(noTelegram)).toBe('/dashboard');
  });
});
