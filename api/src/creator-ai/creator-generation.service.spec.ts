import { AiFeature } from '@prisma/client';
import { CreatorAiException } from './creator-ai.errors';
import type { CreatorAiGatewayService } from './creator-ai-gateway.service';
import type { CreatorCreditsService } from './creator-credits.service';
import { CreatorGenerationService } from './creator-generation.service';
import type { CreatorPricingService } from './creator-pricing.service';
import { buildCreatorTextPrompt } from './creator-prompts';

const result = {
  title: 'Generated post',
  sections: [{ id: 'post', label: 'Post', content: 'Useful content' }],
};

describe('CreatorGenerationService', () => {
  it.each([
    ['She go to school every day.', 'She goes to school every day.'],
    ['ខ្ញុំចូលចិត្តអានសៀវភៅ។', 'ខ្ញុំចូលចិត្តអានសៀវភៅ។'],
    [
      'សួស្តី! She go to school every day.',
      'សួស្តី! She goes to school every day.',
    ],
  ])(
    'uses the same language-preserving grammar prompt for web and legacy bot input: %s',
    (content, corrected) => {
      const web = buildCreatorTextPrompt(AiFeature.KHMER_GRAMMAR, { content });
      const bot = buildCreatorTextPrompt(AiFeature.KHMER_GRAMMAR, {
        content,
        language: 'KHMER',
        tone: 'NATURAL_KHMER',
      });
      expect(bot.input).toBe(web.input);
      expect(JSON.parse(bot.input)).toEqual({ content });
      expect(bot.instructions).toContain(
        'Correct English content in English and Khmer content in Khmer',
      );
      expect(bot.instructions).toContain('Do not translate or transliterate');
      expect(bot.instructions).toContain(
        'preserve the language of each passage',
      );
      const corrections =
        content === corrected
          ? []
          : [
              {
                original: 'go',
                corrected: 'goes',
                reason: 'Use goes with the singular subject she.',
              },
            ];
      expect(bot.parse({ result: corrected, corrections })).toEqual({
        title: 'Corrected text',
        sections: [
          { id: 'result', label: 'Corrected text', content: corrected },
          {
            id: 'corrections',
            label: 'What changed',
            content: corrections.length
              ? '1. “go” → “goes”\nUse goes with the singular subject she.'
              : 'No corrections needed.',
          },
        ],
      });
      expect(bot.premium).toBe(false);
    },
  );

  it('lists missing articles separately from the complete corrected text', () => {
    const prompt = buildCreatorTextPrompt(AiFeature.KHMER_GRAMMAR, {
      content: 'I bought book.',
    });
    const parsed = prompt.parse({
      result: 'I bought a book.',
      corrections: [
        {
          original: 'bought book',
          corrected: 'bought a book',
          reason: 'Add a before the singular countable noun book.',
        },
      ],
    });
    expect(parsed.sections[0].content).toBe('I bought a book.');
    expect(parsed.sections[1].content).toBe(
      '1. “bought book” → “bought a book”\nAdd a before the singular countable noun book.',
    );
    expect(prompt.instructions).toContain(
      'missing words such as a, an, or the',
    );
    expect(prompt.schema.required).toEqual(['result', 'corrections']);
  });

  it.each([
    ['I saw cat.', 'I saw a cat.', '', 'a', '(missing) → “a”'],
    ['I saw a a cat.', 'I saw a cat.', 'a', '', '“a” → (removed)'],
  ])(
    'shows additions and removals explicitly: %s',
    (content, correctedText, original, corrected, label) => {
      const prompt = buildCreatorTextPrompt(AiFeature.KHMER_GRAMMAR, {
        content,
      });
      expect(
        prompt.parse({
          result: correctedText,
          corrections: [
            { original, corrected, reason: 'Correct the article.' },
          ],
        }).sections[1].content,
      ).toContain(label);
    },
  );

  it.each([
    undefined,
    null,
    {},
    [],
    [{ original: '', corrected: '', reason: 'No change' }],
    [{ original: 'go', corrected: 'go', reason: 'No change' }],
    [{ original: 'go', corrected: 'goes', reason: '' }],
    [{ original: 1, corrected: 'goes', reason: 'Invalid word' }],
    [{ original: 'go', corrected: 'x'.repeat(501), reason: 'Too long' }],
    [{ original: 'go', corrected: 'goes', reason: 'x'.repeat(501) }],
    Array.from({ length: 31 }, () => ({
      original: 'go',
      corrected: 'goes',
      reason: 'Verb agreement',
    })),
  ])(
    'rejects malformed or incomplete grammar explanations: %j',
    (corrections) => {
      const prompt = buildCreatorTextPrompt(AiFeature.KHMER_GRAMMAR, {
        content: 'She go.',
      });
      expect(() =>
        prompt.parse({ result: 'She goes.', corrections }),
      ).toThrow();
    },
  );

  it('rejects invented corrections when the text is unchanged', () => {
    const prompt = buildCreatorTextPrompt(AiFeature.KHMER_GRAMMAR, {
      content: 'She goes.',
    });
    expect(() =>
      prompt.parse({
        result: 'She goes.',
        corrections: [
          { original: 'go', corrected: 'goes', reason: 'Verb agreement' },
        ],
      }),
    ).toThrow('Grammar corrections do not match the result');
  });

  function setup(access?: { assertAllowed: jest.Mock }) {
    const gateway = {
      generateStructured: jest.fn().mockResolvedValue({
        data: result,
        usage: {
          provider: 'OPENAI',
          model: 'test-model',
          inputTokens: 10,
          cachedInputTokens: 0,
          outputTokens: 20,
          audioSeconds: null,
          estimatedProviderCostUsd: 0.001,
          providerRequestId: 'provider-request',
          durationMs: 10,
        },
      }),
    };
    const credits = {
      validateIdempotencyKey: jest.fn((key: string) => key),
      reserve: jest.fn().mockResolvedValue({
        kind: 'created',
        generation: {
          id: 'generation-id',
          feature: AiFeature.POST,
          status: 'RESERVED',
          creditCost: 2,
          result: null,
          errorCode: null,
        },
        balance: 8,
      }),
      markProcessing: jest.fn(),
      complete: jest.fn().mockResolvedValue({ balance: 8, creditsCharged: 2 }),
      refund: jest.fn(),
    };
    const pricing = { fixed: jest.fn().mockReturnValue(2) };
    const service = new CreatorGenerationService(
      gateway as unknown as CreatorAiGatewayService,
      credits as unknown as CreatorCreditsService,
      pricing as unknown as CreatorPricingService,
      undefined,
      access as never,
    );
    return { service, gateway, credits };
  }

  it('refunds and avoids the provider when bot access is revoked during reservation', async () => {
    const access = {
      assertAllowed: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('revoked')),
    };
    const { service, gateway, credits } = setup(access);
    await expect(
      service.generate(
        'user-id',
        {
          feature: AiFeature.KHMER_GRAMMAR,
          sourceBot: 'CREATOR',
          payload: { content: 'She go.' },
          inputSummary: 'Telegram Khmer AI',
        },
        'creator-telegram:123',
      ),
    ).rejects.toThrow();
    expect(credits.reserve).toHaveBeenCalled();
    expect(gateway.generateStructured).not.toHaveBeenCalled();
    expect(credits.refund).toHaveBeenCalledWith(
      'generation-id',
      'AI_GENERATION_FAILED',
      expect.any(Object),
      'CREATOR',
    );
  });

  it('does not call OpenAI when reservation rejects insufficient credits', async () => {
    const { service, gateway, credits } = setup();
    credits.reserve.mockRejectedValue(
      new CreatorAiException(
        402,
        'INSUFFICIENT_AI_CREDITS',
        'Insufficient credits',
      ),
    );
    await expect(
      service.generate(
        'user-id',
        {
          feature: AiFeature.POST,
          payload: { topic: 'Cambodian coffee' },
          inputSummary: 'Social post',
        },
        'idempotency-key-1234',
      ),
    ).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_AI_CREDITS' } });
    expect(gateway.generateStructured).not.toHaveBeenCalled();
  });

  it('refunds a reservation when the provider fails', async () => {
    const { service, gateway, credits } = setup();
    gateway.generateStructured.mockRejectedValue(new Error('provider failed'));
    await expect(
      service.generate(
        'user-id',
        {
          feature: AiFeature.POST,
          payload: { topic: 'Cambodian coffee' },
          inputSummary: 'Social post',
        },
        'idempotency-key-1234',
      ),
    ).rejects.toMatchObject({ response: { code: 'AI_GENERATION_FAILED' } });
    expect(credits.refund).toHaveBeenCalledTimes(1);
    expect(credits.complete).not.toHaveBeenCalled();
  });

  it('refunds Business-edit output that cannot fit in the original Telegram message', async () => {
    const { service, gateway, credits } = setup();
    gateway.generateStructured.mockResolvedValue({
      data: {
        title: 'Result',
        sections: [{ id: 'result', label: 'Text', content: 'x'.repeat(4097) }],
      },
      usage: {},
    } as any);
    await expect(
      service.generate(
        'user-id',
        {
          feature: AiFeature.KHMER_GRAMMAR,
          payload: { content: 'Hello' },
          inputSummary: 'Business edit',
          outputMode: 'BUSINESS_EDIT',
        } as any,
        'idempotency-key-1234',
      ),
    ).rejects.toMatchObject({ response: { code: 'AI_GENERATION_FAILED' } });
    expect(credits.complete).not.toHaveBeenCalled();
    expect(credits.refund).toHaveBeenCalledTimes(1);
  });

  it('returns a completed idempotent request without another provider call', async () => {
    const { service, gateway, credits } = setup();
    credits.reserve.mockResolvedValue({
      kind: 'existing',
      generation: {
        id: 'generation-id',
        feature: AiFeature.POST,
        status: 'COMPLETED',
        creditCost: 2,
        result,
        errorCode: null,
      },
      balance: 8,
    });
    await expect(
      service.generate(
        'user-id',
        {
          feature: AiFeature.POST,
          payload: { topic: 'Cambodian coffee' },
          inputSummary: 'Social post',
        },
        'idempotency-key-1234',
      ),
    ).resolves.toMatchObject({ data: result, idempotentReplay: true });
    expect(gateway.generateStructured).not.toHaveBeenCalled();
    expect(credits.complete).not.toHaveBeenCalled();
  });
});

