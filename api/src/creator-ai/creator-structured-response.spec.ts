import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import OpenAI from 'openai';
import {
  CreatorAiGatewayService,
  CreatorProviderError,
} from './creator-ai-gateway.service';
import {
  parseCreatorStructuredResponse,
  structuredResponseDiagnostics,
} from './creator-structured-response';
import { CreatorVideoWorker } from './creator-video.worker';
import { CreatorGenerationService } from './creator-generation.service';

const completed = {
  id: 'response-id',
  status: 'completed',
  output_text: '{"text":"សួស្តី"}',
  output: [],
  incomplete_details: null,
  usage: {
    input_tokens: 50,
    output_tokens: 4000,
    output_tokens_details: { reasoning_tokens: 3800 },
  },
};
const spec = () => ({
  name: 'video_content_pack',
  instructions: 'private instructions',
  input: 'private transcript',
  schema: {},
  maxOutputTokens: 4000,
  premium: true,
  parse: jest.fn((value) => value),
});

describe('Creator structured response handling', () => {
  beforeEach(() =>
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {}),
  );
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [
      {
        status: 'incomplete',
        incomplete_details: { reason: 'max_output_tokens' },
      },
      'OUTPUT_TOKEN_LIMIT',
    ],
    [
      {
        status: 'incomplete',
        incomplete_details: { reason: 'content_filter' },
      },
      'CONTENT_FILTERED',
    ],
    [{ status: 'failed' }, 'RESPONSE_NOT_COMPLETED'],
    [
      {
        output: [
          {
            type: 'message',
            content: [{ type: 'refusal', refusal: 'private refusal text' }],
          },
        ],
      },
      'MODEL_REFUSAL',
    ],
    [{ output_text: '' }, 'EMPTY_OUTPUT'],
    [{ output_text: '{"partial":' }, 'INVALID_JSON'],
  ])(
    'rejects unusable provider response %# before domain parsing',
    (override, reason) => {
      const prompt = spec();
      expect(() =>
        parseCreatorStructuredResponse(
          { ...completed, ...(override as object) } as any,
          prompt,
        ),
      ).toThrow(expect.objectContaining({ reason }));
      expect(prompt.parse).not.toHaveBeenCalled();
    },
  );

  it('identifies local result validation separately from JSON parsing without echoing its message', () => {
    const prompt = spec();
    prompt.parse.mockImplementation(() => {
      throw new Error('private generated content');
    });
    expect(() =>
      parseCreatorStructuredResponse(completed as any, prompt),
    ).toThrow(
      expect.objectContaining({
        reason: 'RESULT_VALIDATION_FAILED',
        message: 'Creator structured response was not usable',
      }),
    );
  });

  it('logs incomplete response counts and preserves consumed usage without retrying', async () => {
    const response = {
      ...completed,
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
      output_text: 'private generated content',
    };
    const config = {
      get: (key: string) =>
        ({
          AI_ENABLED: 'true',
          OPENAI_TEXT_MODEL: 'gpt-6-astra',
          OPENAI_PREMIUM_OUTPUT_USD_PER_1M: 50,
        })[key],
    };
    const gateway = new CreatorAiGatewayService(config as ConfigService);
    const create = jest.fn().mockResolvedValue(response);
    Object.assign(gateway, { client: { responses: { create } } });
    await expect(
      gateway.generateStructured(
        AiFeature.VIDEO_CONTENT_PACK,
        'request',
        spec(),
      ),
    ).rejects.toMatchObject({
      usage: { outputTokens: 4000, estimatedProviderCostUsd: 0.2 },
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        providerStatus: null,
        providerFailureReason: 'OUTPUT_TOKEN_LIMIT',
        responseStatus: 'incomplete',
        maxOutputTokens: 4000,
        outputTokens: 4000,
        reasoningTokens: 3800,
      }),
    );
    expect(
      JSON.stringify((Logger.prototype.error as jest.Mock).mock.calls),
    ).not.toContain('private');
  });

  it('accepts completed JSON even when optional cached-token details are absent', async () => {
    const gateway = new CreatorAiGatewayService({
      get: (key: string) =>
        ({ AI_ENABLED: 'true', OPENAI_TEXT_MODEL: 'gpt-6-astra' })[key],
    } as ConfigService);
    Object.assign(gateway, {
      client: { responses: { create: jest.fn().mockResolvedValue(completed) } },
    });
    expect(
      await gateway.generateStructured(
        AiFeature.VIDEO_CONTENT_PACK,
        'request',
        spec(),
      ),
    ).toMatchObject({
      data: { text: 'សួស្តី' },
      usage: { cachedInputTokens: null, outputTokens: 4000 },
    });
  });

  it.each([
    [new OpenAI.APIConnectionTimeoutError(), 'PROVIDER_TIMEOUT'],
    [
      new OpenAI.APIConnectionError({ message: 'private network diagnostic' }),
      'PROVIDER_CONNECTION_ERROR',
    ],
    [
      { status: 400, message: 'private provider response' },
      'PROVIDER_HTTP_ERROR',
    ],
  ])(
    'classifies request failure %# without response data',
    async (error, reason) => {
      const gateway = new CreatorAiGatewayService({
        get: (key: string) =>
          ({ AI_ENABLED: 'true', OPENAI_TEXT_MODEL: 'gpt-6-astra' })[key],
      } as ConfigService);
      const create = jest.fn().mockRejectedValue(error);
      Object.assign(gateway, { client: { responses: { create } } });
      await expect(
        gateway.generateStructured(
          AiFeature.VIDEO_CONTENT_PACK,
          'request',
          spec(),
        ),
      ).rejects.toBeInstanceOf(CreatorProviderError);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          providerFailureReason: reason,
          responseStatus: null,
          outputTokens: null,
        }),
      );
      expect(
        JSON.stringify((Logger.prototype.error as jest.Mock).mock.calls),
      ).not.toContain('private');
    },
  );

  it('only exposes numeric metadata and allowlisted response statuses', () => {
    expect(
      structuredResponseDiagnostics({
        status: 'private',
        output_text: 'private',
        usage: {
          input_tokens: 'private',
          output_tokens: -1,
          output_tokens_details: { reasoning_tokens: NaN },
        },
      } as any),
    ).toEqual({
      responseStatus: null,
      outputCharacters: 7,
      inputTokens: null,
      outputTokens: null,
      reasoningTokens: null,
    });
  });

  it('includes failed content usage in the video refund accounting', async () => {
    const usage = {
      provider: 'OPENAI' as const,
      model: 'test',
      inputTokens: 10,
      cachedInputTokens: 0,
      outputTokens: 20,
      audioSeconds: null,
      estimatedProviderCostUsd: 0.01,
      providerRequestId: null,
      durationMs: 1,
    };
    const gateway = {
      transcribe: jest
        .fn()
        .mockResolvedValue({
          data: {
            text: 'សួស្តី',
            segments: [{ start: 0, end: 3, text: 'សួស្តី' }],
          },
          usage,
        }),
      generateStructured: jest
        .fn()
        .mockResolvedValueOnce({ data: ['សួស្តី'], usage })
        .mockRejectedValueOnce(
          new CreatorProviderError('OpenAI request failed', 3, {
            ...usage,
            outputTokens: 4000,
            estimatedProviderCostUsd: 0.2,
          }),
        ),
    };
    const credits = {
      markProcessing: jest.fn(),
      complete: jest.fn(),
      refund: jest.fn(),
    };
    const worker = new CreatorVideoWorker(
      { aiVideoJob: { update: jest.fn(), updateMany: jest.fn() } } as any,
      {} as ConfigService,
      gateway as any,
      credits as any,
      {
        extractAudio: jest.fn().mockResolvedValue('/mock/audio.mp3'),
        srt: jest.fn(),
        remove: jest.fn(),
      } as any,
    );
    await (worker as any).process({
      id: 'job',
      generationId: 'generation',
      userId: 'user',
      feature: AiFeature.VIDEO_CONTENT_PACK,
      tempFilePath: '/mock/input.m4a',
      durationSeconds: 3,
      mimeType: 'audio/mp4',
      generation: { inputSummary: 'Video Content Pack|KHMER|NATURAL' },
    });
    expect(credits.complete).not.toHaveBeenCalled();
    expect(credits.refund).toHaveBeenCalledWith(
      'generation',
      'AI_GENERATION_FAILED',
      expect.objectContaining({
        outputTokens: 4040,
        estimatedProviderCostUsd: 0.22,
      }),
    );
    const textCredits = {
      validateIdempotencyKey: () => 'request-key',
      reserve: jest
        .fn()
        .mockResolvedValue({
          kind: 'created',
          generation: { id: 'text-generation' },
        }),
      markProcessing: jest.fn(),
      refund: jest.fn(),
    };
    const textGateway = {
      generateStructured: jest
        .fn()
        .mockRejectedValue(
          new CreatorProviderError('OpenAI request failed', 3, usage),
        ),
    };
    const textService = new CreatorGenerationService(
      textGateway as any,
      textCredits as any,
      { fixed: () => 2 } as any,
    );
    await expect(
      textService.generate(
        'user',
        {
          feature: AiFeature.POST,
          payload: { topic: 'Coffee' },
          inputSummary: 'Post',
        },
        'request-key',
      ),
    ).rejects.toThrow();
    expect(textCredits.refund).toHaveBeenCalledWith(
      'text-generation',
      'AI_GENERATION_FAILED',
      expect.objectContaining({ outputTokens: 20, durationMs: 3 }),
    );
  });
});
