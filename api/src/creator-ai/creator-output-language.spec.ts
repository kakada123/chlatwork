import { AiVideoJobStatus } from '@prisma/client';
import { containsThaiScript } from './creator-output-language';
import { CreatorCreditsService } from './creator-credits.service';
import { CreatorVideoService } from './creator-video.service';
import { CreatorGenerationService } from './creator-generation.service';

const mark = '\u0E01';
const safe = {
  title: 'Content pack',
  sections: [
    { id: 'subtitle', label: 'Subtitle', content: 'សួស្តី iPhone 16 😀' },
  ],
  srt: '1\n00:00:01,000 --> 00:00:02,000\nសួស្តី',
};
const cases = [
  { ...safe, title: mark },
  { ...safe, sections: [{ ...safe.sections[0], label: mark }] },
  { ...safe, sections: [{ ...safe.sections[0], id: mark }] },
  { ...safe, sections: [{ ...safe.sections[0], content: `សួស្តី${mark}` }] },
  { ...safe, items: [{ id: 'idea', title: mark, content: 'សួស្តី' }] },
  {
    ...safe,
    items: [
      { id: 'idea', title: 'Idea', content: 'សួស្តី', description: mark },
    ],
  },
  { ...safe, srt: `${safe.srt}${mark}` },
];

describe('Creator output script boundaries', () => {
  it('rejects every code point in the Thai block, even one isolated digit, mark, or currency symbol', () => {
    for (let code = 0x0e00; code <= 0x0e7f; code++) {
      expect(
        containsThaiScript(`សួស្តី${String.fromCodePoint(code)}Hello`),
      ).toBe(true);
    }
    expect(containsThaiScript(safe)).toBe(false);
    expect(containsThaiScript(JSON.parse('{"text":"\\u0e01"}'))).toBe(true);
  });

  it.each(cases)(
    'blocks unsupported text anywhere before entering the credit completion transaction %#',
    async (result) => {
      const prisma = { $transaction: jest.fn() };
      const service = new CreatorCreditsService(
        prisma as any,
        {} as any,
        {} as any,
        {} as any,
      );
      await expect(
        service.complete('generation', result, {} as any),
      ).rejects.toThrow('unsupported script');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('filters old unsafe history without updating or deleting stored records', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'safe', result: safe },
      { id: 'old', result: cases[0] },
    ]);
    const service = new CreatorCreditsService(
      { aiGeneration: { findMany } } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    expect(await service.history('owner')).toEqual([
      { id: 'safe', result: safe },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'owner', status: 'COMPLETED' },
      }),
    );
  });

  it.each(['poll', 'subtitles', 'videoReplay', 'textReplay'])(
    'blocks old stored output through %s',
    async (boundary) => {
      const result = cases[6];
      const job = {
        id: 'job',
        generationId: 'generation',
        status: AiVideoJobStatus.COMPLETED,
        originalName: 'clip.mp4',
        generation: { result, creditCost: 7 },
      };
      const service = new CreatorVideoService(
        { aiVideoJob: { findFirst: jest.fn().mockResolvedValue(job) } } as any,
        { getBalance: jest.fn().mockResolvedValue({ balance: 13 }) } as any,
        {} as any,
        {} as any,
        {} as any,
      );
      const call = async () => {
        if (boundary === 'poll') return service.getJob('owner', 'job');
        if (boundary === 'subtitles') return service.subtitles('owner', 'job');
        if (boundary === 'videoReplay')
          return (service as any).jobResponse(job, 13, result, 7);
        const text = new CreatorGenerationService(
          {} as any,
          {} as any,
          {} as any,
        );
        return (text as any).existingResponse({
          generation: { status: 'COMPLETED', result },
          balance: 13,
        });
      };
      await expect(call()).rejects.toMatchObject({
        response: { code: 'AI_OUTPUT_LANGUAGE_REJECTED' },
      });
    },
  );

  it('uses a neutral export filename when the original upload name contains unsupported script', async () => {
    const job = { originalName: `${mark}.m4a`, generation: { result: safe } };
    const service = new CreatorVideoService(
      { aiVideoJob: { findFirst: jest.fn().mockResolvedValue(job) } } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    expect(await service.subtitles('owner', 'job')).toEqual({
      filename: 'chlatwork-subtitles.srt',
      content: safe.srt,
    });
  });
});
