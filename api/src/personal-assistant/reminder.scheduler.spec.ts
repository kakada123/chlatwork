import { PersonalReminderStatus } from '@prisma/client';
import { PersonalReminderScheduler } from './reminder.scheduler';

describe('PersonalReminderScheduler', () => {
  function setup(
    claimed: Array<{ id: string; userId: string; message: string }>,
    sendFails = false,
  ) {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(claimed),
      socialAccount: {
        findFirst: jest.fn().mockResolvedValue({ providerUserId: '123' }),
      },
      personalReminder: {
        updateMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ attemptCount: 1 }),
      },
    };
    const bot = {
      sendMessage: sendFails
        ? jest.fn().mockRejectedValue(new Error('private provider failure'))
        : jest.fn().mockResolvedValue({ message_id: 1 }),
    };
    return {
      prisma,
      bot,
      scheduler: new PersonalReminderScheduler(prisma as never, bot as never),
    };
  }

  it('sends a claimed due reminder once and marks it sent', async () => {
    const test = setup([
      { id: 'reminder-1', userId: 'user-1', message: 'Buy power bank' },
    ]);
    test.prisma.$queryRaw
      .mockResolvedValueOnce([
        { id: 'reminder-1', userId: 'user-1', message: 'Buy power bank' },
      ])
      .mockResolvedValueOnce([]);
    await expect(
      test.scheduler.runOnce(new Date('2026-09-15T07:00:00Z')),
    ).resolves.toBe(1);
    await expect(
      test.scheduler.runOnce(new Date('2026-09-15T07:01:00Z')),
    ).resolves.toBe(0);
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(test.prisma.personalReminder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PersonalReminderStatus.SENT }),
      }),
    );
  });

  it('does not send when no due reminder is claimed', async () => {
    const test = setup([]);
    await expect(test.scheduler.runOnce()).resolves.toBe(0);
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
  });

  it('keeps failed delivery retryable and never marks it sent', async () => {
    const test = setup(
      [{ id: 'reminder-1', userId: 'user-1', message: 'Buy power bank' }],
      true,
    );
    await test.scheduler.runOnce(new Date('2026-09-15T07:00:00Z'));
    expect(test.prisma.personalReminder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PersonalReminderStatus.PENDING,
          failureReason: 'Telegram delivery failed',
        }),
      }),
    );
    expect(test.prisma.personalReminder.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PersonalReminderStatus.SENT }),
      }),
    );
  });
});
