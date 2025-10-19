import crypto from 'crypto';

import { TelegramWebAppUser } from '../types/telegram';

export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData) {
    return false;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    return false;
  }

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return hmac === hash;
}

export function parseTelegramUser(initData: string): TelegramWebAppUser | null {
  const params = new URLSearchParams(initData);
  const rawUser = params.get('user');

  if (!rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as TelegramWebAppUser;

    return parsed;
  } catch (error) {
    return null;
  }
}
