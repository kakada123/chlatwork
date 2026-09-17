import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import { CreatorAiGatewayService } from './creator-ai-gateway.service';
import { transcribeWithGemini } from './creator-gemini-transcription';

jest.mock('./creator-gemini-transcription', () => ({
  transcribeWithGemini: jest.fn(),
}));

const transcription = {
  data: { text: 'សួស្តី', segments: [{ start: 0, end: 1, text: 'សួស្តី' }] },
  usage: {
    provider: 'GEMINI',
    model: 'gemini-3.5-transcribe',
    inputTokens: null,
    cachedInputTokens: null,
    outputTokens: null,
    audioSeconds: 1,
    estimatedProviderCostUsd: 0.005 / 60,
    providerRequestId: 'interaction-1',
    durationMs: 10,
  },
};

describe('Creator transcription provider switch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('uses Gemini without an OpenAI key when AI_USE_GEMINI=true', async () => {
    (transcribeWithGemini as jest.Mock).mockResolvedValue(transcription);
    const gateway = new CreatorAiGatewayService({
      get: (key: string) =>
        ({
          AI_USE_GEMINI: 'true',
          GEMINI_API_KEY: 'test-gemini-key',
        })[key],
    } as ConfigService);

    await expect(
      gateway.transcribe(
        AiFeature.VIDEO_SUBTITLE,
        'request-1',
        '/audio.mp3',
        1,
      ),
    ).resolves.toEqual(transcription);
    expect(transcribeWithGemini).toHaveBeenCalledWith(
      'test-gemini-key',
      'gemini-3.5-transcribe',
      '/audio.mp3',
      'audio/mp3',
      1,
      'KHMER',
      0.005,
    );
  });

  it('uses OpenAI transcription when AI_USE_GEMINI=false', async () => {
    const gateway = new CreatorAiGatewayService({
      get: (key: string) =>
        ({
          AI_ENABLED: 'true',
          AI_USE_GEMINI: 'false',
          GEMINI_API_KEY: 'test-gemini-key',
          OPENAI_TRANSCRIPTION_MODEL: 'whisper-1',
        })[key],
    } as ConfigService);

    await expect(
      gateway.transcribe(
        AiFeature.VIDEO_SUBTITLE,
        'request-2',
        'api/package.json',
        1,
      ),
    ).rejects.toBeDefined();
    expect(transcribeWithGemini).not.toHaveBeenCalled();
  });
});
