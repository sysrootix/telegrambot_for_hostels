import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { getBot } from '../bot';
import { env } from '../env';

const router = Router();

const sanitizeNullableString = (value?: string) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const userBodySchema = z.object({
  telegramId: z.string().min(1, 'telegramId is required'),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  languageCode: z.string().optional(),
  photoUrl: z.string().url().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  payoutUsdtTrc20: z.string().max(255).optional(),
  payoutUsdtBep20: z.string().max(255).optional(),
  chatId: z.string().optional()
});
const updateUserSchema = userBodySchema.partial();

const muteSchema = z
  .object({
    chatId: z.string().optional(),
    durationMinutes: z.number().int().positive().max(60 * 24 * 30).optional(),
    until: z.string().optional()
  })
  .refine(
    (data) => typeof data.durationMinutes === 'number' || (data.until?.trim()?.length ?? 0) > 0,
    'Укажите длительность блокировки или конечную дату'
  );

const unmuteSchema = z.object({
  chatId: z.string().optional()
});

const blockSchema = z.object({
  chatId: z.string().optional(),
  reason: z.string().max(200).optional()
});

const unblockSchema = z.object({
  chatId: z.string().optional()
});

const MAX_CHAT_ACTION_ATTEMPTS = 3;

function parseDateInput(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

async function withTelegramAction<T>(action: () => Promise<T>) {
  for (let attempt = 1; attempt <= MAX_CHAT_ACTION_ATTEMPTS; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt === MAX_CHAT_ACTION_ATTEMPTS) {
        console.error('Telegram API action failed', error);
        throw error;
      }
    }
  }
}

function resolveChatId(payloadChatId: string | undefined, userChatId: string | null) {
  return payloadChatId?.trim() || userChatId || null;
}

async function muteInChat({
  chatId,
  telegramId,
  until
}: {
  chatId: string;
  telegramId: string;
  until: Date;
}) {
  const bot = getBot();
  const userId = Number(telegramId);

  if (Number.isNaN(userId)) {
    throw new Error('Invalid telegramId for mute');
  }

  const untilDate = Math.floor(until.getTime() / 1000);

  await withTelegramAction(() =>
    bot.restrictChatMember(chatId, userId, {
      permissions: {
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false
      },
      until_date: untilDate
    })
  );
}

async function unmuteInChat(chatId: string, telegramId: string) {
  const bot = getBot();
  const userId = Number(telegramId);

  if (Number.isNaN(userId)) {
    throw new Error('Invalid telegramId for unmute');
  }

  await withTelegramAction(() =>
    bot.restrictChatMember(chatId, userId, {
      permissions: {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true
      }
    })
  );
}

async function blockInChat(chatId: string, telegramId: string) {
  const bot = getBot();
  const userId = Number(telegramId);

  if (Number.isNaN(userId)) {
    throw new Error('Invalid telegramId for block');
  }

  await withTelegramAction(() =>
    bot.banChatMember(chatId, userId, {
      revoke_messages: true
    })
  );
}

