import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAdmin, requireAuth } from '../middleware/auth';

const router = Router();

const amountSchema = z
  .coerce
  .number()
  .positive('Сумма должна быть больше 0')
  .refine((value) => {
    const scaled = value * 100;
    return Math.abs(scaled - Math.round(scaled)) < 1e-6;
  }, 'Сумма допускает максимум 2 знака после запятой');

const createCheckSchema = z.object({
  userId: z.string().min(1, 'userId обязателен'),
  amount: amountSchema,
  note: z
    .string()
    .max(500, 'Максимальная длина заметки 500 символов')
    .optional()
});

const updateCheckSchema = z
  .object({
    amount: amountSchema.optional(),
    note: z
      .string()
      .max(500, 'Максимальная длина заметки 500 символов')
      .optional()
  })
  .refine((data) => data.amount !== undefined || data.note !== undefined, {
    message: 'Не переданы данные для обновления'
  });

const listChecksQuerySchema = z.object({
  userId: z.string().optional(),
  period: z.enum(['day', 'week', 'month']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const summaryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const selfSummaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

interface DateRange {
  start?: Date;
  end?: Date;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function currentDayRange(reference: Date): Required<DateRange> {
  const start = startOfDay(reference);
  const end = endOfDay(reference);
  return { start, end };
}

function currentWeekRange(reference: Date): Required<DateRange> {
  const base = startOfDay(reference);
  const day = base.getDay() === 0 ? 7 : base.getDay();
  base.setDate(base.getDate() - (day - 1));
  const start = base;
  const end = endOfDay(new Date(start));
  end.setDate(start.getDate() + 6);

  return { start, end };
}

function currentMonthRange(reference: Date): Required<DateRange> {
  const start = startOfDay(new Date(reference.getFullYear(), reference.getMonth(), 1));
  const end = endOfDay(new Date(reference.getFullYear(), reference.getMonth() + 1, 0));

  return { start, end };
}

function parseDateInput(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function resolveRange({
  period,
  startDate,
  endDate
}: z.infer<typeof listChecksQuerySchema>): Required<DateRange> | DateRange {
  const reference = new Date();

  if (period === 'day') {
    return currentDayRange(reference);
  }

  if (period === 'week') {
    return currentWeekRange(reference);
  }

  if (period === 'month') {
    return currentMonthRange(reference);
  }

  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  if (start && !end) {
    return { start: startOfDay(start), end: endOfDay(start) };
  }

  if (!start && end) {
    return { start: startOfDay(end), end: endOfDay(end) };
  }

  if (start && end) {
    let rangeStart = startOfDay(start);
    let rangeEnd = endOfDay(end);

    if (rangeStart > rangeEnd) {
      [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
    }

    return { start: rangeStart, end: rangeEnd };
  }

  return {};
}

function toDecimal(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return new Prisma.Decimal(rounded.toFixed(2));
}

const FUND_RATE = 0.15;
const roundAmount = (value: number) => Math.round(value * 100) / 100;

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listChecksQuerySchema.parse(req.query);
    const { user, admin } = req.context!;
    const isAdmin = Boolean(admin);

    const range = resolveRange(query);

    let targetUserId: string;

    if (isAdmin) {
      if (query.userId && query.userId !== 'me') {
        targetUserId = query.userId;
      } else {
        targetUserId = user.id;
      }
    } else {
      if (query.userId && query.userId !== 'me' && query.userId !== user.id) {
        const target = await prisma.user.findUnique({
          where: { id: query.userId },
          select: { id: true, isPartner: true }
        });

        if (!target) {
          return res.status(404).json({ error: 'Пользователь не найден' });
        }

        if (target.isPartner) {
          return res.status(403).json({ error: 'Недостаточно прав' });
        }

        targetUserId = target.id;
      } else if (query.userId === 'me' || !query.userId) {
        targetUserId = user.id;
      } else {
        const target = await prisma.user.findUnique({
          where: { id: query.userId },
          select: { id: true, isPartner: true }
        });

        if (!target || target.isPartner) {
          return res.status(403).json({ error: 'Недостаточно прав' });
        }

        targetUserId = target.id;
      }
    }

    const where: Prisma.CheckWhereInput = {
      userId: targetUserId
    };

    if (range.start || range.end) {
      where.createdAt = {};

      if (range.start) {
        where.createdAt.gte = range.start;
      }

      if (range.end) {
        where.createdAt.lte = range.end;
      }
    }

    if (isAdmin) {
      const checks = await prisma.check.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(
        checks.map((check) => ({
          id: check.id,
          userId: check.userId,
          amount: check.amount.toNumber(),
          note: check.note,
          createdAt: check.createdAt,
          updatedAt: check.updatedAt,
          user: check.user
        }))
      );

      return;
    }

    const checks = await prisma.check.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(
      checks.map((check) => ({
        id: check.id,
        userId: check.userId,
        amount: check.amount.toNumber(),
        note: check.note,
        createdAt: check.createdAt,
        updatedAt: check.updatedAt
      }))
    );
  })
);

router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = createCheckSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const created = await prisma.check.create({
      data: {
        userId: payload.userId,
        amount: toDecimal(payload.amount),
        note: payload.note?.trim() || null
      }
    });

    res.status(201).json({
      id: created.id,
      userId: created.userId,
      amount: created.amount.toNumber(),
      note: created.note,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    });
  })
);

