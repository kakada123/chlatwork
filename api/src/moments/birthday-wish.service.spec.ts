import { ServiceUnavailableException } from '@nestjs/common';
import { AiFeature } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BirthdayWishService } from './birthday-wish.service';
import {
  buildBirthdayWishPrompt,
  parseBirthdayWish,
} from './birthday-wish-prompt';
import { GenerateBirthdayWishDto } from './dto/generate-birthday-wish.dto';

const input: GenerateBirthdayWishDto = {
  recipientName: 'Sophea',
  relationship: 'coworker',
  tone: 'warm and professional',
  language: 'en',
  context: 'Thank them for helping our team.',
};
const english = {
  title: 'Happy birthday, Sophea!',
  message: 'Wishing you a wonderful birthday and a year full of happiness.',
  secretMessage: 'Thank you for always supporting our team.',
};
const khmer = {
  title: 'រីករាយថ្ងៃកំណើត Sophea!',
  message: 'សូមជូនពរឱ្យអ្នកមានសុខភាពល្អ និងសុភមង្គលជានិច្ច។',
  secretMessage: 'អរគុណសម្រាប់ការជួយក្រុមរបស់យើង។',
};

describe('birthday wish validation and prompt', () => {
  it('accepts either emoji preference, preserves older requests, and rejects non-booleans', async () => {
    for (const includeEmojis of [true, false, undefined]) {
      expect(await validate(plainToInstance(GenerateBirthdayWishDto, { ...input, includeEmojis }))).toEqual([]);
    }
    for (const includeEmojis of ['false', 0, {}, []]) {
      expect((await validate(plainToInstance(GenerateBirthdayWishDto, { ...input, includeEmojis }))).length).toBeGreaterThan(0);
    }
  });

  it('uses the emoji choice in both language prompts and rejects added emoji when disabled', () => {
    for (const language of ['en', 'km'] as const) {
      const plain = buildBirthdayWishPrompt({ ...input, language, includeEmojis: false });
      expect(plain.instructions).toContain('Do not add any emojis');
      const withEmoji = buildBirthdayWishPrompt({ ...input, language, includeEmojis: true });
      expect(withEmoji.instructions).toContain('Include a few');
    }
    const plain = buildBirthdayWishPrompt({ ...input, includeEmojis: false });
    expect(plain.parse(english)).toEqual(english);
    for (const emoji of ['🎉', '❤️', '👩🏽‍💻', '🇰🇭', '1️⃣']) {
      expect(() => plain.parse({ ...english, title: `${english.title} ${emoji}` })).toThrow();
    }
    expect(buildBirthdayWishPrompt({ ...input, includeEmojis: true }).parse({ ...english, title: `${english.title} 🎉` }).title).toContain('🎉');
  });
  it('accepts bounded freeform relationships, tones and optional context', async () => {
    expect(
      await validate(plainToInstance(GenerateBirthdayWishDto, input)),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(GenerateBirthdayWishDto, {
          ...input,
          context: undefined,
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    { recipientName: '   ' },
    { recipientName: 'x'.repeat(81) },
    { relationship: '' },
    { relationship: 'x'.repeat(121) },
    { tone: '\n\t' },
    { tone: 'x'.repeat(121) },
    { language: 'th' },
    { context: 'x'.repeat(1001) },
  ])('rejects invalid request fields: %o', async (change) => {
    expect(
      (
        await validate(
          plainToInstance(GenerateBirthdayWishDto, { ...input, ...change }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it('creates structured input with explicit birthday, language and privacy rules', () => {
    const prompt = buildBirthdayWishPrompt(input);
    expect(JSON.parse(prompt.input)).toEqual(input);
    expect(prompt.instructions).toContain('birthday');
    expect(prompt.instructions).toContain('English');
    expect(prompt.instructions).toContain('untrusted data');
    expect(prompt.instructions).toContain('secretMessage');
    expect(prompt.schema.additionalProperties).toBe(false);
    expect(prompt.schema.required).toEqual([
      'title',
      'message',
      'secretMessage',
    ]);
  });

  it('parses all fields without translating recipient names', () => {
    expect(parseBirthdayWish(english, 'en', 'Sophea')).toEqual(english);
    expect(parseBirthdayWish(khmer, 'km', 'Sophea')).toEqual(khmer);
    expect(
      parseBirthdayWish(
        { ...english, title: 'Happy birthday សុភា!' },
        'en',
        'សុភា',
      ).title,
    ).toContain('សុភា');
    expect(parseBirthdayWish({ ...english, title: 'Happy birthday สมชาย!' }, 'en', 'สมชาย').title).toContain('สมชาย');
  });

  it.each([
    null,
    [],
    {},
    { ...english, message: '' },
    { ...english, secretMessage: 42 },
    { ...english, title: 'x'.repeat(121) },
    { ...english, message: 'x'.repeat(3001) },
    { ...english, secretMessage: 'x'.repeat(1501) },
    { ...english, extra: 'unexpected' },
    { ...english, message: 'สุขสันต์วันเกิด' },
    { ...english, message: '生日快乐' },
    khmer,
  ])('rejects malformed or wrong-language English output: %o', (value) => {
    expect(() => parseBirthdayWish(value, 'en', input.recipientName)).toThrow();
  });

  it('requires Khmer prose in every Khmer field while allowing the recipient name', () => {
    expect(() =>
      parseBirthdayWish(english, 'km', input.recipientName),
    ).toThrow();
    expect(() =>
      parseBirthdayWish(
        { ...khmer, message: english.message },
        'km',
        input.recipientName,
      ),
    ).toThrow();
    expect(() =>
      parseBirthdayWish(
        { ...khmer, message: `${khmer.message} Happy birthday and good luck.` },
        'km',
        input.recipientName,
      ),
    ).toThrow();
  });
});

describe('BirthdayWishService', () => {
  const gateway = { generateStructured: jest.fn() };
  const service = new BirthdayWishService(gateway as never);
  beforeEach(() => gateway.generateStructured.mockReset());

  it('uses the existing configured gateway and returns only the validated wish', async () => {
    gateway.generateStructured.mockResolvedValue({
      data: english,
      usage: { providerRequestId: 'private-id' },
    });
    await expect(service.generate(input)).resolves.toEqual(english);
    expect(gateway.generateStructured).toHaveBeenCalledWith(
      AiFeature.POST,
      expect.stringMatching(/^birthday-wish:/),
      expect.objectContaining({ name: 'birthday_wish' }),
    );
  });

  it('returns a generic safe failure without provider errors or input', async () => {
    gateway.generateStructured.mockRejectedValue(
      new Error('sensitive provider response and personal input'),
    );
    await expect(service.generate(input)).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(service.generate(input)).rejects.toThrow(
      'Birthday wish generation is unavailable. Please try again later.',
    );
  });
});

describe('birthday wish endpoint protection', () => {
  it('requires JWT authentication and limits generation to three requests a minute', async () => {
    const { GUARDS_METADATA, HEADERS_METADATA, PATH_METADATA } =
      await import('@nestjs/common/constants');
    const { JwtAuthGuard } = await import('../auth/jwt-auth.guard');
    const { BirthdayWishRateLimitGuard } = await import('./birthday-wish-rate-limit.guard');
    const { MomentsController } = await import('./moments.controller');
    const handler = MomentsController.prototype.generateBirthdayWish;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('birthday-wish');
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([JwtAuthGuard, BirthdayWishRateLimitGuard]);
    expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toContainEqual({
      name: 'Cache-Control',
      value: 'no-store',
    });
  });
});
