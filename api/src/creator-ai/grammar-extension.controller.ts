import {
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { CreatorAiController } from './creator-ai.controller';
import { CorrectGrammarDto } from './dto/creator-ai.dto';

@Controller('v1/ai/grammar')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class GrammarExtensionController {
  constructor(private readonly creatorAi: CreatorAiController) {}

  @Post('correct')
  correct(
    @CurrentAuthUser() user: CurrentUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CorrectGrammarDto,
  ) {
    return this.creatorAi.correct(user, key, dto);
  }
}
