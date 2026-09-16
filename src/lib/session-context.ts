import { createContext } from 'react';
import type { MeResponse } from '@shared/types';

export interface SessionState {
  status: 'loading' | 'authenticated' | 'anonymous' | 'error';
  data: MeResponse | null;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  setData: (data: MeResponse) => void;
}

export const SessionContext = createContext<SessionState | null>(null);
