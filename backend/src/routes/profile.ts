import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional()
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

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        username: payload.username ?? null,
        phone: payload.phone ?? null,
        bio: payload.bio ?? null
      }
    });

    res.json(updated);
  })
);

export default router;
