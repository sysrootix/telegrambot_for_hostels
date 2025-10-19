import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { fetchSession } from '@/api/auth';
import { useSessionStore } from '@/store/sessionStore';
import type { SessionResponse } from '@/types/api';
import { useInitData } from '@/hooks/useInitData';

interface SessionContextValue {
  session: SessionResponse | null;
  isLoading: boolean;
  error: unknown;
  initData: string | null;
  refetch: () => void;
  blockedInfo: { title: string; reason: string | null } | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const initData = useInitData();
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const [blockedInfo, setBlockedInfo] = useState<{ title: string; reason: string | null } | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['session', initData],
    queryFn: fetchSession,
    enabled: Boolean(initData),
    staleTime: 1000 * 60 * 5
  });

  useEffect(() => {
    if (data) {
      setSession(data);
      setBlockedInfo(null);
    }
  }, [data, setSession]);

  useEffect(() => {
    if (isError) {
      setSession(null);
      const axiosError = error as AxiosError<{ error?: string; reason?: string; blocked?: boolean }>;
      if (axiosError?.response?.status === 403 && axiosError.response.data?.blocked) {
        setBlockedInfo({
          title: axiosError.response.data.error ?? 'Доступ запрещен',
          reason: axiosError.response.data.reason ?? null
        });
      } else {
        setBlockedInfo(null);
      }
    }
  }, [error, isError, setSession]);

  const value: SessionContextValue = {
    session,
    isLoading: Boolean(initData) ? isLoading : false,
    error: Boolean(initData) ? error : null,
    initData,
    refetch,
    blockedInfo
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);

  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return ctx;
}
