import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AiFeature } from '@prisma/client';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { CreatorCreditsService } from './creator-credits.service';
import { CreatorGenerationService, type CreatorImageUpload } from './creator-generation.service';
import {
  FacebookToTikTokDto,
  GenerateHooksDto,
  GenerateIdeasDto,
  GeneratePostDto,
  GenerateScriptDto,
  KhmerGrammarDto,
  LatinToKhmerDto,
  LongToShortDto,
  RewriteDto,
  CreatorVideoUploadTicketDto,
} from './dto/creator-ai.dto';
import { CreatorVideoUploadTicketService } from './creator-video-upload-ticket.service';

@Controller('creator-ai')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class CreatorAiController {
  constructor(
    private readonly generations: CreatorGenerationService,
    private readonly credits: CreatorCreditsService,
    private readonly uploadTickets: CreatorVideoUploadTicketService,
  ) {}

  @Post('posts/generate')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  generatePost(
    @CurrentAuthUser() user: CurrentUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: GeneratePostDto,
    @UploadedFile() image?: CreatorImageUpload,
  ) {
    return this.generations.generate(
      user.id,
      {
        feature: AiFeature.POST,
        payload: { ...dto },
        inputSummary: 'Social post',
        ...(image
          ? { image: { bytes: image.buffer, mimeType: image.mimetype } }
          : {}),
      },
      key,
    );
  }

  @Post('scripts/generate')
  generateScript(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: GenerateScriptDto) {
    return this.generate(user.id, AiFeature.SCRIPT, { ...dto }, 'Video script', key);
  }

  @Post('hooks/generate')
  generateHooks(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: GenerateHooksDto) {
    return this.generate(user.id, AiFeature.HOOK, { ...dto }, 'Hook options', key);
  }

  @Post('content-ideas/generate')
  generateIdeas(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: GenerateIdeasDto) {
    return this.generate(user.id, AiFeature.CONTENT_IDEAS, { ...dto }, 'Content ideas', key);
  }

  @Post('khmer/grammar')
  grammar(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: KhmerGrammarDto) {
    return this.generate(user.id, AiFeature.KHMER_GRAMMAR, { ...dto }, 'Khmer grammar', key);
  }

  @Post('khmer/rewrite')
  rewrite(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: RewriteDto) {
    return this.generate(user.id, AiFeature.KHMER_REWRITE, { ...dto }, 'Khmer rewrite', key);
  }

  @Post('khmer/latin-to-khmer')
  latinToKhmer(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: LatinToKhmerDto) {
    return this.generate(user.id, AiFeature.LATIN_TO_KHMER, { ...dto }, 'Latin Khmer conversion', key);
  }

  @Post('khmer/humanize')
  humanize(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: RewriteDto) {
    return this.generate(user.id, AiFeature.HUMANIZE, { ...dto }, 'Humanized content', key);
  }

  @Post('repurpose/facebook-to-tiktok')
  facebookToTikTok(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: FacebookToTikTokDto) {
    return this.generate(user.id, AiFeature.FACEBOOK_TO_TIKTOK, { ...dto }, 'Facebook to TikTok', key);
  }

  @Post('repurpose/long-to-short')
  longToShort(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: LongToShortDto) {
    return this.generate(user.id, AiFeature.LONG_TO_SHORT, { ...dto }, 'Shortened content', key);
  }

  @Get('credits')
  getCredits(@CurrentAuthUser() user: CurrentUser) {
    return this.credits.getBalance(user.id);
  }

  @Get('credits/transactions')
  getTransactions(@CurrentAuthUser() user: CurrentUser) {
    return this.credits.transactions(user.id);
  }

  @Get('history')
  getHistory(@CurrentAuthUser() user: CurrentUser) {
    return this.credits.history(user.id);
  }

  @Post('video/upload-ticket')
  createVideoUploadTicket(
    @CurrentAuthUser() user: CurrentUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CreatorVideoUploadTicketDto,
  ) {
    return this.uploadTickets.issue(user.id, dto.feature, key);
  }

  private generate(
    userId: string,
    feature: AiFeature,
    payload: Record<string, unknown>,
    inputSummary: string,
    key: string | undefined,
  ) {
    return this.generations.generate(
      userId,
      { feature, payload, inputSummary },
      key,
    );
  }
}
