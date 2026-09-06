import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import { createReadStream } from 'node:fs';
import OpenAI from 'openai';
import { CreatorAiGatewayService } from './creator-ai-gateway.service';
import { transcriptionErrorDetails } from './creator-transcription-error';
import { CreatorVideoWorker } from './creator-video.worker';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  createReadStream: jest
    .fn()
    .mockImplementation(() => ({ destroy: jest.fn() })),
}));

const languageError = {
  status: 400,
  error: {
    param: 'language',
    code: 'unsupported_language',
    message: "Language 'km' is not supported.",
  },
};
const khmer = 'សួស្តីអ្នកទាំងអស់គ្នា។';
const response = { text: khmer, segments: [{ start: 0, end: 3, text: khmer }] };

function setup() {
  const config = {
    get: (key: string) =>
      ({ AI_ENABLED: 'true', OPENAI_TRANSCRIPTION_MODEL: 'whisper-1' })[key],
  };
  const gateway = new CreatorAiGatewayService(config as ConfigService);
  const create = jest.fn().mockResolvedValue(response);
  Object.assign(gateway, { client: { audio: { transcriptions: { create } } } });
  return {
    gateway,
    create,
    transcribe: () =>
      gateway.transcribe(
        AiFeature.VIDEO_CONTENT_PACK,
        'request',
        '/mock/audio.mp3',
        3,
        'KHMER',
      ),
  };
}

