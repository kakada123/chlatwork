import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiFeature } from '@prisma/client';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { CreatorGenerationService } from './creator-generation.service';
import { CorrectGrammarDto } from './dto/creator-ai.dto';

@Controller('v1/ai/grammar')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class GrammarExtensionController {
  constructor(private readonly generations: CreatorGenerationService) {}

  @Post('correct')
  async correct(
    @CurrentAuthUser() user: CurrentUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CorrectGrammarDto,
  ) {
    const text = (dto.text ?? dto.content ?? '').trim();
    if (!text) {
      throw new BadRequestException('text or content is required');
    }
    const isPolish = dto.mode === 'polish';
    const feature = isPolish ? AiFeature.KHMER_REWRITE : AiFeature.KHMER_GRAMMAR;
    const label = isPolish ? 'Polish text' : 'Grammar correction';
    const idempotencyKey = key?.trim() || randomUUID();
    const result = await this.generations.generate(
      user.id,
      { feature, payload: { content: text }, inputSummary: label },
      idempotencyKey,
    );
    const corrected =
      result.data.sections.find((s) => s.id === 'result')?.content ?? text;
    return {
      original: text,
      corrected,
      changed: text !== corrected,
    };
  }
}
