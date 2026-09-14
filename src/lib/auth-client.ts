import { createAuthClient } from 'better-auth/react';

/**
 * عميل Better Auth.
 * لا يحتوي أي سرّ — كل ما يفعله هو استدعاء مسارات ‎/api/auth/*‎ على نفس الأصل.
 * عملية OAuth كاملة (بما فيها قيمة state) تُدار في الخادم.
 */
export const authClient = createAuthClient({
  baseURL: typeof window === 'undefined' ? undefined : window.location.origin,
  basePath: '/api/auth',
});

export async function signInWithGoogle(callbackURL = '/dashboard'): Promise<void> {
  await authClient.signIn.social({
    provider: 'google',
    callbackURL,
    errorCallbackURL: '/?error=google',
  });
}

export async function signOut(): Promise<void> {
  await authClient.signOut();
  window.location.assign('/');
}
