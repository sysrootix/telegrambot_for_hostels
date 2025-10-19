import { Router } from 'express';

import { requireAdmin, requireAuth, telegramAuth } from '../middleware/auth';
import adminRouter from './admins';
import profileRouter from './profile';
import usersRouter from './users';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use(telegramAuth);

router.get('/auth/session', requireAuth, (req, res) => {
  const { user, admin, telegramUser } = req.context!;

  res.json({
    user,
    isAdmin: Boolean(admin),
    telegramUser
  });
});

router.use('/profile', requireAuth, profileRouter);
router.use('/admins', requireAuth, requireAdmin, adminRouter);
router.use('/users', requireAuth, requireAdmin, usersRouter);

export default router;
