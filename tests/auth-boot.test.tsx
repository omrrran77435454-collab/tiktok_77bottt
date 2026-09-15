/**
 * اختبارات بقاء الجلسة وحالة الإقلاع.
 *
 * المشكلة التي تحرس منها: getAuth() يهيّئ سلسلة تخزين تنتهي بـ
 * browserSessionPersistence، فإذا تعذّرت IndexedDB و localStorage معاً
 * تهبط Firebase بصمت إلى تخزين الجلسة وتضيع الجلسة عند إغلاق التبويب.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { applyLocalPersistence } from '@/lib/auth-persistence';
import { SessionContext, type SessionState } from '@/lib/session-context';
import { RedirectIfAuthenticated, RequireAuth, RequireTools } from '@/app/guards';

/* -------------------------- بقاء جلسة Firebase -------------------------- */

const INDEXED_DB = { type: 'LOCAL', name: 'indexedDBLocalPersistence' } as const;
const LOCAL = { type: 'LOCAL', name: 'browserLocalPersistence' } as const;
const SESSION = { type: 'SESSION', name: 'browserSessionPersistence' } as const;

const auth = { name: 'auth' };

function deps(setPersistence: (auth: unknown, persistence: unknown) => Promise<void>) {
  return { setPersistence, indexedDB: INDEXED_DB, local: LOCAL };
}