describe('group revocation during paid reservation', () => {
  it('refunds the requesting user and never calls the provider when the group is disabled while reserving', async () => {
    const gateway = { generateStructured: jest.fn() };
    const credits = {
      validateIdempotencyKey: (key: string) => key,
      reserve: jest
        .fn()
        .mockResolvedValue({
          kind: 'created',
          generation: { id: 'generation' },
        }),
      markProcessing: jest.fn(),
      refund: jest.fn(),
    };
    const policy = {
      paid: jest
        .fn()
        .mockResolvedValueOnce({ workspaceId: 'A' })
        .mockRejectedValueOnce(new Error('group disabled')),
    };
    const service = new CreatorGenerationService(
      gateway as never,
      credits as never,
      { fixed: () => 1 } as never,
      undefined,
      { assertAllowed: jest.fn() } as never,
      policy as never,
    );
    await expect(
      service.generate(
        'requesting-user',
        {
          feature: AiFeature.KHMER_GRAMMAR,
          sourceBot: 'CREATOR',
          sourceGroup: {
            workspaceId: 'A',
            chatId: '-1001',
            telegramUserId: '123',
          },
          payload: { content: 'hi' },
          inputSummary: 'Telegram',
        },
        'creator-test-1',
      ),
    ).rejects.toThrow();
    expect(credits.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'requesting-user' }),
    );
    expect(gateway.generateStructured).not.toHaveBeenCalled();
    expect(credits.refund).toHaveBeenCalledWith(
      'generation',
      'AI_GENERATION_FAILED',
      expect.any(Object),
      'CREATOR',
    );
  });
});
