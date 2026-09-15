/**
 * قرار التوجيه بعد اجتياز بوابة تيليجرام.
 *
 * كان موزّعاً على الحرّاس وصفحة البوابة واللوحة، فاختلفت الفروع وظهر ارتداد
 * إلى البوابة بعد نجاحها. الآن دالة واحدة، وهذه الاختبارات تثبّت قواعدها.
 */
import { describe, expect, it } from 'vitest';
import { destinationFor, isAllowedOn } from '@/lib/destination';
import type { MeResponse } from '@shared/types';

function session(overrides: {
  canUseTools?: boolean;
  onboardingCompleted?: boolean;
  role?: 'teacher' | 'student';
}): MeResponse {
  return {
    user: { id: 'u1', name: 'مستخدم', email: 'a@b.c', image: null, role: 'user' },
    telegram: {
      linked: true,
      isMember: overrides.canUseTools ?? true,
      lastCheckedAt: null,
      telegramUsername: null,
      channelJoinUrl: 'https://t.me/PromptsArabic',
      botUsername: 'bot',
    },
    canUseTools: overrides.canUseTools ?? true,
    preferences: null,
    profile: {
      role: overrides.role ?? 'teacher',
      stageId: null,
      gradeId: null,
      trackId: null,
      subjects: [],
      onboardingCompleted: overrides.onboardingCompleted ?? true,
      completedAt: null,
    },
  };
}

describe('destinationFor', () => {
  it('غير المسجّل ← صفحة الهبوط', () => {
    expect(destinationFor(null)).toBe('/');
    expect(destinationFor(undefined)).toBe('/');
  });

  it('لم يجتز بوابة تيليجرام ← /connect', () => {
    expect(destinationFor(session({ canUseTools: false }))).toBe('/connect');
  });

  it('اجتاز البوابة ولم يُكمل التهيئة ← /welcome', () => {
    expect(destinationFor(session({ canUseTools: true, onboardingCompleted: false }))).toBe(
      '/welcome',
    );
  });

  it('اجتاز البوابة وأكمل التهيئة ← /dashboard', () => {
    expect(destinationFor(session({ canUseTools: true, onboardingCompleted: true }))).toBe(
      '/dashboard',
    );
  });

  it('الوجهة واحدة للمعلم والطالب — التفريق داخل اللوحة لا في التوجيه', () => {
    expect(destinationFor(session({ role: 'teacher' }))).toBe('/dashboard');
    expect(destinationFor(session({ role: 'student' }))).toBe('/dashboard');
  });

  it('بوابة تيليجرام لها الأولوية على التهيئة', () => {
    // غير مشترك ولم يُهيّأ: البوابة أولاً لا التهيئة.
    expect(destinationFor(session({ canUseTools: false, onboardingCompleted: false }))).toBe(
      '/connect',
    );
  });

  it('بعد نجاح الاشتراك لا تبقى /connect وجهةً صحيحة', () => {
    const verified = session({ canUseTools: true, onboardingCompleted: false });
    expect(isAllowedOn(verified, '/connect')).toBe(false);
    expect(isAllowedOn(verified, '/welcome')).toBe(true);
  });

  it('بعد إكمال التهيئة لا تبقى /welcome وجهةً صحيحة', () => {
    const ready = session({ canUseTools: true, onboardingCompleted: true });
    expect(isAllowedOn(ready, '/welcome')).toBe(false);
    expect(isAllowedOn(ready, '/dashboard')).toBe(true);
  });
});

describe('صلابة القرار', () => {
  it('لا ينهار على جلسة بلا ملف — يُعامَل كتهيئة غير مكتملة', () => {
    const partial = { canUseTools: true } as MeResponse;
    expect(destinationFor(partial)).toBe('/welcome');
  });

  it('لا ينهار على جلسة بلا canUseTools', () => {
    expect(destinationFor({} as MeResponse)).toBe('/connect');
  });
});
