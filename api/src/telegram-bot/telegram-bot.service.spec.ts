import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { MomentsService } from '../moments/moments.service';
import type { TelegramBotClient } from './telegram-bot.client';
import { TelegramBotService } from './telegram-bot.service';

describe('TelegramBotService', () => {
  it('uses a constant-length digest comparison for the webhook secret', () => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('correct_webhook_secret_1234'),
    };
    const service = new TelegramBotService(
      {} as PrismaService,
      config as unknown as ConfigService,
      {} as TelegramBotClient,
      {} as MomentsService,
    );

    expect(service.isValidWebhookSecret('correct_webhook_secret_1234')).toBe(true);
    expect(service.isValidWebhookSecret('incorrect_webhook_secret')).toBe(false);
    expect(service.isValidWebhookSecret()).toBe(false);
  });
});
