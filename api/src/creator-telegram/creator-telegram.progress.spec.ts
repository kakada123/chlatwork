import { AiFeature } from '@prisma/client';
import { CreatorTelegramProgress } from './creator-telegram.progress';

function setup() {
  const bot = {
    sendChatAction: jest.fn().mockResolvedValue(true),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
  const progress = new CreatorTelegramProgress(bot as never, 123, 55);
  return { bot, progress };
}

describe('Creator Telegram waiting feedback', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

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
