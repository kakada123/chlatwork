import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';
import { CreatorTelegramClient } from '../creator-telegram/creator-telegram.client';
import { botAccessAllowed, type BotKind } from './bot-access.service';

@Injectable()
export class BotNotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotNotificationsService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chlatwork: TelegramBotClient,
    private readonly creator: CreatorTelegramClient,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 10_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.prisma
        .$executeRaw`DELETE FROM telegram_bot_qr_drafts WHERE expires_at <= NOW()`;
      const [item] = await this.prisma.$queryRaw<
        Array<{
          operationKey: string;
          userId: string;
          bot: BotKind;
          telegramId: string;
          status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
          enabled: boolean;
          isActive: boolean;
          attempts: number;
        }>
      >`
        WITH candidate AS (
          SELECT operation_key, user_id, bot FROM telegram_bot_notifications
          WHERE delivered_at IS NULL AND attempts < 5
            AND (locked_until IS NULL OR locked_until < NOW())
          ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
        ), claimed AS (
          UPDATE telegram_bot_notifications n SET attempts = n.attempts + 1,
            locked_until = NOW() + INTERVAL '2 minutes'
          FROM candidate c WHERE n.operation_key = c.operation_key AND n.bot = c.bot
          RETURNING n.*
        )
        SELECT c.operation_key AS "operationKey", c.user_id AS "userId", c.bot, c.attempts,
          p.telegram_user_id::text AS "telegramId", p.status, m.enabled, u."isActive" AS "isActive"
        FROM claimed c JOIN telegram_bot_profiles p ON p.user_id = c.user_id
        JOIN telegram_bot_memberships m ON m.user_id = c.user_id AND m.bot = c.bot
        JOIN users u ON u.id = c.user_id
        JOIN social_accounts s ON s."userId" = p.user_id AND s.provider = 'TELEGRAM'
          AND s."providerUserId" = p.telegram_user_id::text
        WHERE m.first_private_started_at IS NOT NULL
      `;
      if (!item) return;
      const bot = item.bot === 'CREATOR' ? this.creator : this.chlatwork;
      const allowed = botAccessAllowed(item);
      await bot.sendMessage(
        Number(item.telegramId),
        allowed
          ? 'Your access is approved! Use /menu to open this bot, or /myqr to manage your KHQR.'
          : 'Your bot access has been updated. Use /status to check it. Support: support@chlatwork.com',
        allowed
          ? {
              keyboard: [[{ text: '/menu' }, { text: '/myqr' }]],
              resize_keyboard: true,
            }
          : undefined,
      );
      await this.prisma.$executeRaw`
        UPDATE telegram_bot_notifications SET delivered_at = NOW(), locked_until = NULL
        WHERE operation_key = ${item.operationKey} AND bot = ${item.bot}
      `;
    } catch {
      // Delivery retries never roll back an approved account or duplicate a grant.
      // Telegram has no send idempotency key; an ambiguous network timeout can
      // still repeat a notification, but never the underlying admin operation.
      this.logger.warn('Bot access notification delivery deferred');
    } finally {
      this.running = false;
    }
  }
}
