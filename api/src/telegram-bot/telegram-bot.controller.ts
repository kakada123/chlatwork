import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TelegramBotService } from './telegram-bot.service';

@Controller('telegram')
export class TelegramBotController {
  constructor(private readonly telegramBot: TelegramBotService) {}

  @Post('webhook')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 300 } })
  async receiveUpdate(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() body: unknown,
  ) {
    if (!this.telegramBot.isValidWebhookSecret(secret)) {
      throw new UnauthorizedException();
    }
    await this.telegramBot.handleUpdate(body);
    return { ok: true };
  }
}
