import { AiFeature, Prisma } from '@prisma/client';
import { CreatorAiException } from '../creator-ai/creator-ai.errors';
import {
  CreatorTelegramWorker,
  splitCreatorTelegramText,
} from './creator-telegram.worker';

function setup(overrides: Record<string, unknown> = {}) {
  const job: any = {
    updateId: 42n,
    userId: 'owner',
    chatId: 123n,
    feature: AiFeature.KHMER_REWRITE,
    content: 'original content',
    replyParts: null,
    sentParts: 0,
    statusMessageId: 55,
    leaseId: null,
    lockedUntil: null,
    nextAttemptAt: new Date(0),
    processedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
  const available = () =>
    !job.processedAt &&
    job.nextAttemptAt <= new Date() &&
    (!job.lockedUntil || job.lockedUntil <= new Date());
  const prisma = {
    socialAccount: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ user: { id: 'owner', isActive: true } }),
    },
    creatorTelegramRequest: {
      findMany: jest.fn(async () => (available() ? [{ ...job }] : [])),
      updateMany: jest.fn(async ({ where, data }) => {
        if ('leaseId' in where && where.leaseId !== job.leaseId)
          return { count: 0 };
        if (where.OR && !available()) return { count: 0 };
        Object.assign(job, data);
        if (job.replyParts === Prisma.DbNull) job.replyParts = null;
        return { count: 1 };
      }),
      deleteMany: jest.fn(),
    },
    creatorTelegramChat: {
      deleteMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };
  const config = { get: jest.fn(() => undefined) };
  const generations = {
    generate: jest.fn().mockResolvedValue({
      data: {
        title: 'Rewritten Khmer',
        sections: [{ label: 'Result', content: 'អត្ថបទថ្មី' }],
      },
      usage: { creditsCharged: 1, creditsRemaining: 19 },
    }),
  };
  const bot = {
    sendMessage: jest.fn(),
    sendCopyableMessage: jest.fn(),
    sendChatAction: jest.fn(),
    sendStatus: jest.fn().mockResolvedValue(56),
    updateStatus: jest.fn(),
    clearStatus: jest.fn(),
  };
  const worker = new CreatorTelegramWorker(
    prisma as never,
    config as never,
    generations as never,
    bot as never,
    { keyboard: () => ({ inline_keyboard: [] }) } as never,
  );
  return { worker, job, prisma, generations, bot, config };
}

