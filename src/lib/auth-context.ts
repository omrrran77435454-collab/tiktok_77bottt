import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'unconfigured';

export interface AuthState {
  status: AuthStatus;
  /** المستخدم كما تعرفه Firebase (للعرض فقط — الخادم يعيد التحقّق دائماً). */
  firebaseUser: User | null;
  signInError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);
