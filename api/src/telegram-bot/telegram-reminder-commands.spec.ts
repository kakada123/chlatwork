import { PersonalReminderService } from '../personal-assistant/reminder.service';
import { TelegramBotService } from './telegram-bot.service';

const REMINDER_ID = '00000000-0000-4000-8000-000000000123';

function setup(options: { linked?: boolean; disabled?: string[] } = {}) {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ updateId: 1n }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
    socialAccount: {
      findUnique: jest.fn().mockResolvedValue(
        options.linked === false
          ? null
          : {
              user: { id: 'owner', isActive: true },
            },
      ),
    },
    personalReminder: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation(({ data }) => ({ id: REMINDER_ID, ...data })),
      upsert: jest.fn().mockImplementation(({ create }) => ({ ...create })),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    telegramBotPendingExpense: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const bot = { sendMessage: jest.fn() };
  const ai = { parsePersonalAssistantIntent: jest.fn() };
  const availability = {
    isEnabled: jest
      .fn()
      .mockImplementation((key: string) => !options.disabled?.includes(key)),
    disabledKeys: jest.fn().mockResolvedValue(options.disabled ?? []),
  };
  const reminders = new PersonalReminderService(prisma as never);
  const service = new TelegramBotService(
    prisma as never,
    { getOrThrow: () => 'https://example.test' } as never,
    bot as never,
    {} as never,
    ai as never,
    undefined,
    availability as never,
  );
  Object.assign(service, { reminders });
  const send = (text: string, group = false) =>
    service.handleUpdate({
      update_id: 1,
      message: {
        message_id: 42,
        chat: {
          id: group ? -100 : 123,
          type: group ? 'supergroup' : 'private',
        },
        from: { id: 123 },
        text,
      },
    });
  return { prisma, bot, ai, service, send, availability, reminders };
}

