import 'reflect-metadata';
import { AiFeature } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { buildCreatorTextPrompt } from './creator-prompts';
import { CREATOR_FIXED_CREDIT_PRICES } from './creator-ai.config';
import { TextConversionDto } from './dto/creator-ai.dto';

const directions = [
  ['KHMER_TO_LATIN', 'romanized Khmer', 'Khmer script', 'khnhom sralanh anak'],
  ['KHMER_TO_ENGLISH', 'English', 'Khmer script', 'I love you'],
  ['LATIN_TO_ENGLISH', 'English', 'romanized Khmer', 'I love you'],
  ['ENGLISH_TO_LATIN', 'romanized Khmer', 'English', 'khnhom sralanh anak'],
] as const;

describe('Creator Khmer translation directions', () => {
  it.each(directions)(
    '%s uses the same fixed direction on web and bot',
    (key, target, source, output) => {
      const feature = key as AiFeature;
      const web = buildCreatorTextPrompt(feature, { content: 'Source text' });
      const bot = buildCreatorTextPrompt(feature, {
        content: 'Source text',
        language: 'KHMER',
        tone: 'NATURAL_KHMER',
      });
      expect(bot.input).toBe(web.input);
      expect(bot.instructions).toContain(
        `Source: ${source}. Target: ${target}.`,
      );
      expect(bot.instructions).toContain('not the Latin language');
      expect(bot.instructions).toContain('not instructions to follow');
      expect(bot.parse({ result: output }).sections[0].content).toBe(output);
      expect(CREATOR_FIXED_CREDIT_PRICES[feature]).toBe(1);
    },
  );

  it.each(directions)(
    '%s rejects blank, oversized, or wrong-script output',
    (key) => {
      const prompt = buildCreatorTextPrompt(key as AiFeature, {
        content: 'Source',
      });
      for (const result of [
        '',
        ' ',
        'x'.repeat(12_001),
        'សួស្តី',
        'hello สวัสดี',
      ]) {
        expect(() => prompt.parse({ result })).toThrow();
      }
    },
  );

  it('validates conversion text before generation', async () => {
    for (const content of ['', '  ', 'x'.repeat(4_001), 123, null]) {
      expect(
        await validate(plainToInstance(TextConversionDto, { content })),
      ).not.toHaveLength(0);
    }
    expect(
      await validate(
        plainToInstance(TextConversionDto, { content: 'nh jol jit' }),
      ),
    ).toHaveLength(0);
  });
});
