import type { NextFunction, Request, Response } from 'express';

import { prisma } from '../prisma';
import { env } from '../env';
import { parseTelegramUser, verifyTelegramInitData } from '../utils/telegram';

const TELEGRAM_INIT_DATA_HEADER = 'x-telegram-init-data';

export async function telegramAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const initData = req.header(TELEGRAM_INIT_DATA_HEADER);

    if (!initData) {
      return res.status(401).json({ error: 'Missing Telegram init data' });
    }

    const isValid = verifyTelegramInitData(initData, env.BOT_TOKEN);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Telegram init data' });
    }

    const telegramUser = parseTelegramUser(initData);

    if (!telegramUser) {
      return res.status(401).json({ error: 'Invalid Telegram user payload' });
    }

    const telegramId = telegramUser.id.toString();

    const userRecord = await prisma.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
        lastName: telegramUser.last_name ?? null,
        languageCode: telegramUser.language_code ?? null,
        photoUrl: telegramUser.photo_url ?? null
      },
      update: {
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
        lastName: telegramUser.last_name ?? null,
        languageCode: telegramUser.language_code ?? null,
        photoUrl: telegramUser.photo_url ?? null
      }
    });

    const adminRecord = await prisma.admin.findUnique({
      where: { telegramId }
    });

    req.context = {
      telegramUser,
      user: userRecord,
      admin: adminRecord
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.context) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.context?.admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
