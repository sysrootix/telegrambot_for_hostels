import { useEffect } from 'react';

import { useSessionStore } from '@/store/sessionStore';

export function useInitData() {
  const initData = useSessionStore((state) => state.initData);
  const setInitData = useSessionStore((state) => state.setInitData);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    let value = tg?.initData ?? null;

    if (!value) {
      const params = new URLSearchParams(window.location.search);
      value = params.get('init_data');
    }

    if (value) {
      setInitData(value);
      tg?.expand?.();
      tg?.ready?.();
    }
  }, [setInitData]);

  return initData;
}