router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = updateCheckSchema.parse(req.body);

    const data: Prisma.CheckUpdateInput = {};

    if (payload.amount !== undefined) {
      data.amount = toDecimal(payload.amount);
    }

    if (payload.note !== undefined) {
      data.note = payload.note.trim().length > 0 ? payload.note.trim() : null;
    }

    const updated = await prisma.check.update({
      where: { id },
      data
    });

    res.json({
      id: updated.id,
      userId: updated.userId,
      amount: updated.amount.toNumber(),
      note: updated.note,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    });
  })
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.check.delete({
      where: { id }
    });

    res.status(204).send();
  })
);

router.get(
  '/summary/self',
  asyncHandler(async (req, res) => {
    const { user } = req.context!;
    const query = selfSummaryQuerySchema.parse(req.query);
    const reference = new Date();

    const useCustomRange = Boolean(query.startDate?.trim() || query.endDate?.trim());
    const baseRange = currentMonthRange(reference);

    const resolvedRange = resolveRange(
      useCustomRange
        ? {
            startDate: query.startDate,
            endDate: query.endDate
          }
        : {
            period: query.period ?? 'month',
            startDate: query.startDate,
            endDate: query.endDate
          }
    );

    const range: Required<DateRange> = {
      start: resolvedRange.start ?? baseRange.start,
      end: resolvedRange.end ?? baseRange.end
    };

    const [totalAggregate, userAggregate] = await Promise.all([
      prisma.check.aggregate({
        where: {
          createdAt: {
            gte: range.start,
            lte: range.end
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      }),
      prisma.check.aggregate({
        where: {
          userId: user.id,
          createdAt: {
            gte: range.start,
            lte: range.end
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      })
    ]);

    const totalAmount = totalAggregate._sum.amount ? totalAggregate._sum.amount.toNumber() : 0;
    const totalChecks = totalAggregate._count.id ?? 0;

    const ownAmount = userAggregate._sum.amount ? userAggregate._sum.amount.toNumber() : 0;
    const ownChecks = userAggregate._count.id ?? 0;

    let salary: number | null = null;
    let partnerFromOwn: number | null = null;
    let partnerFromOthers: number | null = null;

    if (typeof user.commissionPercent === 'number') {
      const baseRate = user.commissionPercent / 100;
      if (user.isPartner) {
        const othersAmount = Math.max(totalAmount - ownAmount, 0);
        partnerFromOwn = roundAmount(baseRate * FUND_RATE * ownAmount);
        partnerFromOthers = roundAmount(baseRate * FUND_RATE * othersAmount);
        salary = roundAmount((partnerFromOwn ?? 0) + (partnerFromOthers ?? 0));
      } else {
        salary = roundAmount(baseRate * FUND_RATE * totalAmount);
      }
    }

    res.json({
      generatedAt: reference,
      period: useCustomRange ? 'custom' : query.period ?? 'month',
      range: {
        start: range.start,
        end: range.end
      },
      stats: {
        amount: roundAmount(ownAmount),
        checks: ownChecks,
        salary,
        percent: user.commissionPercent ?? null,
        partnerFromOwn: user.isPartner ? partnerFromOwn : null,
        partnerFromOthers: user.isPartner ? partnerFromOthers : null,
        totalChecks
      }
    });
  })
);

router.get(
  '/summary',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const query = summaryQuerySchema.parse(req.query);
    const reference = new Date();

    const ranges = {
      day: currentDayRange(reference),
      week: currentWeekRange(reference),
      month: currentMonthRange(reference)
    };

    const customStart = parseDateInput(query.startDate);
    const customEnd = parseDateInput(query.endDate);

    let customRange: Required<DateRange> | undefined;

    if (customStart && customEnd) {
      let start = startOfDay(customStart);
      let end = endOfDay(customEnd);

      if (start > end) {
        [start, end] = [end, start];
      }

      customRange = { start, end };
    } else if (customStart && !customEnd) {
      customRange = { start: startOfDay(customStart), end: endOfDay(customStart) };
    } else if (!customStart && customEnd) {
      customRange = { start: startOfDay(customEnd), end: endOfDay(customEnd) };
    }

    const users = await prisma.user.findMany({
      orderBy: [
        { firstName: 'asc' },
        { username: 'asc' },
        { telegramId: 'asc' }
      ]
    });

    async function getStats(range: Required<DateRange>) {
      const groups = await prisma.check.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: range.start,
            lte: range.end
          }
        },
        _count: {
          id: true
        },
        _sum: {
          amount: true
        }
      });

      return groups.reduce<Record<string, { count: number; total: number }>>((acc, item) => {
        acc[item.userId] = {
          count: item._count.id,
          total: item._sum.amount ? item._sum.amount.toNumber() : 0
        };
        return acc;
      }, {});
    }

    const [dayStats, weekStats, monthStats, customStats] = await Promise.all([
      getStats(ranges.day),
      getStats(ranges.week),
      getStats(ranges.month),
      customRange ? getStats(customRange) : Promise.resolve<Record<string, { count: number; total: number }>>({})
    ]);

    const payload = users.map((user) => {
      const day = dayStats[user.id] ?? { count: 0, total: 0 };
      const week = weekStats[user.id] ?? { count: 0, total: 0 };
      const month = monthStats[user.id] ?? { count: 0, total: 0 };
      const custom = customRange ? customStats[user.id] ?? { count: 0, total: 0 } : undefined;

      return {
        user: {
          id: user.id,
          telegramId: user.telegramId,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          commissionPercent: user.commissionPercent,
          isPartner: user.isPartner
        },
        day,
        week,
        month,
        custom
      };
    });

    res.json({
      generatedAt: reference,
      ranges: {
        day: ranges.day,
        week: ranges.week,
        month: ranges.month,
        custom: customRange ?? null
      },
      users: payload
    });
  })
);

export default router;
