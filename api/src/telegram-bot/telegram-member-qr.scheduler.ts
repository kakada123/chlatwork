import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotClient } from './telegram-bot.client';

interface DueQrMessage {
  telegramChatId: bigint;
  messageId: number;
}

@Injectable()
export class TelegramMemberQrScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TelegramMemberQrScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bot: TelegramBotClient,
  ) {}

  onModuleInit() {
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(now = new Date()) {
    if (this.running) return 0;
    this.running = true;
    let deleted = 0;
    try {
      // Telegram cannot delete messages aged 48 hours. Retire expired tracking
      // rows with a warning rather than retrying an impossible deletion forever.
      const expired = await this.prisma.$executeRaw`
        DELETE FROM telegram_member_qr_messages
        WHERE sent_at <= ${now}::timestamptz - INTERVAL '48 hours'
      `;
      if (expired) {
        this.logger.warn(
          'Member QR cleanup missed the Telegram deletion window',
        );
      }
      // A five-minute lease survives crashes and prevents replicas from claiming
      // the same batch. Twenty sequential requests fit within that lease.
      const messages = await this.prisma.$queryRaw<DueQrMessage[]>`
        WITH due AS (
          SELECT telegram_chat_id, message_id
          FROM telegram_member_qr_messages
          WHERE delete_after <= ${now} AND next_attempt_at <= ${now}
            AND sent_at > ${now}::timestamptz - INTERVAL '48 hours'
          ORDER BY next_attempt_at, telegram_chat_id, message_id
          LIMIT 20
          FOR UPDATE SKIP LOCKED
        )
        UPDATE telegram_member_qr_messages AS qr
        SET next_attempt_at = ${now}::timestamptz + INTERVAL '5 minutes'
        FROM due
        WHERE qr.telegram_chat_id = due.telegram_chat_id
          AND qr.message_id = due.message_id
        RETURNING qr.telegram_chat_id AS "telegramChatId", qr.message_id AS "messageId"
      `;
      for (const message of messages) {
        try {
          await this.bot.deleteMessages(Number(message.telegramChatId), [
            message.messageId,
          ]);
          await this.prisma.$executeRaw`
            DELETE FROM telegram_member_qr_messages
            WHERE telegram_chat_id = ${message.telegramChatId}
              AND message_id = ${message.messageId}
          `;
          deleted++;
        } catch {
          // Leave failed rows available when their lease expires. Never log
          // recipient IDs or provider errors containing bot-token URLs.
          this.logger.warn('A member QR cleanup will be retried');
        }
      }
    } catch {
      this.logger.warn('Member QR cleanup run failed');
    } finally {
      this.running = false;
    }
    return deleted;
  }
}