describe('Creator Telegram worker', () => {
  it('uses existing generation protections and clears queued content after delivery', async () => {
    const test = setup();
    await test.worker.tick();
    expect(test.generations.generate).toHaveBeenCalledWith(
      'owner',
      {
        feature: AiFeature.KHMER_REWRITE,
        payload: {
          content: 'original content',
          language: 'KHMER',
          tone: 'NATURAL_KHMER',
        },
        inputSummary: 'Telegram Khmer AI',
      },
      'creator-telegram:42',
    );
    expect(test.bot.sendCopyableMessage).toHaveBeenCalledTimes(1);
    expect(test.bot.sendCopyableMessage).toHaveBeenCalledWith(
      123,
      'អត្ថបទថ្មី',
    );
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      123,
      'Credits used: 1 · Balance: 19',
      { inline_keyboard: [] },
    );
    expect(test.job).toMatchObject({
      content: null,
      replyParts: null,
      processedAt: expect.any(Date),
      leaseId: null,
      statusMessageId: null,
    });
    expect(test.bot.clearStatus).toHaveBeenCalledWith(
      123,
      55,
      expect.stringContaining('finished'),
    );
    await test.worker.tick();
    expect(test.generations.generate).toHaveBeenCalledTimes(1);
  });

  it('resumes delivery from the last successful part without generating or charging again', async () => {
    const test = setup();
    test.generations.generate.mockResolvedValue({
      data: {
        title: 'Khmer',
        sections: [{ label: 'Result', content: 'ក'.repeat(6000) }],
      },
      usage: { creditsCharged: 1, creditsRemaining: 19 },
    });
    test.bot.sendCopyableMessage
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Delivery unavailable'));
    await test.worker.tick();
    expect(test.job.sentParts).toBe(1);
    expect(test.job.content).toBeNull();
    expect(test.job.statusMessageId).toBe(55);
    expect(test.bot.clearStatus).not.toHaveBeenCalled();
    expect(test.bot.updateStatus).toHaveBeenLastCalledWith(
      123,
      55,
      expect.stringContaining('Retrying delivery'),
    );
    expect(test.job.replyParts).toHaveLength(3);
    const secondPart = test.job.replyParts[1].text;
    expect(test.job.replyParts[1].copyable).toBe(true);
    test.job.nextAttemptAt = new Date(0);
    await test.worker.tick();
    expect(test.generations.generate).toHaveBeenCalledTimes(1);
    expect(test.bot.sendCopyableMessage).toHaveBeenCalledTimes(3);
    expect(test.bot.sendCopyableMessage.mock.calls[2][1]).toBe(secondPart);
    expect(
      test.bot.sendCopyableMessage.mock.calls
        .slice(0, 2)
        .map((call) => call[1])
        .join(''),
    ).toBe('ក'.repeat(6000));
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(test.job.processedAt).toBeInstanceOf(Date);
    expect(test.bot.sendStatus).not.toHaveBeenCalled();
  });

  it('retries only the footer when text was delivered but the credit message failed', async () => {
    const test = setup();
    test.bot.sendMessage.mockRejectedValueOnce(new Error('Footer unavailable'));
    await test.worker.tick();
    expect(test.job.sentParts).toBe(1);
    test.job.nextAttemptAt = new Date(0);
    await test.worker.tick();
    expect(test.generations.generate).toHaveBeenCalledTimes(1);
    expect(test.bot.sendCopyableMessage).toHaveBeenCalledTimes(1);
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(2);
    expect(test.job.processedAt).toBeInstanceOf(Date);
  });

  it('sends grammar explanations separately and resumes them without repeating corrected text', async () => {
    const test = setup({
      feature: AiFeature.KHMER_GRAMMAR,
      content: 'I bought book.',
    });
    test.generations.generate.mockResolvedValue({
      data: {
        title: 'Corrected text',
        sections: [
          {
            id: 'result',
            label: 'Corrected text',
            content: 'I bought a book.',
          },
          {
            id: 'corrections',
            label: 'What changed',
            content:
              '1. “bought book” → “bought a book”\nAdd a before the singular countable noun book.',
          },
        ],
      },
      usage: { creditsCharged: 1, creditsRemaining: 19 },
    });
    test.bot.sendMessage.mockRejectedValueOnce(
      new Error('Explanation delivery failed'),
    );
    await test.worker.tick();
    expect(test.bot.sendCopyableMessage).toHaveBeenCalledWith(
      123,
      'I bought a book.',
    );
    expect(test.job.sentParts).toBe(1);
    expect(test.job.replyParts[1].copyable).toBe(false);
    test.job.nextAttemptAt = new Date(0);
    await test.worker.tick();
    expect(test.generations.generate).toHaveBeenCalledTimes(1);
    expect(test.bot.sendCopyableMessage).toHaveBeenCalledTimes(1);
    expect(test.bot.sendMessage.mock.calls[1]).toEqual([
      123,
      'What changed\n\n1. “bought book” → “bought a book”\nAdd a before the singular countable noun book.',
      undefined,
    ]);
    expect(test.bot.sendMessage.mock.calls[2][1]).toBe(
      'Credits used: 1 · Balance: 19',
    );
    expect(test.job.processedAt).toBeInstanceOf(Date);
  });

  it('resumes legacy queued replies without changing their saved boundaries', async () => {
    const test = setup({
      content: null,
      replyParts: ['Already sent', 'Legacy result with credits'],
      sentParts: 1,
    });
    await test.worker.tick();
    expect(test.generations.generate).not.toHaveBeenCalled();
    expect(test.bot.sendCopyableMessage).not.toHaveBeenCalled();
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      123,
      'Legacy result with credits',
      { inline_keyboard: [] },
    );
    expect(test.job.processedAt).toBeInstanceOf(Date);
  });

  it('reuses the generation key after an uncertain provider/database outcome', async () => {
    const test = setup();
    test.generations.generate.mockRejectedValueOnce(
      new Error('Database timeout'),
    );
    await test.worker.tick();
    expect(test.job.processedAt).toBeNull();
    expect(test.bot.updateStatus).toHaveBeenLastCalledWith(
      123,
      55,
      expect.stringContaining('Retrying automatically'),
    );
    expect(test.bot.clearStatus).not.toHaveBeenCalled();
    test.job.nextAttemptAt = new Date(0);
    await test.worker.tick();
    expect(test.generations.generate.mock.calls[0]).toEqual(
      test.generations.generate.mock.calls[1],
    );
  });

  it('delivers the daily-limit error without exposing unrelated errors', async () => {
    const test = setup();
    test.generations.generate.mockRejectedValue(
      new CreatorAiException(
        429,
        'AI_DAILY_LIMIT_REACHED',
        'Your daily AI usage limit has been reached. Please try again tomorrow.',
      ),
    );
    await test.worker.tick();
    expect(test.bot.sendMessage.mock.calls[0][1]).toContain(
      'daily AI usage limit',
    );
    expect(test.job.processedAt).toBeInstanceOf(Date);
    expect(test.bot.clearStatus).toHaveBeenCalledWith(
      123,
      55,
      expect.any(String),
    );
  });

  it('defers in-progress generations without replying with an incomplete result', async () => {
    const test = setup();
    test.generations.generate.mockRejectedValue(
      new CreatorAiException(409, 'AI_REQUEST_IN_PROGRESS', 'Processing'),
    );
    await test.worker.tick();
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(test.bot.sendCopyableMessage).not.toHaveBeenCalled();
    expect(test.job.processedAt).toBeNull();
    expect(test.job.content).toBe('original content');
  });

  it.each([
    null,
    { user: { id: 'owner', isActive: false } },
    { user: { id: 'different-owner', isActive: true } },
  ])(
    'does not charge or reveal a disabled/unlinked account: %j',
    async (linked) => {
      const test = setup();
      test.prisma.socialAccount.findUnique.mockResolvedValue(linked);
      await test.worker.tick();
      expect(test.generations.generate).not.toHaveBeenCalled();
      expect(test.bot.sendMessage).not.toHaveBeenCalled();
      expect(test.bot.sendCopyableMessage).not.toHaveBeenCalled();
      expect(test.job.content).toBeNull();
    },
  );

  it('rechecks account ownership after the provider finishes', async () => {
    const test = setup();
    test.prisma.socialAccount.findUnique
      .mockResolvedValueOnce({ user: { id: 'owner', isActive: true } })
      .mockResolvedValueOnce(null);
    await test.worker.tick();
    expect(test.generations.generate).toHaveBeenCalledTimes(1);
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(test.bot.sendCopyableMessage).not.toHaveBeenCalled();
    expect(test.job.replyParts).toBeNull();
  });

  it('expires old queued content without late charges', async () => {
    const test = setup({ createdAt: new Date(Date.now() - 86400001) });
    await test.worker.tick();
    expect(test.generations.generate).not.toHaveBeenCalled();
    expect(test.job.content).toBeNull();
    expect(test.job.processedAt).toBeInstanceOf(Date);
  });

  it("does not process another replica's active lease and recovers expired leases", async () => {
    const test = setup({
      leaseId: 'other-replica',
      lockedUntil: new Date(Date.now() + 60000),
    });
    await test.worker.tick();
    expect(test.generations.generate).not.toHaveBeenCalled();
    test.job.lockedUntil = new Date(0);
    await test.worker.tick();
    expect(test.generations.generate).toHaveBeenCalledTimes(1);
  });

  it('stops before delivery if its lease was replaced during generation', async () => {
    const test = setup();
    test.generations.generate.mockImplementationOnce(async () => {
      test.job.leaseId = 'new-replica';
      return {
        data: { title: 'Result', sections: [] },
        usage: { creditsCharged: 1, creditsRemaining: 19 },
      };
    });
    await test.worker.tick();
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(test.bot.sendCopyableMessage).not.toHaveBeenCalled();
    expect(test.job.processedAt).toBeNull();
  });

  it('keeps Khmer and emoji intact while splitting messages below Telegram limits', () => {
    const text = 'ក'.repeat(3899) + '😀' + '\nសួស្តី '.repeat(1000);
    const parts = splitCreatorTelegramText(text);
    expect(parts.join('')).toBe(text);
    expect(
      parts.every(
        (part) => part.length <= 3900 && !/[\uD800-\uDBFF]$/.test(part),
      ),
    ).toBe(true);
  });

  it('does not start a polling worker when the new bot is unconfigured', () => {
    const test = setup();
    const interval = jest.spyOn(global, 'setInterval');
    try {
      test.worker.onModuleInit();
      expect(interval).not.toHaveBeenCalled();
    } finally {
      interval.mockRestore();
      test.worker.onModuleDestroy();
    }
  });

  it('recovers a missing acknowledgement and saves its ID before generation', async () => {
    const test = setup({ statusMessageId: null });
    const generate = test.generations.generate.getMockImplementation()!;
    test.generations.generate.mockImplementationOnce(async (...args) => {
      expect(test.job.statusMessageId).toBe(56);
      return generate(...args);
    });
    await test.worker.tick();
    expect(test.bot.sendStatus).toHaveBeenCalledTimes(1);
    expect(test.bot.clearStatus).toHaveBeenCalledWith(
      123,
      56,
      expect.any(String),
    );
    expect(test.job.processedAt).toBeInstanceOf(Date);
  });

  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])(
    'honors personal corrections=%s and credits=%s without hiding corrected text',
    async (showCorrections, showCredits) => {
      const test = setup({ feature: AiFeature.KHMER_GRAMMAR });
      test.prisma.creatorTelegramChat.findUnique.mockResolvedValue({
        showCorrections,
        showCredits,
      });
      test.generations.generate.mockResolvedValue({
        data: {
          title: 'Corrected text',
          sections: [
            {
              id: 'result',
              label: 'Corrected text',
              content: 'I bought a book.',
            },
            {
              id: 'corrections',
              label: 'What changed',
              content: 'Add “a” before “book”.',
            },
          ],
        },
        usage: { creditsCharged: 1, creditsRemaining: 19 },
      });
      await test.worker.tick();
      expect(test.bot.sendCopyableMessage).toHaveBeenCalledWith(
        123,
        'I bought a book.',
      );
      expect(test.bot.sendMessage.mock.calls.map((call) => call[1])).toEqual([
        ...(showCorrections ? ['What changed\n\nAdd “a” before “book”.'] : []),
        ...(showCredits ? ['Credits used: 1 · Balance: 19'] : []),
      ]);
      expect(test.prisma.creatorTelegramChat.findUnique).toHaveBeenCalledWith({
        where: { telegramUserId: 123n },
      });
      expect(test.generations.generate).toHaveBeenCalledTimes(1);
      expect(test.job.processedAt).toBeInstanceOf(Date);
    },
  );

  it('keeps saved reply boundaries when preferences change during a delivery retry', async () => {
    const test = setup();
    test.prisma.creatorTelegramChat.findUnique.mockResolvedValue({
      showCredits: false,
    });
    test.bot.sendCopyableMessage.mockRejectedValueOnce(
      new Error('Delivery failed'),
    );
    await test.worker.tick();
    expect(test.job.replyParts).toHaveLength(1);
    test.prisma.creatorTelegramChat.findUnique.mockResolvedValue({
      showCredits: true,
    });
    test.job.nextAttemptAt = new Date(0);
    await test.worker.tick();
    expect(test.prisma.creatorTelegramChat.findUnique).toHaveBeenCalledTimes(1);
    expect(test.generations.generate).toHaveBeenCalledTimes(1);
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(test.job.processedAt).toBeInstanceOf(Date);
  });

  it('still delivers a result when optional feedback is unavailable', async () => {
    const test = setup({ statusMessageId: null });
    test.bot.sendStatus.mockResolvedValueOnce(null);
    test.bot.updateStatus.mockRejectedValue(new Error('Status unavailable'));
    test.bot.sendChatAction.mockRejectedValue(new Error('Typing unavailable'));
    await test.worker.tick();
    expect(test.generations.generate).toHaveBeenCalledTimes(1);
    expect(test.bot.sendCopyableMessage).toHaveBeenCalledTimes(1);
    expect(test.job.processedAt).toBeInstanceOf(Date);
  });

  it('stops feedback on shutdown while an existing generation finishes safely', async () => {
    jest.useFakeTimers();
    try {
      const test = setup();
      const generate = test.generations.generate.getMockImplementation()!;
      let complete!: (result: any) => void;
      test.generations.generate.mockReturnValueOnce(
        new Promise((resolve) => {
          complete = resolve;
        }),
      );
      const running = test.worker.tick();
      await jest.advanceTimersByTimeAsync(16000);
      expect(test.bot.updateStatus).toHaveBeenLastCalledWith(
        123,
        55,
        expect.stringContaining('Still working'),
      );
      await test.worker.onModuleDestroy();
      const count = test.bot.sendChatAction.mock.calls.length;
      await jest.advanceTimersByTimeAsync(20000);
      expect(test.bot.sendChatAction).toHaveBeenCalledTimes(count);
      expect(jest.getTimerCount()).toBe(0);
      complete(await generate());
      await running;
      expect(test.bot.sendCopyableMessage).toHaveBeenCalledTimes(1);
      expect(test.job.processedAt).toBeInstanceOf(Date);
    } finally {
      jest.useRealTimers();
    }
  });
});
