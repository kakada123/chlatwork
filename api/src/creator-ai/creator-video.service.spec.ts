import type { ConfigService } from '@nestjs/config';
import { AiFeature, AiVideoJobStatus, type AiVideoJob } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreatorAiGatewayService } from './creator-ai-gateway.service';
import type { CreatorCreditsService } from './creator-credits.service';
import type { CreatorPlanLimitsService } from './creator-plan-limits.service';
import type { CreatorPricingService } from './creator-pricing.service';
import { CreatorVideoService } from './creator-video.service';
import type { CreatorVideoToolsService } from './creator-video-tools.service';
import { CreatorVideoWorker } from './creator-video.worker';

const usage = {
  provider: 'OPENAI' as const,
  model: 'test-model',
  inputTokens: 10,
  cachedInputTokens: 0,
  outputTokens: 20,
  audioSeconds: null,
  estimatedProviderCostUsd: 0.001,
  providerRequestId: 'provider-request',
  durationMs: 10,
};

const job: AiVideoJob & { generation: { inputSummary: string } } = {
  id: '11111111-1111-4111-8111-111111111111',
  generationId: '22222222-2222-4222-8222-222222222222',
  userId: '33333333-3333-4333-8333-333333333333',
  feature: AiFeature.VIDEO_CONTENT_PACK,
  status: AiVideoJobStatus.QUEUED,
  stage: 'QUEUED',
  originalName: 'video.mp4',
  mimeType: 'video/mp4',
  byteSize: 100n,
  durationSeconds: 61,
  tempFilePath: '/safe/video.mp4',
  attempts: 0,
  errorCode: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  startedAt: null,
  completedAt: null,
  generation: { inputSummary: 'Video Content Pack|KHMER|NATURAL' },
};

