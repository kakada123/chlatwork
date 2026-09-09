import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreatorTelegramService } from './creator-telegram.service';

@Controller('creator-telegram')
export class CreatorTelegramController {
  constructor(private readonly bot: CreatorTelegramService) {}

  @Post('webhook')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 300 } })
  async receiveUpdate(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() body: unknown,
  ) {
    if (!this.bot.isValidWebhookSecret(secret))
      throw new UnauthorizedException();
    await this.bot.handleUpdate(body);
    return { ok: true };
  }
}
