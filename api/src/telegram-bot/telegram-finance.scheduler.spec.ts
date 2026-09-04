import { ExpenseCurrency } from '@prisma/client';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import { TelegramFinanceScheduler } from './telegram-finance.scheduler';

describe('TelegramFinanceScheduler', () => {
  const prisma = { $queryRaw: jest.fn() };
  const notifications = { sendToUser: jest.fn() };
  let scheduler: TelegramFinanceScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduler = new TelegramFinanceScheduler(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  it('sends each crossed budget threshold only after an atomic claim', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          userId: '00000000-0000-4000-8000-000000000001',
          currency: ExpenseCurrency.USD,
          budgetPeriod: 'MONTHLY',
          budgetInput: '100',
          periodStart: '2026-09-01',
          localDate: '2026-09-04',
          spent: '82',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { userId: '00000000-0000-4000-8000-000000000001' },
      ]);
    notifications.sendToUser.mockResolvedValue(true);

    await expect(
      scheduler.runOnce(new Date('2026-09-04T08:00:00.000Z')),
    ).resolves.toEqual({ budgetAlerts: 1, weeklyDigests: 0 });
    expect(notifications.sendToUser).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      expect.stringContaining('Budget alert: 82% used'),
    );
  });

  it('does nothing when no finance notifications are due', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(scheduler.runOnce()).resolves.toEqual({
      budgetAlerts: 0,
      weeklyDigests: 0,
    });
    expect(notifications.sendToUser).not.toHaveBeenCalled();
  });
});
