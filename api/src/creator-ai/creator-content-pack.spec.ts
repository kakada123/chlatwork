import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import OpenAI from 'openai';
import { CreatorAiGatewayService } from './creator-ai-gateway.service';
import { buildVideoContentPrompt } from './creator-prompts';
import { assertVideoLanguage } from './creator-video-language';

const khmer = 'សួស្តីអ្នកទាំងអស់គ្នា។';
const pack = () => ({
  captions: { facebook: khmer, tiktok: khmer, instagram: khmer },
  hooks: [khmer],
  hashtags: ['#សួស្តី'],
  title: khmer,
  cta: khmer,
  summary: khmer,
  keyPoints: [khmer],
});
const prompt = () =>
  buildVideoContentPrompt(AiFeature.VIDEO_CONTENT_PACK, khmer, {
    language: 'KHMER',
  });
const response = (value: unknown) => ({
  id: 'response-id',
  status: 'completed',
  output: [],
  output_text: JSON.stringify(value),
  usage: {
    input_tokens: 50,
    output_tokens: 100,
    input_tokens_details: { cached_tokens: 10 },
  },
});
function setup() {
  const gateway = new CreatorAiGatewayService({
    get: (key: string) =>
      ({
        AI_ENABLED: 'true',
        OPENAI_TEXT_MODEL: 'gpt-6-astra',
        OPENAI_PREMIUM_OUTPUT_USD_PER_1M: 50,
      })[key],
  } as ConfigService);
  const create = jest.fn();
  Object.assign(gateway, { client: { responses: { create } } });
  const generate = () =>
    gateway.generateStructured(
      AiFeature.VIDEO_CONTENT_PACK,
      'job:content',
      prompt(),
    );
  return { create, generate };
}

describe('Creator content pack validation and bounded recovery', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [
      { ...pack(), captions: 'private malformed content' },
      'captions',
      'EXPECTED_OBJECT',
    ],
    [
      { ...pack(), captions: { ...pack().captions, tiktok: '  ' } },
      'captions.tiktok',
      'EMPTY_TEXT',
    ],
    [{ ...pack(), title: undefined }, 'title', 'EXPECTED_TEXT'],
    [
      { ...pack(), hooks: 'private malformed content' },
      'hooks',
      'EXPECTED_LIST',
    ],
    [
      { ...pack(), hashtags: Array(21).fill('#hello') },
      'hashtags',
      'LIST_TOO_LONG',
    ],
    [{ ...pack(), summary: 'a'.repeat(5001) }, 'summary', 'TEXT_TOO_LONG'],
  ])(
    'identifies invalid content-pack fields %# without retaining their text',
    (value, field, issue) => {
      expect(() => prompt().parse(value)).toThrow(
        expect.objectContaining({
          field,
          issue,
          message: 'Creator result field failed validation',
        }),
      );
    },
  );

  it('uses Unicode code-point limits consistently with the requested JSON schema', () => {
    expect(() =>
      prompt().parse({ ...pack(), title: '🎉'.repeat(300) }),
    ).not.toThrow();
    expect(() =>
      prompt().parse({ ...pack(), title: '🎉'.repeat(301) }),
    ).toThrow(
      expect.objectContaining({ field: 'title', issue: 'TEXT_TOO_LONG' }),
    );
  });

  it('regenerates once from the original transcript and accounts for both responses', async () => {
    const { create, generate } = setup();
    create
      .mockResolvedValueOnce(
        response({ ...pack(), captions: 'private malformed content' }),
      )
      .mockResolvedValueOnce(response(pack()));
    const result = await generate();
    expect(result.data.sections).toHaveLength(7);
    expect(result.usage).toMatchObject({
      inputTokens: 100,
      cachedInputTokens: 20,
      outputTokens: 200,
      estimatedProviderCostUsd: 0.01,
    });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].input).toBe(prompt().input);
    expect(create.mock.calls[1][0].instructions).toContain(
      'captions: EXPECTED_OBJECT',
    );
    expect(create.mock.calls[1][1].headers['X-Client-Request-Id']).toBe(
      'job:content:validation-retry',
    );
    expect(JSON.stringify(create.mock.calls)).not.toContain(
      'private malformed content',
    );
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        validationField: 'captions',
        validationIssue: 'EXPECTED_OBJECT',
      }),
    );
    expect(
      JSON.stringify((Logger.prototype.error as jest.Mock).mock.calls),
    ).not.toContain('private malformed content');
  });

  it('stops after two invalid results and preserves both attempts for refund accounting', async () => {
    const { create, generate } = setup();
    create.mockResolvedValue(response({ ...pack(), title: '' }));
    await expect(generate()).rejects.toMatchObject({
      usage: { outputTokens: 200, estimatedProviderCostUsd: 0.01 },
      structuredFailure: {
        validation: { field: 'title', issue: 'EMPTY_TEXT' },
      },
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('retains the first billed response when the second attempt has a network failure', async () => {
    const { create, generate } = setup();
    create
      .mockResolvedValueOnce(response({}))
      .mockRejectedValueOnce(new OpenAI.APIConnectionTimeoutError());
    await expect(generate()).rejects.toMatchObject({
      usage: { outputTokens: 100, estimatedProviderCostUsd: 0.005 },
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      ...response(pack()),
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
    },
    { ...response(pack()), output_text: '{' },
    {
      ...response(pack()),
      output: [
        { type: 'message', content: [{ type: 'refusal', refusal: 'private' }] },
      ],
    },
  ])('does not retry other response failures %#', async (value) => {
    const { create, generate } = setup();
    create.mockResolvedValue(value);
    await expect(generate()).rejects.toThrow();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('does not retry an initial HTTP or network failure', async () => {
    for (const error of [
      { status: 400 },
      new OpenAI.APIConnectionTimeoutError(),
    ]) {
      const { create, generate } = setup();
      create.mockRejectedValue(error);
      await expect(generate()).rejects.toThrow();
      expect(create).toHaveBeenCalledTimes(1);
    }
  });

  it('still rejects a single Thai character after successful schema recovery', async () => {
    const { create, generate } = setup();
    create
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({ ...pack(), title: `${khmer}\u0e01` }));
    const result = await generate();
    expect(() =>
      assertVideoLanguage(
        result.data.sections.map((section) => section.content),
        'KHMER',
      ),
    ).toThrow();
    expect(create).toHaveBeenCalledTimes(2);
  });
});