describe('applyLocalPersistence', () => {
  it('يطلب IndexedDB أولاً لتبقى الجلسة بعد إغلاق المتصفّح', async () => {
    const setPersistence = vi.fn().mockResolvedValue(undefined);

    const outcome = await applyLocalPersistence(auth, deps(setPersistence));

    expect(outcome).toBe('indexeddb');
    expect(setPersistence).toHaveBeenCalledTimes(1);
    expect(setPersistence).toHaveBeenCalledWith(auth, INDEXED_DB);
  });

  it('ينتقل إلى localStorage عندما يفشل IndexedDB', async () => {
    const setPersistence = vi
      .fn()
      .mockRejectedValueOnce(new Error('idb unavailable'))
      .mockResolvedValueOnce(undefined);

    const outcome = await applyLocalPersistence(auth, deps(setPersistence));

    expect(outcome).toBe('local');
    expect(setPersistence).toHaveBeenCalledTimes(2);
    expect(setPersistence).toHaveBeenLastCalledWith(auth, LOCAL);
  });

  it('لا يستخدم تخزين الجلسة إطلاقاً — وإلا ضاعت الجلسة عند إغلاق التبويب', async () => {
    const setPersistence = vi.fn().mockRejectedValue(new Error('blocked'));

    await applyLocalPersistence(auth, { ...deps(setPersistence), onUnavailable: () => {} });

    const used = setPersistence.mock.calls.map((call) => call[1]);
    expect(used).not.toContainEqual(SESSION);
    for (const persistence of used) {
      expect((persistence as { type: string }).type).toBe('LOCAL');
    }
  });

  it('لا يكسر تسجيل الدخول عندما يمنع المتصفّح كل أنواع التخزين', async () => {
    const setPersistence = vi.fn().mockRejectedValue(new Error('storage blocked'));
    const onUnavailable = vi.fn();

    const outcome = await applyLocalPersistence(auth, {
      ...deps(setPersistence),
      onUnavailable,
    });

    expect(outcome).toBe('none');
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it('لا يطلب البديل عندما ينجح التخزين المفضّل', async () => {
    const setPersistence = vi.fn().mockResolvedValue(undefined);
    await applyLocalPersistence(auth, deps(setPersistence));
    expect(setPersistence).not.toHaveBeenCalledWith(auth, LOCAL);
  });
});

/* ---------------------------- حالة الإقلاع ---------------------------- */

function renderGuard(state: Partial<SessionState>, children: React.ReactNode, path = '/dashboard') {
  const value: SessionState = {
    status: 'loading',
    data: null,
    errorMessage: null,
    refresh: async () => {},
    setData: () => {},
    ...state,
  };
  // نلفّ الحارس بـ Routes حقيقية: بدونها يبقى <Navigate> مُركَّباً بعد
  // التحويل فيعيد التحويل بلا نهاية، وهو خطأ في الاختبار لا في الكود.
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionContext.Provider value={value}>
        <Routes>
          <Route path={path} element={children} />
          <Route path="*" element={<p>وجهة أخرى</p>} />
        </Routes>
      </SessionContext.Provider>
    </MemoryRouter>,
  );
}

const sessionData = (overrides: Record<string, unknown> = {}) =>
  ({
    user: { id: 'u1', name: 'معلم', email: 'a@b.c', image: null, role: 'user' },
    telegram: {
      linked: true,
      isMember: true,
      lastCheckedAt: null,
      telegramUsername: null,
      channelJoinUrl: '',
      botUsername: '',
    },
    canUseTools: true,
    preferences: null,
    profile: {
      role: 'teacher',
      stageId: null,
      gradeId: null,
      trackId: null,
      subjects: [],
      onboardingCompleted: true,
      completedAt: null,
    },
    ...overrides,
  }) as never;

describe('حالة الإقلاع (loading / authenticated / unauthenticated)', () => {
  it('يعرض شاشة الإقلاع ولا يعرض المحتوى أثناء الاستعادة', () => {
    renderGuard(
      { status: 'loading' },
      <RequireAuth>
        <p>المحتوى</p>
      </RequireAuth>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('أدوات المعلم')).toBeInTheDocument();
    expect(screen.queryByText('المحتوى')).not.toBeInTheDocument();
  });

  it('لا تظهر صفحة الهبوط أثناء الاستعادة حتى على المسار الجذر', () => {
    renderGuard(
      { status: 'loading' },
      <RedirectIfAuthenticated>
        <p>صفحة الهبوط</p>
      </RedirectIfAuthenticated>,
      '/',
    );

    expect(screen.queryByText('صفحة الهبوط')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('المستخدم العائد المسجَّل يبقى مسجَّلاً ويرى المحتوى', () => {
    renderGuard(
      { status: 'authenticated', data: sessionData() },
      <RequireAuth>
        <p>المحتوى</p>
      </RequireAuth>,
    );

    expect(screen.getByText('المحتوى')).toBeInTheDocument();
  });

  it('المستخدم المسجَّل لا يرى صفحة الهبوط بعد اكتمال الاستعادة', () => {
    renderGuard(
      { status: 'authenticated', data: sessionData() },
      <RedirectIfAuthenticated>
        <p>صفحة الهبوط</p>
      </RedirectIfAuthenticated>,
      '/',
    );

    expect(screen.queryByText('صفحة الهبوط')).not.toBeInTheDocument();
  });

  it('المستخدم غير المسجَّل لا يرى المحتوى المحمي', () => {
    renderGuard(
      { status: 'anonymous' },
      <RequireAuth>
        <p>المحتوى</p>
      </RequireAuth>,
    );

    expect(screen.queryByText('المحتوى')).not.toBeInTheDocument();
  });

  it('غير المسجَّل يرى صفحة الهبوط', () => {
    renderGuard(
      { status: 'anonymous' },
      <RedirectIfAuthenticated>
        <p>صفحة الهبوط</p>
      </RedirectIfAuthenticated>,
      '/',
    );

    expect(screen.getByText('صفحة الهبوط')).toBeInTheDocument();
  });

  it('لا تفتح الأدوات قبل اكتمال بوابة تيليجرام', () => {
    renderGuard(
      { status: 'authenticated', data: sessionData({ canUseTools: false }) },
      <RequireTools>
        <p>الأدوات</p>
      </RequireTools>,
    );

    expect(screen.queryByText('الأدوات')).not.toBeInTheDocument();
  });
});