describe('Creator video ownership and processing', () => {
  it('only claims a queued video whose temporary upload is locally readable', async () => {
    const inaccessible = {
      ...job,
      id: '44444444-4444-4444-8444-444444444444',
      tempFilePath: '/another-instance/video.mp4',
    };
    const prisma = {
      aiVideoJob: {
        findMany: jest.fn().mockResolvedValue([inaccessible, job]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const tools = {
      exists: jest.fn((path: string) =>
        Promise.resolve(path === job.tempFilePath),
      ),
    };
    const worker = new CreatorVideoWorker(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
      {} as CreatorAiGatewayService,
      {} as CreatorCreditsService,
      tools as unknown as CreatorVideoToolsService,
    );

    await expect(
      (
        worker as unknown as { claimNext(): Promise<AiVideoJob | null> }
      ).claimNext(),
    ).resolves.toMatchObject({ id: job.id });
    expect(prisma.aiVideoJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: job.id, status: AiVideoJobStatus.QUEUED },
      }),
    );
  });

  it('does not reveal another user video job', async () => {
    const prisma = {
      aiVideoJob: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const credits = { getBalance: jest.fn() };
    const service = new CreatorVideoService(
      prisma as unknown as PrismaService,
      credits as unknown as CreatorCreditsService,
      {} as CreatorPricingService,
      {} as CreatorPlanLimitsService,
      {} as CreatorVideoToolsService,
    );
    await expect(
      service.getJob('user-a', '11111111-1111-4111-8111-111111111111'),
    ).rejects.toMatchObject({ response: { code: 'AI_JOB_NOT_FOUND' } });
    expect(prisma.aiVideoJob.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-a' }),
      }),
    );
  });

  it.each(['video/mp4', 'audio/mp4'])(
    'transcribes %s Content Pack once and reuses that transcript downstream',
    async (mimeType) => {
      const prisma = {
        aiVideoJob: {
          update: jest.fn().mockResolvedValue(job),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      const gateway = {
        transcribe: jest.fn().mockResolvedValue({
          data: {
            text: 'សួស្តីអ្នកទាំងអស់គ្នា',
            segments: [{ start: 0, end: 3.2, text: 'សួស្តីអ្នកទាំងអស់គ្នា' }],
          },
          usage,
        }),
        generateStructured: jest.fn(
          (
            _feature: AiFeature,
            _requestId: string,
            spec: { name: string; input: string },
          ) => {
            if (spec.name === 'khmer_transcript_cleanup') {
              return Promise.resolve({ data: ['សួស្តីអ្នកទាំងអស់គ្នា។'], usage });
            }
            expect(spec.input).toContain('សួស្តីអ្នកទាំងអស់គ្នា។');
            return Promise.resolve({
              data: {
                title: 'Content Pack',
                sections: [
                  { id: 'caption', label: 'Caption', content: 'Caption' },
                ],
              },
              usage,
            });
          },
        ),
      };
      const credits = {
        markProcessing: jest.fn(),
        complete: jest.fn(),
        refund: jest.fn(),
      };
      const tools = {
        extractAudio: jest.fn().mockResolvedValue('/safe/audio.mp3'),
        srt: jest.fn().mockReturnValue('valid-srt'),
        remove: jest.fn(),
      };
      const worker = new CreatorVideoWorker(
        prisma as unknown as PrismaService,
        { get: jest.fn() } as unknown as ConfigService,
        gateway as unknown as CreatorAiGatewayService,
        credits as unknown as CreatorCreditsService,
        tools as unknown as CreatorVideoToolsService,
      );
      await (
        worker as unknown as {
          process(value: typeof job): Promise<void>;
        }
      ).process({ ...job, mimeType });

      expect(tools.extractAudio).toHaveBeenCalledWith(
        job.tempFilePath,
        job.durationSeconds,
        mimeType.startsWith('audio/'),
      );
      expect(gateway.transcribe).toHaveBeenCalledTimes(1);
      expect(gateway.transcribe).toHaveBeenCalledWith(
        job.feature,
        `${job.generationId}:transcription`,
        '/safe/audio.mp3',
        job.durationSeconds,
        'KHMER',
      );
      expect(gateway.generateStructured).toHaveBeenCalledTimes(2);
      expect(credits.complete).toHaveBeenCalledWith(
        job.generationId,
        expect.objectContaining({ srt: 'valid-srt' }),
        expect.any(Object),
      );
      expect(credits.refund).not.toHaveBeenCalled();
    },
  );

  it('refunds a reserved video job when FFmpeg processing fails', async () => {
    const prisma = {
      aiVideoJob: {
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const credits = {
      markProcessing: jest.fn(),
      complete: jest.fn(),
      refund: jest.fn(),
    };
    const tools = {
      extractAudio: jest.fn().mockRejectedValue(new Error('ffmpeg failed')),
      remove: jest.fn(),
    };
    const worker = new CreatorVideoWorker(
      prisma as unknown as PrismaService,
      { get: jest.fn() } as unknown as ConfigService,
      {} as CreatorAiGatewayService,
      credits as unknown as CreatorCreditsService,
      tools as unknown as CreatorVideoToolsService,
    );
    await (
      worker as unknown as {
        process(value: typeof job): Promise<void>;
      }
    ).process(job);
    expect(credits.refund).toHaveBeenCalledWith(
      job.generationId,
      'AI_GENERATION_FAILED',
      undefined,
    );
    expect(credits.complete).not.toHaveBeenCalled();
  });
});

describe('Creator audio job admission', () => {
  const file = {
    path: '/safe/audio.m4a',
    mimetype: 'audio/mp4',
    originalname: 'audio.m4a',
    filename: 'random.m4a',
    size: 100,
  };
  function setup() {
    const prisma = {
      aiVideoJob: {
        create: jest
          .fn()
          .mockResolvedValue({ ...job, mimeType: file.mimetype }),
      },
    };
    const credits = {
      validateIdempotencyKey: jest.fn().mockReturnValue('request-key'),
      reserve: jest
        .fn()
        .mockResolvedValue({
          kind: 'created',
          generation: { id: job.generationId, creditCost: 10 },
          balance: 10,
        }),
      refund: jest.fn(),
    };
    const pricing = { video: jest.fn().mockReturnValue(10) };
    const plans = {
      forUser: jest
        .fn()
        .mockReturnValue({ maxVideoBytes: 1000, maxVideoSeconds: 180 }),
    };
    const tools = {
      validateMagic: jest.fn().mockResolvedValue(true),
      duration: jest.fn().mockResolvedValue(61),
      hashFile: jest.fn().mockResolvedValue('audio-hash'),
      safeOriginalName: jest.fn().mockReturnValue(file.originalname),
      remove: jest.fn(),
    };
    const service = new CreatorVideoService(
      prisma as unknown as PrismaService,
      credits as unknown as CreatorCreditsService,
      pricing as unknown as CreatorPricingService,
      plans as unknown as CreatorPlanLimitsService,
      tools as unknown as CreatorVideoToolsService,
    );
    return { prisma, credits, pricing, tools, service };
  }

  it('uses server-verified audio duration with the existing reservation and job contract', async () => {
    const { service, tools, pricing, credits, prisma } = setup();
    await service.createJob(job.userId, job.feature, 'request-key', {}, file);
    expect(tools.duration).toHaveBeenCalledWith(file.path, 'audio/mp4');
    expect(pricing.video).toHaveBeenCalledWith(job.feature, 61);
    expect(credits.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ credits: 10, isVideo: true }),
    );
    expect(prisma.aiVideoJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mimeType: 'audio/mp4',
          durationSeconds: 61,
        }),
      }),
    );
    expect(tools.remove).not.toHaveBeenCalled();
  });

  it.each([
    'empty',
    'oversize',
    'signature',
    'stream',
    'duration',
    'idempotency',
  ])(
    'rejects %s failures before reserving credits and removes the upload',
    async (failure) => {
      const { service, tools, credits, prisma } = setup();
      const upload = { ...file };
      if (failure === 'empty') upload.size = 0;
      if (failure === 'oversize') upload.size = 1001;
      if (failure === 'signature') tools.validateMagic.mockResolvedValue(false);
      if (failure === 'stream')
        tools.duration.mockRejectedValue(new Error('no audio'));
      if (failure === 'duration') tools.duration.mockResolvedValue(181);
      if (failure === 'idempotency')
        credits.validateIdempotencyKey.mockImplementation(() => {
          throw new Error('invalid key');
        });
      await expect(
        service.createJob(job.userId, job.feature, 'request-key', {}, upload),
      ).rejects.toThrow();
      expect(credits.reserve).not.toHaveBeenCalled();
      expect(prisma.aiVideoJob.create).not.toHaveBeenCalled();
      expect(tools.remove).toHaveBeenCalledWith(file.path);
    },
  );
});
