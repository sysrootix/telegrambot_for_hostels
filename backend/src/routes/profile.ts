import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const updateProfileSchema = z.object({
  payoutDetails: z
    .string()
    .max(2000, 'payoutDetails слишком длинные')
    .optional()
});

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

    if (payload.payoutDetails === undefined) {
      return res.status(400).json({ error: 'payoutDetails is required' });
    }

    const trimmed = payload.payoutDetails.trim();

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        payoutDetails: trimmed.length > 0 ? trimmed : null
      }
    });

    res.json(updated);
  })
);

export default router;