describe('Creator transcription diagnostics and bounded fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('retries an explicit Khmer hint rejection once with a fresh stream and the same Khmer prompt', async () => {
    const test = setup();
    test.create.mockRejectedValueOnce(languageError);
    const result = await test.transcribe();
    expect(result.data.text).toBe(khmer);
    expect(test.create).toHaveBeenCalledTimes(2);
    const first = test.create.mock.calls[0][0];
    const second = test.create.mock.calls[1][0];
    expect(first.language).toBe('km');
    expect(second).not.toHaveProperty('language');
    expect(second.prompt).toBe(first.prompt);
    expect(second.prompt).toContain('ភាសាខ្មែរ');
    expect(second.file).not.toBe(first.file);
    expect(second.response_format).toBe('verbose_json');
    expect(second.timestamp_granularities).toEqual(['segment']);
    expect(first.file.destroy).toHaveBeenCalledTimes(1);
    expect(second.file.destroy).toHaveBeenCalledTimes(1);
    expect(createReadStream).toHaveBeenCalledTimes(2);
    expect(test.create.mock.calls[1][1].maxRetries).toBe(0);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        providerFailureReason: 'LANGUAGE_HINT_UNSUPPORTED',
      }),
    );
  });

  it.each([
    { status: 400, param: 'file', code: 'invalid_audio' },
    { status: 400, param: 'prompt', code: 'invalid_value' },
    { status: 400, param: 'response_format', code: 'unsupported_value' },
    { status: 400, param: 'language', message: 'Bad request' },
    { status: 400, message: 'Bad request' },
    { status: 429, code: 'rate_limit_exceeded' },
    { status: 500, message: 'Language km is not supported' },
    new Error('Connection timed out'),
  ])('never retries unrelated or uncertain failure %j', async (error) => {
    const test = setup();
    test.create.mockRejectedValueOnce(error);
    await expect(test.transcribe()).rejects.toThrow(
      'OpenAI transcription failed',
    );
    expect(test.create).toHaveBeenCalledTimes(1);
  });

  it('stops after the second rejection rather than looping', async () => {
    const test = setup();
    test.create.mockRejectedValue(languageError);
    await expect(test.transcribe()).rejects.toThrow(
      'OpenAI transcription failed',
    );
    expect(test.create).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        languageHintUsed: false,
        providerFailureReason: 'LANGUAGE_HINT_UNSUPPORTED',
      }),
    );
  });

  it.each([
    [null, 'INVALID_TRANSCRIPTION_RESPONSE'],
    [{ text: 123 }, 'INVALID_TRANSCRIPTION_RESPONSE'],
    [{ text: '  ', segments: [] }, 'EMPTY_TRANSCRIPT'],
    [{ text: khmer }, 'MISSING_TIMESTAMPED_SEGMENTS'],
    [{ text: khmer, segments: [] }, 'MISSING_TIMESTAMPED_SEGMENTS'],
    [{ text: khmer, segments: {} }, 'INVALID_TRANSCRIPT_SEGMENTS'],
    [{ text: khmer, segments: [null] }, 'INVALID_TRANSCRIPT_SEGMENTS'],
    [
      { text: khmer, segments: [{ start: 0, end: 3, text: 123 }] },
      'INVALID_TRANSCRIPT_SEGMENTS',
    ],
    [
      {
        text: khmer,
        segments: [...response.segments, { start: -1, end: 3, text: khmer }],
      },
      'INVALID_TRANSCRIPT_SEGMENTS',
    ],
  ])(
    'distinguishes unusable response %# after hint fallback and retains billed audio usage',
    async (value, reason) => {
      const test = setup();
      test.create
        .mockRejectedValueOnce(languageError)
        .mockResolvedValueOnce(value);
      await expect(test.transcribe()).rejects.toMatchObject({
        usage: { audioSeconds: 3 },
      });
      expect(test.create).toHaveBeenCalledTimes(2);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseReceived: true,
          languageHintUsed: false,
          providerStatus: null,
          providerFailureReason: reason,
        }),
      );
      expect(
        JSON.stringify((Logger.prototype.error as jest.Mock).mock.calls),
      ).not.toContain(khmer);
    },
  );

  it.each([
    [new OpenAI.APIConnectionTimeoutError(), 'PROVIDER_TIMEOUT'],
    [
      new OpenAI.APIConnectionError({ message: 'private transcript' }),
      'PROVIDER_CONNECTION_ERROR',
    ],
    [{ code: 'ENOENT', path: '/private/audio.mp3' }, 'AUDIO_READ_FAILED'],
    [
      new SyntaxError('private provider text'),
      'PROVIDER_RESPONSE_PARSE_FAILED',
    ],
    [{ status: 503, message: 'private provider text' }, 'PROVIDER_HTTP_ERROR'],
  ])(
    'distinguishes request failure %# without another retry or logging private content',
    async (error, reason) => {
      const test = setup();
      test.create.mockRejectedValueOnce(error);
      await expect(test.transcribe()).rejects.toMatchObject({
        usage: undefined,
      });
      expect(test.create).toHaveBeenCalledTimes(1);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseReceived: false,
          transcriptCharacters: null,
          transcriptSegmentCount: null,
          providerFailureReason: reason,
        }),
      );
      expect(
        JSON.stringify((Logger.prototype.error as jest.Mock).mock.calls),
      ).not.toContain('private');
    },
  );

  it('classifies known language rejection wording without exposing provider text or arbitrary fields', () => {
    expect(
      transcriptionErrorDetails({
        status: 400,
        message: "Language 'km' is not supported.",
      }).providerFailureReason,
    ).toBe('LANGUAGE_HINT_UNSUPPORTED');
    expect(
      transcriptionErrorDetails({
        status: 400,
        param: 'file',
        message: "Language 'km' is not supported.",
      }).providerFailureReason,
    ).toBe('AUDIO_FILE_REJECTED');
    const diagnostics = transcriptionErrorDetails({
      status: 400,
      code: 'private-code-value',
      param: '/private/audio.mp3',
      message: 'private transcript and bearer token',
      error: { data: 'private data' },
    });
    expect(diagnostics).toEqual({
      providerStatus: 400,
      providerErrorCode: null,
      providerErrorParam: null,
      providerFailureReason: 'BAD_REQUEST_UNCLASSIFIED',
    });
  });

  it('keeps the worker Thai-script guard and refund path after the fallback', async () => {
    const test = setup();
    test.create.mockRejectedValueOnce(languageError).mockResolvedValueOnce({
      text: '\u0E01',
      segments: [{ start: 0, end: 3, text: '\u0E01' }],
    });
    const credits = {
      markProcessing: jest.fn(),
      complete: jest.fn(),
      refund: jest.fn(),
    };
    const worker = new CreatorVideoWorker(
      { aiVideoJob: { update: jest.fn(), updateMany: jest.fn() } } as any,
      {} as ConfigService,
      test.gateway,
      credits as any,
      {
        extractAudio: jest.fn().mockResolvedValue('/mock/audio.mp3'),
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
    expect(test.create).toHaveBeenCalledTimes(2);
    expect(credits.complete).not.toHaveBeenCalled();
    expect(credits.refund).toHaveBeenCalledTimes(1);
    expect(credits.refund).toHaveBeenCalledWith(
      'generation',
      'AI_GENERATION_FAILED',
      expect.any(Object),
    );
  });
});