describe('private Telegram reminder commands', () => {
  it('reuses a saved reminder when confirmation retries past its due time', async () => {
    const test = setup();
    let saved: unknown;
    test.prisma.personalReminder.upsert.mockImplementation(({ create }) => {
      saved = { ...create };
      return saved as never;
    });
    test.prisma.personalReminder.findUnique.mockImplementation(
      () => saved as never,
    );
    test.bot.sendMessage.mockRejectedValueOnce(
      new Error('Telegram unavailable') as never,
    );
    await expect(test.send('/remind today 17:01 | Water')).rejects.toThrow(
      'Telegram unavailable',
    );
    jest.setSystemTime(new Date('2026-10-23T10:02:00Z'));
    await test.send('/remind today 17:01 | Water');
    expect(test.prisma.personalReminder.upsert).toHaveBeenCalledTimes(1);
    expect(test.bot.sendMessage.mock.calls.at(-1)?.[1]).toContain(
      '5:01 PM (Cambodia, UTC+7)',
    );
    expect(test.bot.sendMessage.mock.calls.at(-1)?.[1]).toContain(
      'Reminder created!',
    );
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-23T10:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it.each(['/remind', '/remind@chlatwork_bot'])(
    'creates a deterministic reminder through %s without AI',
    async (command) => {
      const test = setup();
      await test.send(`${command} 5m | Drink water`);
      expect(test.prisma.personalReminder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: 'owner',
            message: 'Drink water',
            remindAt: new Date('2026-10-23T10:05:00Z'),
          }),
        }),
      );
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Reminder created!'),
      );
      expect(test.bot.sendMessage.mock.calls[0][1]).toContain(
        '5:05 PM (Cambodia, UTC+7)',
      );
      expect(test.bot.sendMessage.mock.calls[0][1]).toContain('/cancel ');
      expect(test.ai.parsePersonalAssistantIntent).not.toHaveBeenCalled();
    },
  );

  it.each(['/remind', '/remind 0m | Water', '/remind today 09:00 | Water'])(
    'explains invalid input without saving: %s',
    async (command) => {
      const test = setup();
      await test.send(command);
      expect(test.prisma.personalReminder.upsert).not.toHaveBeenCalled();
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('/remind <time>'),
      );
    },
  );

  it('lists only the linked owner pending reminders', async () => {
    const test = setup();
    test.prisma.personalReminder.findMany.mockResolvedValue([
      {
        id: REMINDER_ID,
        message: 'Pay rent',
        remindAt: new Date('2026-10-25T02:00:00Z'),
      },
    ] as never);
    await test.send('/reminders');
    expect(test.prisma.personalReminder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'owner', status: 'PENDING' },
        orderBy: { remindAt: 'asc' },
        take: 100,
      }),
    );
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining(REMINDER_ID),
    );
  });

  it('cancels only a pending reminder owned by the sender', async () => {
    const test = setup();
    await test.send(`/cancel ${REMINDER_ID}`);
    expect(test.prisma.personalReminder.updateMany).toHaveBeenCalledWith({
      where: { id: REMINDER_ID, userId: 'owner', status: 'PENDING' },
      data: { status: 'CANCELLED', lockedUntil: null },
    });
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Reminder cancelled'),
    );
    expect(
      test.prisma.telegramBotPendingExpense.findFirst,
    ).not.toHaveBeenCalled();
  });

  it('safely handles unavailable or foreign reminders', async () => {
    const test = setup();
    test.prisma.personalReminder.updateMany.mockResolvedValue({ count: 0 });
    await test.send(`/cancel ${REMINDER_ID}`);
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Pending reminder not found'),
    );
  });

  it.each(['/cancel 123', `/cancel ${REMINDER_ID} extra`, '/reminders extra'])(
    'returns usage for malformed arguments: %s',
    async (command) => {
      const test = setup();
      await test.send(command);
      expect(test.prisma.personalReminder.updateMany).not.toHaveBeenCalled();
      expect(test.prisma.personalReminder.findMany).not.toHaveBeenCalled();
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Use /'),
      );
    },
  );

  it('keeps bare /cancel in the expense flow', async () => {
    const test = setup();
    await test.send('/cancel');
    expect(test.prisma.telegramBotPendingExpense.findFirst).toHaveBeenCalled();
    expect(test.prisma.personalReminder.updateMany).not.toHaveBeenCalled();
  });

  it.each(['/remind 5m | Water', '/reminders', `/cancel ${REMINDER_ID}`])(
    'requires a linked account for %s',
    async (command) => {
      const test = setup({ linked: false });
      await test.send(command);
      expect(test.prisma.personalReminder.upsert).not.toHaveBeenCalled();
      expect(test.prisma.personalReminder.findMany).not.toHaveBeenCalled();
      expect(test.prisma.personalReminder.updateMany).not.toHaveBeenCalled();
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('sign in with this Telegram account'),
        expect.anything(),
      );
    },
  );

  it.each(['/remind 5m | Water', '/reminders', `/cancel ${REMINDER_ID}`])(
    'keeps personal reminders out of groups: %s',
    async (command) => {
      const test = setup();
      await test.send(command, true);
      expect(test.prisma.personalReminder.upsert).not.toHaveBeenCalled();
      expect(test.prisma.personalReminder.findMany).not.toHaveBeenCalled();
      expect(test.prisma.personalReminder.updateMany).not.toHaveBeenCalled();
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        -100,
        expect.stringContaining('private chat'),
      );
    },
  );

  it.each(['/remind 5m | Water', '/reminders', `/cancel ${REMINDER_ID}`])(
    'honors assistant availability for %s',
    async (command) => {
      const test = setup({ disabled: ['telegram:assistant'] });
      await test.send(command);
      expect(test.prisma.personalReminder.upsert).not.toHaveBeenCalled();
      expect(test.prisma.personalReminder.findMany).not.toHaveBeenCalled();
      expect(test.prisma.personalReminder.updateMany).not.toHaveBeenCalled();
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        123,
        'This feature is temporarily unavailable.',
      );
    },
  );

  it('keeps reminder cancellation available when expenses are disabled', async () => {
    const test = setup({ disabled: ['telegram:expenses'] });
    await test.send(`/cancel ${REMINDER_ID}`);
    expect(test.prisma.personalReminder.updateMany).toHaveBeenCalled();
  });

  it('filters reminder help separately from expense cancellation', async () => {
    const test = setup({ disabled: ['telegram:assistant'] });
    await test.send('/help');
    const text = test.bot.sendMessage.mock.calls[0][1];
    expect(text).not.toContain('/remind');
    expect(text).not.toContain('/cancel <reminder-id>');
    expect(text).toContain('/cancel — Cancel your latest pending expense');
  });

  it('includes reminder examples and cancellation in enabled help', async () => {
    const test = setup();
    await test.send('/help');
    const text = test.bot.sendMessage.mock.calls[0][1];
    expect(text).toContain('/remind 5m | Drink water');
    expect(text).toContain('/reminders');
    expect(text).toContain('/cancel <reminder-id>');
  });

  it('lets infrastructure failures follow the webhook retry path', async () => {
    const test = setup();
    test.prisma.personalReminder.upsert.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(test.send('/remind 5m | Water')).rejects.toThrow(
      'database unavailable',
    );
    expect(test.prisma.telegramBotUpdate.deleteMany).toHaveBeenCalled();
  });
});
