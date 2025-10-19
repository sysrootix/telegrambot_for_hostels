import type { Admin, User } from '@prisma/client';
import type { TelegramWebAppUser } from './telegram';

declare global {
  namespace Express {
    interface Request {
      context?: {
        telegramUser: TelegramWebAppUser;
        user: User;
        admin: Admin | null;
      };
    }
  }
}

export {};
