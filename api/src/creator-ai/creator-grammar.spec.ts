import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AiFeature } from '@prisma/client';
import type { CurrentUser } from '../auth/types';
import { CreatorAiController } from './creator-ai.controller';
import type { CreatorCreditsService } from './creator-credits.service';
import type { CreatorGenerationService } from './creator-generation.service';
import type { CreatorVideoUploadTicketService } from './creator-video-upload-ticket.service';
import { CorrectGrammarDto } from './dto/creator-ai.dto';
import { GrammarExtensionController } from './grammar-extension.controller';

describe('Grammar Correction API', () => {
  const user: CurrentUser = { id: 'test-user-id', role: 'USER' };
  let controller: CreatorAiController;
  let extensionController: GrammarExtensionController;
  let mockGenerationService: jest.Mocked<Partial<CreatorGenerationService>>;
  let mockCreditsService: jest.Mocked<Partial<CreatorCreditsService>>;
  let mockUploadTicketService: jest.Mocked<Partial<CreatorVideoUploadTicketService>>;

  beforeEach(() => {
    mockGenerationService = {
      generate: jest.fn().mockImplementation((userId, input) => {
        if (input.feature === AiFeature.KHMER_GRAMMAR) {
          const content = String(input.payload.content);
          const isCorrect = content === 'I have a meeting today.';
          return Promise.resolve({
            generationId: 'gen-123',
            data: {
              title: 'Corrected text',
              sections: [
                {
                  id: 'result',
                  label: 'Corrected text',
                  content: isCorrect
                    ? 'I have a meeting today.'
                    : 'I have a meeting today.',
                },
                {
                  id: 'corrections',
                  label: 'What changed',
                  content: isCorrect
                    ? 'No corrections needed.'
                    : '1. “has” → “have”\nUse have with the first person pronoun I.',
                },
              ],
            },
            usage: { creditsCharged: 1, creditsRemaining: 99 },
          });
        }
        if (input.feature === AiFeature.KHMER_REWRITE) {
          return Promise.resolve({
            generationId: 'gen-456',
            data: {
              title: 'Rewritten text',
              sections: [
                {
                  id: 'result',
                  label: 'Rewritten text',
                  content: 'I have an important business meeting scheduled today.',
                },
              ],
            },
            usage: { creditsCharged: 1, creditsRemaining: 99 },
          });
        }
        throw new Error(`Unexpected feature: ${input.feature}`);
      }),
    };

    mockCreditsService = {};
    mockUploadTicketService = {};

    controller = new CreatorAiController(
      mockGenerationService as unknown as CreatorGenerationService,
      mockCreditsService as unknown as CreatorCreditsService,
      mockUploadTicketService as unknown as CreatorVideoUploadTicketService,
    );
    extensionController = new GrammarExtensionController(controller);
  });

  it('corrects an English sentence with grammatical errors', async () => {
    const dto: CorrectGrammarDto = {
      text: 'I has meeting today.',
      mode: 'grammar',
      language: 'en',
    };
    const response = await controller.correct(user, undefined, dto);
    expect(response).toEqual({
      original: 'I has meeting today.',
      corrected: 'I have a meeting today.',
      changed: true,
    });
    expect(mockGenerationService.generate).toHaveBeenCalledWith(
      user.id,
      {
        feature: AiFeature.KHMER_GRAMMAR,
        payload: { content: 'I has meeting today.' },
        inputSummary: 'Grammar correction',
      },
      undefined,
    );
  });

  it('handles a sentence that is already grammatically correct', async () => {
    const dto: CorrectGrammarDto = {
      text: 'I have a meeting today.',
      mode: 'grammar',
      language: 'en',
    };
    const response = await controller.correct(user, undefined, dto);
    expect(response).toEqual({
      original: 'I have a meeting today.',
      corrected: 'I have a meeting today.',
      changed: false,
    });
  });

  it('routes polish mode to the rewrite service', async () => {
    const dto: CorrectGrammarDto = {
      text: 'I has meeting today.',
      mode: 'polish',
      language: 'en',
    };
    const response = await controller.correct(user, 'idemp-1', dto);
    expect(response).toEqual({
      original: 'I has meeting today.',
      corrected: 'I have an important business meeting scheduled today.',
      changed: true,
    });
    expect(mockGenerationService.generate).toHaveBeenCalledWith(
      user.id,
      {
        feature: AiFeature.KHMER_REWRITE,
        payload: { content: 'I has meeting today.' },
        inputSummary: 'Polish text',
      },
      'idemp-1',
    );
  });

  it('accepts content property as fallback for text', async () => {
    const dto: CorrectGrammarDto = {
      content: 'I has meeting today.',
      mode: 'grammar',
    };
    const response = await controller.correct(user, undefined, dto);
    expect(response.corrected).toBe('I have a meeting today.');
  });

  it('rejects empty or whitespace-only text with BadRequestException', async () => {
    await expect(controller.correct(user, undefined, { text: '' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.correct(user, undefined, { text: '   \n  ' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.correct(user, undefined, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('delegates identically through GrammarExtensionController (/v1/ai/grammar/correct)', async () => {
    const dto: CorrectGrammarDto = {
      text: 'I has meeting today.',
      mode: 'grammar',
    };
    const response = await extensionController.correct(user, undefined, dto);
    expect(response).toEqual({
      original: 'I has meeting today.',
      corrected: 'I have a meeting today.',
      changed: true,
    });
  });

  describe('ValidationPipe rules', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    it('passes valid grammar DTO', async () => {
      const valid = await pipe.transform(
        { text: 'Valid sentence to check.', mode: 'grammar', language: 'en' },
        { type: 'body', metatype: CorrectGrammarDto },
      );
      expect(valid.text).toBe('Valid sentence to check.');
      expect(valid.mode).toBe('grammar');
    });

    it('rejects invalid mode', async () => {
      await expect(
        pipe.transform(
          { text: 'Valid text', mode: 'invalid_mode' },
          { type: 'body', metatype: CorrectGrammarDto },
        ),
      ).rejects.toThrow();
    });

    it('rejects forbidden extra properties', async () => {
      await expect(
        pipe.transform(
          { text: 'Valid text', unknownField: 'bad' },
          { type: 'body', metatype: CorrectGrammarDto },
        ),
      ).rejects.toThrow();
    });
  });
});
