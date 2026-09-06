import { AiFeature, AiVideoJobStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreatorAiGatewayService } from './creator-ai-gateway.service';
import { assertVideoLanguage } from './creator-video-language';
import {
  buildTranscriptCleanupPrompt,
  buildVideoContentPrompt,
} from './creator-prompts';
import {
  CreatorVideoWorker,
  preserveTranscriptTiming,
} from './creator-video.worker';
import type { CreatorLanguage } from './dto/creator-ai.dto';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  createReadStream: jest.fn().mockImplementation(() => ({ destroy: jest.fn() })),
}));

const khmer = 'សួស្តីអ្នកទាំងអស់គ្នា។';
const thai = 'บรรยายธรรมอิสลาม';
const segments = [{ start: 1.2, end: 3.6, text: khmer }];

describe('Creator video language handling', () => {
  it.each<CreatorLanguage>(['KHMER', 'KHMER_ENGLISH', 'ENGLISH'])(
    'passes the appropriate source hint for %s',
    async (language) => {
      const config = {
        get: (key: string) =>
          ({ AI_ENABLED: 'true', OPENAI_TRANSCRIPTION_MODEL: 'whisper-1' })[
            key
          ],
      };
      const gateway = new CreatorAiGatewayService(config as ConfigService);
      const create = jest.fn().mockResolvedValue({ text: khmer, segments });
      Object.assign(gateway, {
        client: { audio: { transcriptions: { create } } },
      });
      await gateway.transcribe(
        AiFeature.VIDEO_CONTENT_PACK,
        'request',
        '/mock/audio.mp3',
        4,
        language,
      );
      const request = create.mock.calls[0][0];
      expect(request.response_format).toBe('verbose_json');
      expect(request.timestamp_granularities).toEqual(['segment']);
      if (language === 'ENGLISH')
        expect(request).not.toHaveProperty('language');
      else {
        expect(request.language).toBe('km');
        expect(request.prompt).toContain('ភាសាខ្មែរ');
      }
    },
  );

  it('rejects Thai or English-only output for Khmer while preserving natural mixed terms', () => {
    expect(() => assertVideoLanguage([thai], 'KHMER')).toThrow();
    expect(() => assertVideoLanguage([khmer, thai], 'KHMER_ENGLISH')).toThrow();
    expect(() => assertVideoLanguage(['Hello everyone'], 'KHMER')).toThrow();
    expect(() =>
      assertVideoLanguage([`${khmer} iPhone 16 Pro`], 'KHMER'),
    ).not.toThrow();
    expect(() =>
      assertVideoLanguage(['Hello everyone'], 'KHMER_ENGLISH'),
    ).not.toThrow();
    expect(() =>
      assertVideoLanguage(['Hello everyone'], 'ENGLISH'),
    ).not.toThrow();
  });

  it('preserves timestamps and prevents cleanup from substituting Thai text', () => {
    const prompt = buildTranscriptCleanupPrompt(segments, 'KHMER');
    expect(() => prompt.parse({ texts: [thai] })).toThrow();
    const cleaned = prompt.parse({ texts: [`${khmer} iPhone`] });
    expect(preserveTranscriptTiming(segments, cleaned)).toEqual([
      { start: 1.2, end: 3.6, text: `${khmer} iPhone` },
    ]);
    expect(
      buildTranscriptCleanupPrompt(segments, 'ENGLISH').parse({
        texts: ['Hello everyone.'],
      }),
    ).toEqual(['Hello everyone.']);
    expect(
      buildVideoContentPrompt(AiFeature.VIDEO_CONTENT_PACK, khmer, {
        language: 'KHMER',
      }).instructions,
    ).toContain('Khmer script');
  });

  it.each(['transcription', 'cleanup', 'content'])(
    'refunds a Thai-script %s response and never completes the job',
    async (failureStage) => {
      const usage = {
        provider: 'OPENAI',
        model: 'test',
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        audioSeconds: 4,
        estimatedProviderCostUsd: 0.01,
        providerRequestId: null,
        durationMs: 1,
      };
      const gateway = {
        transcribe: jest
          .fn()
          .mockResolvedValue({
            data: {
              text: khmer,
              segments: [
                {
                  ...segments[0],
                  text: failureStage === 'transcription' ? thai : khmer,
                },
              ],
            },
            usage,
          }),
        generateStructured: jest.fn(async (_feature, _id, spec) => ({
          data:
            spec.name === 'khmer_transcript_cleanup'
              ? [failureStage === 'cleanup' ? thai : khmer]
              : {
                  title: 'Content Pack',
                  sections: [
                    { id: 'caption', label: 'Caption', content: thai },
                  ],
                },
          usage,
        })),
      };
      const credits = {
        markProcessing: jest.fn(),
        refund: jest.fn(),
        complete: jest.fn(),
      };
      const prisma = {
        aiVideoJob: { update: jest.fn(), updateMany: jest.fn() },
      };
      const tools = {
        extractAudio: jest.fn().mockResolvedValue('/mock/audio.mp3'),
        srt: jest.fn().mockReturnValue('srt'),
        remove: jest.fn(),
      };
      const worker = new CreatorVideoWorker(
        prisma as any,
        {} as ConfigService,
        gateway as any,
        credits as any,
        tools as any,
      );
      await (worker as any).process({
        id: 'job',
        generationId: 'generation',
        userId: 'user',
        feature: AiFeature.VIDEO_CONTENT_PACK,
        tempFilePath: '/mock/input.m4a',
        durationSeconds: 4,
        mimeType: 'audio/mp4',
        generation: { inputSummary: 'Video Content Pack|KHMER|NATURAL' },
      });
      expect(credits.complete).not.toHaveBeenCalled();
      expect(credits.refund).toHaveBeenCalledWith(
        'generation',
        'AI_GENERATION_FAILED',
        expect.objectContaining({
          estimatedProviderCostUsd: expect.any(Number),
        }),
      );
      expect(prisma.aiVideoJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: AiVideoJobStatus.FAILED }),
        }),
      );
      expect(gateway.generateStructured).toHaveBeenCalledTimes(
        failureStage === 'transcription'
          ? 0
          : failureStage === 'cleanup'
            ? 1
            : 2,
      );
      expect(tools.remove).toHaveBeenCalledWith('/mock/input.m4a');
    },
  );
});
