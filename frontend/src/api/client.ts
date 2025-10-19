import axios from 'axios';

import { useSessionStore } from '@/store/sessionStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  const initData = useSessionStore.getState().initData;

  if (initData) {
    config.headers = {
      ...config.headers,
      'X-Telegram-Init-Data': initData
    };
  }

  return config;
});

export default apiClient;
