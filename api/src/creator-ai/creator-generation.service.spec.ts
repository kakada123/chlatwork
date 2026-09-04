import { AiFeature } from '@prisma/client';
import { CreatorAiException } from './creator-ai.errors';
import type { CreatorAiGatewayService } from './creator-ai-gateway.service';
import type { CreatorCreditsService } from './creator-credits.service';
import { CreatorGenerationService } from './creator-generation.service';
import type { CreatorPricingService } from './creator-pricing.service';

const result = {
  title: 'Generated post',
  sections: [{ id: 'post', label: 'Post', content: 'Useful content' }],
};

describe('CreatorGenerationService', () => {
  function setup() {
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
    );
    return { service, gateway, credits };
  }

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
