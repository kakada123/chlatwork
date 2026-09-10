import { Logger } from '@nestjs/common';
import { TelegramMemberQrScheduler } from './telegram-member-qr.scheduler';

describe('TelegramMemberQrScheduler', () => {
  const now = new Date('2026-09-11T06:00:00Z');
  const message = { telegramChatId: -1001234567890n, messageId: 42 };

  beforeEach(() => jest.spyOn(Logger.prototype, 'warn').mockImplementation());
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function setup() {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      $queryRaw: jest.fn().mockResolvedValue([message]),
    };
    const bot = { deleteMessages: jest.fn().mockResolvedValue(true) };
    const scheduler = new TelegramMemberQrScheduler(
      prisma as never,
      bot as never,
    );
    return { prisma, bot, scheduler };
  }

  it('deletes due QR messages and then removes their tracking records', async () => {
    const { prisma, bot, scheduler } = setup();
    await expect(scheduler.runOnce(now)).resolves.toBe(1);
    expect(bot.deleteMessages).toHaveBeenCalledWith(-1001234567890, [42]);
    expect(prisma.$executeRaw.mock.calls[1].slice(1)).toEqual([
      message.telegramChatId,
      message.messageId,
    ]);
    expect(bot.deleteMessages.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.$executeRaw.mock.invocationCallOrder[1],
    );
    const [query, ...parameters] = prisma.$queryRaw.mock.calls[0];
    const sql = query.join('?');
    expect(sql).toContain('delete_after <= ? AND next_attempt_at <= ?');
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain("INTERVAL '5 minutes'");
    expect(parameters).toEqual([now, now, now, now]);
  });

  it('does not call Telegram when no messages are due', async () => {
    const { prisma, bot, scheduler } = setup();
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(scheduler.runOnce(now)).resolves.toBe(0);
    expect(bot.deleteMessages).not.toHaveBeenCalled();
  });

  it('retains failed deletions for retry and continues with other messages', async () => {
    const { prisma, bot, scheduler } = setup();
    prisma.$queryRaw.mockResolvedValue([
      message,
      { ...message, messageId: 43 },
    ]);
    bot.deleteMessages.mockRejectedValueOnce(new Error('temporary failure'));
    await expect(scheduler.runOnce(now)).resolves.toBe(1);
    expect(bot.deleteMessages).toHaveBeenCalledTimes(2);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    expect(prisma.$executeRaw.mock.calls[1].slice(1)).toEqual([
      message.telegramChatId,
      43,
    ]);
  });

  it('can retry deletion after database acknowledgement fails', async () => {
    const { prisma, bot, scheduler } = setup();
    prisma.$executeRaw
      .mockResolvedValueOnce(0)
      .mockRejectedValueOnce(new Error('db failure'));
    await expect(scheduler.runOnce(now)).resolves.toBe(0);
    // A new scheduler instance sees the durable row once the lease expires.
    const restarted = new TelegramMemberQrScheduler(
      prisma as never,
      bot as never,
    );
    await expect(
      restarted.runOnce(new Date(now.getTime() + 300_000)),
    ).resolves.toBe(1);
    expect(bot.deleteMessages).toHaveBeenCalledTimes(2);
  });

  it('skips overlapping runs and recovers after database failure', async () => {
    const { prisma, bot, scheduler } = setup();
    let rejectQuery!: (error: Error) => void;
    prisma.$queryRaw.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectQuery = reject;
        }),
    );
    const running = scheduler.runOnce(now);
    await Promise.resolve();
    await expect(scheduler.runOnce(now)).resolves.toBe(0);
    rejectQuery(new Error('db unavailable'));
    await expect(running).resolves.toBe(0);
    expect(bot.deleteMessages).not.toHaveBeenCalled();
    await expect(scheduler.runOnce(now)).resolves.toBe(1);
  });

  it('reports expired tracking records without claiming they were deleted on Telegram', async () => {
    const { prisma, bot, scheduler } = setup();
    prisma.$executeRaw.mockResolvedValueOnce(2);
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(scheduler.runOnce(now)).resolves.toBe(0);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      'Member QR cleanup missed the Telegram deletion window',
    );
    expect(bot.deleteMessages).not.toHaveBeenCalled();
  });

  it('checks on startup and every minute and stops on shutdown', async () => {
    jest.useFakeTimers();
    const { scheduler } = setup();
    const run = jest.spyOn(scheduler, 'runOnce').mockResolvedValue(0);
    scheduler.onModuleInit();
    expect(run).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
