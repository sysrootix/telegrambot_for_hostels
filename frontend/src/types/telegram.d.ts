interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: Record<string, unknown>;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  colorScheme?: 'light' | 'dark';
}

interface TelegramNamespace {
  WebApp?: TelegramWebApp;
}

interface Window {
  Telegram?: TelegramNamespace;
}
