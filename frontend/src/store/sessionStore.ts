import { create } from 'zustand';

import type { SessionResponse } from '@/types/api';

interface SessionState {
  initData: string | null;
  session: SessionResponse | null;
  setInitData: (value: string | null) => void;
  setSession: (session: SessionResponse | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  initData: null,
  session: null,
  setInitData: (value) => set({ initData: value }),
  setSession: (session) => set({ session })
}));
