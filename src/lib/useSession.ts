import { useContext } from 'react';
import { SessionContext, type SessionState } from './session-context';

/** يقرأ حالة الجلسة الحالية. يجب أن يكون داخل SessionProvider. */
export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession يجب أن يُستخدم داخل SessionProvider.');
  }
  return context;
}
