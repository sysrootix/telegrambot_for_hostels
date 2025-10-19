import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const adminBodySchema = z.object({
  telegramId: z.string().min(1, 'telegramId is required'),
  displayName: z.string().min(1).optional(),
  notes: z.string().optional()
});
const updateAdminSchema = adminBodySchema.partial();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'asc' }
    });

    res.json(admins);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = adminBodySchema.parse(req.body);

    const existing = await prisma.admin.findUnique({
      where: { telegramId: data.telegramId }
    });

    if (existing) {
      return res.status(409).json({ error: 'Admin with this telegramId already exists' });
    }

    await prisma.user.upsert({
      where: { telegramId: data.telegramId },
      create: { telegramId: data.telegramId },
      update: {}
    });

    const admin = await prisma.admin.create({
      data
    });

    res.status(201).json(admin);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = updateAdminSchema.parse(req.body);

    if (data.telegramId) {
      const existing = await prisma.admin.findUnique({
        where: { telegramId: data.telegramId }
      });

      if (existing && existing.id !== id) {
        return res.status(409).json({ error: 'Admin with this telegramId already exists' });
      }

      await prisma.user.upsert({
        where: { telegramId: data.telegramId },
        create: { telegramId: data.telegramId },
        update: {}
      });
    }

    const admin = await prisma.admin.update({
      where: { id },
      data
    });

    res.json(admin);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.admin.delete({
      where: { id }
    });

    res.status(204).send();
  })
);

export default router;
