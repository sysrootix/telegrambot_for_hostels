import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma';
import { asyncHandler } from '../utils/asyncHandler';

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
  payoutDetails: z.string().max(2000).optional()
});
const updateUserSchema = userBodySchema.partial();

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
    const payoutDetails = sanitizeNullableString(data.payoutDetails);

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
        ...(payoutDetails !== undefined ? { payoutDetails } : {})
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
    const payoutDetails = sanitizeNullableString(data.payoutDetails);

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
        ...(payoutDetails !== undefined ? { payoutDetails } : {})
      }
    });

    res.json(user);
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
