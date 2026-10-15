import { AiFeature } from '@prisma/client';
import { CreatorTelegramProgress } from './creator-telegram.progress';

function setup(business?: {
  connectionId: string;
  isActive: () => Promise<boolean>;
}) {
  const bot = {
    sendChatAction: jest.fn().mockResolvedValue(true),
    sendBusinessChatAction: jest.fn().mockResolvedValue(true),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
  const progress = new CreatorTelegramProgress(
    bot as never,
    123,
    business ? null : 55,
    business,
  );
  return { bot, progress };
}

describe('Creator Telegram waiting feedback', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('refreshes Business typing through its connection without changing the placeholder', async () => {
    const { bot, progress } = setup({
      connectionId: 'test-business',
      isActive: async () => true,
    });
    progress.start(AiFeature.KHMER_GRAMMAR, new Date(Date.now() + 300000));
    await jest.advanceTimersByTimeAsync(16000);
    expect(bot.sendBusinessChatAction.mock.calls).toEqual(
      Array(5).fill(['test-business', 123, 'typing']),
    );
    expect(bot.sendChatAction).not.toHaveBeenCalled();
    expect(bot.updateStatus).not.toHaveBeenCalled();
    await progress.stop();
    await jest.advanceTimersByTimeAsync(10000);
    expect(bot.sendBusinessChatAction).toHaveBeenCalledTimes(5);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops Business typing when the request is cancelled or loses its lease', async () => {
    let active = true;
    const { bot, progress } = setup({
      connectionId: 'test-business',
      isActive: async () => active,
    });
    progress.start(AiFeature.KHMER_REWRITE, new Date(Date.now() + 300000));
    await jest.advanceTimersByTimeAsync(0);
    active = false;
    await jest.advanceTimersByTimeAsync(12000);
    expect(bot.sendBusinessChatAction).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    await progress.stop();
  });

  it('drains in-flight Business typing before completion without overlapping requests', async () => {
    const { bot, progress } = setup({
      connectionId: 'test-business',
      isActive: async () => true,
    });
    let release!: () => void;
    bot.sendBusinessChatAction.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    progress.start(AiFeature.KHMER_REWRITE, new Date(Date.now() + 300000));
    await jest.advanceTimersByTimeAsync(12000);
    expect(bot.sendBusinessChatAction).toHaveBeenCalledTimes(1);
    let stopped = false;
    const stopping = progress.stop().then(() => {
      stopped = true;
    });
    await jest.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);
    release();
    await stopping;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('tolerates failed Business typing and stops at the generation deadline', async () => {
    const { bot, progress } = setup({
      connectionId: 'test-business',
      isActive: async () => true,
    });
    bot.sendBusinessChatAction.mockRejectedValue(
      new Error('Telegram unavailable'),
    );
    progress.start(AiFeature.HUMANIZE, new Date(Date.now() + 10000));
    await jest.advanceTimersByTimeAsync(20000);
    expect(bot.sendBusinessChatAction).toHaveBeenCalledTimes(3);
    expect(bot.updateStatus).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    await progress.stop();
  });

  it('does not dispatch Business typing if shutdown happens during the lease check', async () => {
    let release!: (active: boolean) => void;
    const { bot, progress } = setup({
      connectionId: 'test-business',
      isActive: () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    });
    progress.start(AiFeature.KHMER_GRAMMAR, new Date(Date.now() + 300000));
    await jest.advanceTimersByTimeAsync(0);
    const stopping = progress.stop();
    release(true);
    await stopping;
    expect(bot.sendBusinessChatAction).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('refreshes typing and edits one status after 15 seconds without repeated notices', async () => {
    const { bot, progress } = setup();
    progress.start(AiFeature.KHMER_GRAMMAR, new Date(Date.now() + 300000));
    await jest.advanceTimersByTimeAsync(14999);
    expect(bot.updateStatus.mock.calls).toEqual([
      [123, 55, '✍️ Checking your grammar…'],
    ]);
    expect(bot.sendChatAction).toHaveBeenCalledTimes(4);
    await jest.advanceTimersByTimeAsync(1);
    expect(bot.updateStatus).toHaveBeenLastCalledWith(
      123,
      55,
      expect.stringContaining('Still working'),
    );
    await jest.advanceTimersByTimeAsync(15000);
    expect(bot.updateStatus).toHaveBeenCalledTimes(2);
    await progress.stop();
    const count = bot.sendChatAction.mock.calls.length;
    await jest.advanceTimersByTimeAsync(20000);
    expect(bot.sendChatAction).toHaveBeenCalledTimes(count);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not send a slow notice after a fast completion', async () => {
    const { bot, progress } = setup();
    progress.start(AiFeature.LATIN_TO_KHMER, new Date(Date.now() + 300000));
    await jest.advanceTimersByTimeAsync(1000);
    await progress.stop();
    await jest.advanceTimersByTimeAsync(20000);
    expect(bot.updateStatus.mock.calls).toEqual([
      [123, 55, '✍️ Converting your text to Khmer…'],
    ]);
    expect(bot.sendChatAction).toHaveBeenCalledTimes(1);
  });

  it('does not overlap slow typing calls and drains an in-flight status before stopping', async () => {
    const { bot, progress } = setup();
    let resolveTyping!: (value: boolean) => void;
    let resolveEdit!: () => void;
    bot.sendChatAction.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveTyping = resolve;
      }),
    );
    bot.updateStatus.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveEdit = resolve;
      }),
    );
    progress.start(AiFeature.KHMER_REWRITE, new Date(Date.now() + 300000));
    await jest.advanceTimersByTimeAsync(16000);
    expect(bot.sendChatAction).toHaveBeenCalledTimes(1);
    let stopped = false;
    const stopping = progress.stop().then(() => {
      stopped = true;
    });
    await jest.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);
    resolveTyping(true);
    resolveEdit();
    await stopping;
    // The queued slow edit must not overwrite a later completed status.
    expect(bot.updateStatus).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('tolerates feedback errors and stops automatically at lease expiry', async () => {
    const { bot, progress } = setup();
    bot.sendChatAction.mockRejectedValue(new Error('Telegram unavailable'));
    bot.updateStatus.mockRejectedValue(new Error('Message deleted'));
    progress.start(AiFeature.HUMANIZE, new Date(Date.now() + 10000));
    await jest.advanceTimersByTimeAsync(20000);
    expect(bot.sendChatAction).toHaveBeenCalledTimes(3);
    expect(bot.updateStatus).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    await progress.stop();
  });
});
