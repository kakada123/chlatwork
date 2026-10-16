import { BotPaidAiService } from './bot-paid-ai.service';

function setup() {
  const credits = {
    reserve: jest
      .fn()
      .mockResolvedValue({ kind: 'created', generation: { id: 'generation' } }),
    markProcessing: jest.fn(),
    complete: jest.fn(),
    refund: jest.fn(),
  };
  const access = { assertAllowed: jest.fn() };
  const service = new BotPaidAiService(
    credits as never,
    access as never,
    { get: jest.fn() } as never,
  );
  return { service, credits, access };
}

describe('ChlatWork shared paid AI', () => {
  it('reserves from the shared wallet before invoking a provider and records the bot', async () => {
    const { service, credits } = setup();
    const operation = jest.fn(async () => {
      expect(credits.reserve).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner',
          credits: 1,
          sourceBot: 'CHLATWORK',
        }),
      );
      return 'result';
    });
    await expect(
      service.run('owner', 10, 'CHLATWORK_VOICE', 'audio', operation),
    ).resolves.toBe('result');
    expect(credits.complete).toHaveBeenCalledWith(
      'generation',
      expect.any(Object),
      expect.any(Object),
      'CHLATWORK',
    );
  });

  it('does not call a provider with insufficient funds or a revoked account', async () => {
    const { service, credits, access } = setup();
    const operation = jest.fn();
    credits.reserve.mockRejectedValueOnce(new Error('insufficient credits'));
    await expect(
      service.run('owner', 10, 'CHLATWORK_VOICE', 'audio', operation),
    ).rejects.toThrow('insufficient');
    access.assertAllowed.mockRejectedValueOnce(new Error('disabled'));
    await expect(
      service.run('owner', 11, 'CHLATWORK_VOICE', 'audio', operation),
    ).rejects.toThrow('disabled');
    expect(operation).not.toHaveBeenCalled();
  });

  it('refunds provider failures and revocation after reservation', async () => {
    const { service, credits, access } = setup();
    const operation = jest.fn().mockRejectedValue(new Error('provider failed'));
    await expect(
      service.run('owner', 10, 'CHLATWORK_VOICE', 'audio', operation),
    ).rejects.toThrow('provider failed');
    expect(credits.refund).toHaveBeenCalledTimes(1);
    access.assertAllowed
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('disabled'));
    await expect(
      service.run('owner', 11, 'CHLATWORK_VOICE', 'audio', operation),
    ).rejects.toThrow('disabled');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(credits.refund).toHaveBeenCalledTimes(2);
  });

  it('reuses completed results without repeating assistant side effects', async () => {
    const { service, credits } = setup();
    credits.reserve.mockResolvedValueOnce({
      kind: 'existing',
      generation: {
        id: 'generation',
        status: 'COMPLETED',
        result: { sections: [{ content: '{"consumed":true,"text":"Saved"}' }] },
      },
    });
    const operation = jest.fn();
    await expect(
      service.run(
        'owner',
        10,
        'CHLATWORK_ASSISTANT',
        'remember this',
        operation,
      ),
    ).resolves.toEqual({ consumed: true, text: 'Saved' });
    expect(operation).not.toHaveBeenCalled();
    expect(credits.complete).not.toHaveBeenCalled();
  });
});