async function unblockInChat(chatId: string, telegramId: string) {
  const bot = getBot();
  const userId = Number(telegramId);

  if (Number.isNaN(userId)) {
    throw new Error('Invalid telegramId for unblock');
  }

  await withTelegramAction(() =>
    bot.unbanChatMember(chatId, userId, {
      only_if_banned: true
    })
  );
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = userBodySchema.parse(req.body);
    const sanitizedTelegramId = data.telegramId.trim();

    const existing = await prisma.user.findUnique({
      where: { telegramId: sanitizedTelegramId }
    });

    if (existing) {
      return res.status(409).json({ error: 'User with this telegramId already exists' });
    }

    const username = sanitizeNullableString(data.username);
    const firstName = sanitizeNullableString(data.firstName);
    const lastName = sanitizeNullableString(data.lastName);
    const languageCode = sanitizeNullableString(data.languageCode);
    const photoUrl = sanitizeNullableString(data.photoUrl);
    const phone = sanitizeNullableString(data.phone);
  const bio = sanitizeNullableString(data.bio);
    const payoutUsdtTrc20 = sanitizeNullableString(data.payoutUsdtTrc20);
    const payoutUsdtBep20 = sanitizeNullableString(data.payoutUsdtBep20);
    const chatId = sanitizeNullableString(data.chatId);
    const resolvedChatId = (chatId ?? env.DEFAULT_CHAT_ID)?.trim();

    const user = await prisma.user.create({
      data: {
        telegramId: sanitizedTelegramId,
        ...(username !== undefined ? { username } : {}),
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(languageCode !== undefined ? { languageCode } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(payoutUsdtTrc20 !== undefined ? { payoutUsdtTrc20 } : {}),
        ...(payoutUsdtBep20 !== undefined ? { payoutUsdtBep20 } : {}),
        ...(resolvedChatId ? { chatId: resolvedChatId } : {})
      }
    });

    res.status(201).json(user);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    if (data.telegramId) {
      const trimmedTelegramId = data.telegramId.trim();
      const existing = await prisma.user.findUnique({
        where: { telegramId: trimmedTelegramId }
      });

      if (existing && existing.id !== id) {
        return res.status(409).json({ error: 'User with this telegramId already exists' });
      }

      data.telegramId = trimmedTelegramId;
    }

    const username = sanitizeNullableString(data.username);
    const firstName = sanitizeNullableString(data.firstName);
    const lastName = sanitizeNullableString(data.lastName);
    const languageCode = sanitizeNullableString(data.languageCode);
  const photoUrl = sanitizeNullableString(data.photoUrl);
  const phone = sanitizeNullableString(data.phone);
  const bio = sanitizeNullableString(data.bio);
    let payoutUsdtTrc20 = sanitizeNullableString(data.payoutUsdtTrc20);
    let payoutUsdtBep20 = sanitizeNullableString(data.payoutUsdtBep20);
    let chatId = sanitizeNullableString(data.chatId);
    if (chatId === null) {
      chatId = env.DEFAULT_CHAT_ID;
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.telegramId ? { telegramId: data.telegramId } : {}),
        ...(username !== undefined ? { username } : {}),
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(languageCode !== undefined ? { languageCode } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(payoutUsdtTrc20 !== undefined ? { payoutUsdtTrc20 } : {}),
        ...(payoutUsdtBep20 !== undefined ? { payoutUsdtBep20 } : {}),
        ...(chatId !== undefined ? { chatId: chatId ?? env.DEFAULT_CHAT_ID } : {})
      }
    });

    res.json(user);
  })
);

router.post(
  '/:id/mute',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = muteSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const chatId = resolveChatId(payload.chatId, user.chatId);

    if (!chatId) {
      return res.status(400).json({ error: 'Не указан chatId' });
    }

    const now = new Date();
    const until = payload.durationMinutes
      ? new Date(now.getTime() + payload.durationMinutes * 60 * 1000)
      : parseDateInput(payload.until);

    if (!until) {
      return res.status(400).json({ error: 'Некорректная дата завершения блокировки' });
    }

    try {
      await muteInChat({
        chatId,
        telegramId: user.telegramId,
        until
      });
    } catch (error) {
      return res.status(502).json({ error: 'Не удалось применить ограничения в чате' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        mutedUntil: until,
        chatId
      }
    });

    res.json(updated);
  })
);

router.post(
  '/:id/unmute',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = unmuteSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const chatId = resolveChatId(payload.chatId, user.chatId);

    if (!chatId) {
      return res.status(400).json({ error: 'Не указан chatId' });
    }

    try {
      await unmuteInChat(chatId, user.telegramId);
    } catch (error) {
      return res.status(502).json({ error: 'Не удалось снять ограничения в чате' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        mutedUntil: null,
        chatId
      }
    });

    res.json(updated);
  })
);

router.post(
  '/:id/block',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = blockSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const chatId = resolveChatId(payload.chatId, user.chatId);

    if (chatId) {
      try {
        await blockInChat(chatId, user.telegramId);
      } catch (error) {
        return res.status(502).json({ error: 'Не удалось заблокировать пользователя в чате' });
      }
    }

    const reason = payload.reason?.trim() ?? null;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isBlocked: true,
        blockReason: reason,
        chatId: chatId ?? user.chatId,
        mutedUntil: null
      }
    });

    res.json(updated);
  })
);

router.post(
  '/:id/unblock',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = unblockSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const chatId = resolveChatId(payload.chatId, user.chatId);

    if (chatId) {
      try {
        await unblockInChat(chatId, user.telegramId);
      } catch (error) {
        return res.status(502).json({ error: 'Не удалось снять блокировку в чате' });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isBlocked: false,
        blockReason: null,
        chatId: chatId ?? user.chatId
      }
    });

    res.json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id }
    });

    res.status(204).send();
  })
);

export default router;
