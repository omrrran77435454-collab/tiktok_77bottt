import { useContext } from 'react';
import { AuthContext, type AuthState } from './auth-context';

/** يقرأ حالة تسجيل الدخول. يجب أن يكون داخل AuthProvider. */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth يجب أن يُستخدم داخل AuthProvider.');
  return context;
}
