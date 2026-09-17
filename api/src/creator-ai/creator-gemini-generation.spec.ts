import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import { CreatorAiGatewayService } from './creator-ai-gateway.service';

const mockGenerate = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerate },
  })),
  ApiError: class extends Error {
    constructor(readonly status: number) {
      super('private provider details');
    }
  },
}));

const config = (values: Record<string, unknown> = {}) =>
  ({
    get: (key: string) =>
      ({
        AI_ENABLED: 'true',
        AI_USE_GEMINI: 'true',
        GEMINI_API_KEY: 'test-gemini-key',
        ...values,
      })[key],
  }) as ConfigService;

const spec = () => ({
  name: 'creator_result',
  instructions: 'private instructions',
  input: 'private input',
  schema: {
    type: 'object',
    properties: { content: { type: 'string' } },
    required: ['content'],
  },
  maxOutputTokens: 500,
  premium: false,
  parse: jest.fn((value: unknown) => value),
});

describe('Creator Gemini generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    mockGenerate.mockResolvedValue({
      responseId: 'gemini-response-1',
      candidates: [{ finishReason: 'STOP' }],
      text: '{"content":"សួស្តី"}',
      usageMetadata: {
        promptTokenCount: 100,
        cachedContentTokenCount: 20,
        candidatesTokenCount: 30,
        thoughtsTokenCount: 5,
      },
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('routes Creator requests to Gemini and accounts for thought tokens', async () => {
    const gateway = new CreatorAiGatewayService(config());
    const result = await gateway.generateStructured(
      AiFeature.POST,
      'request-1',
      spec(),
    );

    expect(result).toMatchObject({
      data: { content: 'សួស្តី' },
      usage: {
        provider: 'GEMINI',
        model: 'gemini-3.5-flash-lite',
        inputTokens: 100,
        cachedInputTokens: 20,
        outputTokens: 35,
        providerRequestId: 'gemini-response-1',
      },
    });
    expect(result.usage.estimatedProviderCostUsd).toBeCloseTo(
      (100 * 0.3 + 35 * 2.5) / 1_000_000,
    );
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.5-flash-lite',
        config: expect.objectContaining({
          responseMimeType: 'application/json',
          responseJsonSchema: spec().schema,
        }),
      }),
    );
  });

  it('passes Creator images as inline data without sending them to OpenAI', async () => {
    const gateway = new CreatorAiGatewayService(config());
    await gateway.generateStructured(AiFeature.POST, 'request-image', spec(), {
      bytes: Buffer.from([1, 2, 3]),
      mimeType: 'image/png',
    });
    expect(mockGenerate.mock.calls[0][0].contents[0].parts).toEqual([
      { text: 'private input' },
      { inlineData: { mimeType: 'image/png', data: 'AQID' } },
    ]);
  });

  it('retains provider usage when Gemini returns incomplete output', async () => {
    mockGenerate.mockResolvedValueOnce({
      responseId: 'gemini-response-2',
      candidates: [{ finishReason: 'MAX_TOKENS' }],
      text: '{"partial":',
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 500 },
    });
    const gateway = new CreatorAiGatewayService(config());
    await expect(
      gateway.generateStructured(AiFeature.POST, 'request-2', spec()),
    ).rejects.toMatchObject({
      usage: { provider: 'GEMINI', outputTokens: 500 },
      structuredFailure: { reason: 'OUTPUT_TOKEN_LIMIT' },
    });
    expect(
      JSON.stringify((Logger.prototype.error as jest.Mock).mock.calls),
    ).not.toContain('partial');
  });

  it('logs a safe model-unavailable reason for a provider 404', async () => {
    const { ApiError } = jest.requireMock('@google/genai');
    mockGenerate.mockRejectedValueOnce(new ApiError(404));
    const gateway = new CreatorAiGatewayService(config());

    await expect(
      gateway.generateStructured(
        AiFeature.LATIN_TO_KHMER,
        'request-404',
        spec(),
      ),
    ).rejects.toMatchObject({ message: 'Gemini request failed' });
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Creator Gemini request failed',
      expect.objectContaining({
        providerStatus: 404,
        providerFailureReason: 'GEMINI_MODEL_UNAVAILABLE',
      }),
    );
  });

  it('fails closed when the switch is on but the Gemini key is unavailable', async () => {
    const gateway = new CreatorAiGatewayService(
      config({ GEMINI_API_KEY: 'dummy_gemini_api_key' }),
    );
    await expect(
      gateway.generateStructured(AiFeature.POST, 'request-3', spec()),
    ).rejects.toBeDefined();
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
