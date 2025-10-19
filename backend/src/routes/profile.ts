import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const payoutFieldSchema = z
  .string()
  .max(255, 'Слишком длинное значение реквизитов')
  .optional();

const updateProfileSchema = z
  .object({
    payoutUsdtTrc20: payoutFieldSchema,
    payoutUsdtBep20: payoutFieldSchema
  })
  .refine(
    (data) => data.payoutUsdtTrc20 !== undefined || data.payoutUsdtBep20 !== undefined,
    'Не передано ни одного поля для обновления'
  );

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const { user, admin } = req.context!;

    res.json({
      user,
      isAdmin: Boolean(admin)
    });
  })
);

router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const { user } = req.context!;
    const payload = updateProfileSchema.parse(req.body);

    const data: Record<string, string | null> = {};

    if (payload.payoutUsdtTrc20 !== undefined) {
      const trimmed = payload.payoutUsdtTrc20.trim();
      data.payoutUsdtTrc20 = trimmed.length > 0 ? trimmed : null;
    }

    if (payload.payoutUsdtBep20 !== undefined) {
      const trimmed = payload.payoutUsdtBep20.trim();
      data.payoutUsdtBep20 = trimmed.length > 0 ? trimmed : null;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data
    });

    res.json(updated);
  })
);

export default router;
