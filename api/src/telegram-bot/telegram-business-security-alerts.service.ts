import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotClient } from './telegram-bot.client';
import type {
  TelegramBusinessConnection,
  TelegramCallbackQuery,
  TelegramMessage,
} from './telegram-bot.types';
import type { SecurityScanResult } from './security.types';

export type SecurityAlertDecision =
  'preserved' | 'permission_missing' | 'delete_failed' | 'deleted';
type Audience = 'owner' | 'chat';
interface AlertRecord {
  id: string;
  event_key: string;
  audience: Audience;
  business_connection_id: string;
  owner_user_id: bigint;
  owner_chat_id: bigint;
  source_chat_id: bigint;
  source_message_id: bigint;
  source_message_date: Date;
  expires_at: Date;
  decision: SecurityAlertDecision;
  alert_message_id: bigint | null;
  deleted_at: Date | null;
  delivery_attempts: number;
}

const DELETE_PREFIX = 'security:delete:';
const ACTION_PATTERN =
  /^security:delete:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const REPLY_AGE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TelegramBusinessSecurityAlertsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    TelegramBusinessSecurityAlertsService.name,
  );
  private timer?: ReturnType<typeof setInterval>;
  private processing = false;

  constructor(
    private readonly config: ConfigService,
    private readonly bot: TelegramBotClient,
    private readonly prisma: PrismaService,
  ) {}

  isEnabled() {
    return (
      this.flag('TELEGRAM_BUSINESS_SECURITY_ENABLED') &&
      (this.ownerAlertsEnabled() || this.chatAlertsEnabled())
    );
  }

  ownerAlertsEnabled() {
    return (
      this.flag('TELEGRAM_BUSINESS_SECURITY_ENABLED') &&
      this.flag('TELEGRAM_BUSINESS_SECURITY_OWNER_ALERTS', true)
    );
  }

  chatAlertsEnabled() {
    return (
      this.flag('TELEGRAM_BUSINESS_SECURITY_ENABLED') &&
      this.flag('TELEGRAM_BUSINESS_SECURITY_CHAT_ALERTS', true)
    );
  }

  onModuleInit() {
    if (this.isEnabled()) {
      this.timer = setInterval(() => void this.processPending(), 30_000);
      this.timer.unref();
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async notify(
    message: TelegramMessage,
    connection: TelegramBusinessConnection,
    result: SecurityScanResult,
    decision: SecurityAlertDecision,
  ) {
    if (
      !this.isEnabled() ||
      result.status !== 'scanned' ||
      result.fileScan?.status !== 'infected'
    )
      return;
    if (
      !this.positiveId(connection.user_chat_id) ||
      !this.positiveId(connection.user?.id)
    ) {
      this.record('owner_chat_unavailable');
      return;
    }
    const sourceDate = new Date(message.date! * 1000);
    const expires = new Date(sourceDate.getTime() + MAX_AGE_MS);
    if (expires.getTime() <= Date.now()) return;
    // Store only identifiers required for delivery and authorization, never file contents or names.
    const eventKey = createHash('sha256')
      .update(
        JSON.stringify([connection.id, message.chat.id, message.message_id]),
      )
      .digest('hex');
    const audiences: Audience[] = this.ownerAlertsEnabled() ? ['owner'] : [];
    if (
      this.chatAlertsEnabled() &&
      connection.rights?.can_reply === true &&
      Date.now() - sourceDate.getTime() < REPLY_AGE_MS
    )
      audiences.push('chat');
    else if (this.chatAlertsEnabled()) this.record('chat_reply_unavailable');
    for (const audience of audiences) {
      try {
        const rows = await this.prisma.$queryRaw<AlertRecord[]>`
          INSERT INTO telegram_business_security_alerts
            (id, event_key, audience, business_connection_id, owner_user_id, owner_chat_id,
             source_chat_id, source_message_id, source_message_date, expires_at, decision, deleted_at)
          VALUES (${randomUUID()}::uuid, ${eventKey}, ${audience}, ${connection.id}, ${BigInt(connection.user.id)},
            ${BigInt(connection.user_chat_id!)}, ${BigInt(message.chat.id)}, ${BigInt(message.message_id)},
            ${sourceDate}, ${expires}, ${decision}, ${decision === 'deleted' ? new Date() : null}::timestamptz)
          ON CONFLICT (event_key, audience) DO UPDATE SET
            decision = CASE WHEN telegram_business_security_alerts.deleted_at IS NOT NULL THEN 'deleted' ELSE EXCLUDED.decision END,
            deleted_at = COALESCE(telegram_business_security_alerts.deleted_at, EXCLUDED.deleted_at),
            delivery_attempts = CASE WHEN telegram_business_security_alerts.decision IS DISTINCT FROM EXCLUDED.decision
              AND telegram_business_security_alerts.deleted_at IS NULL THEN 0 ELSE telegram_business_security_alerts.delivery_attempts END,
            next_delivery_at = CASE WHEN telegram_business_security_alerts.decision IS DISTINCT FROM EXCLUDED.decision
              AND telegram_business_security_alerts.deleted_at IS NULL THEN NOW() ELSE telegram_business_security_alerts.next_delivery_at END
          WHERE telegram_business_security_alerts.owner_user_id = EXCLUDED.owner_user_id
            AND telegram_business_security_alerts.owner_chat_id = EXCLUDED.owner_chat_id
          RETURNING *`;
        if (rows[0]) await this.deliver(rows[0], connection);
      } catch {
        this.record('storage_unavailable');
      }
    }
  }

  async handleCallback(callback: TelegramCallbackQuery) {
    const token =
      typeof callback.data === 'string'
        ? ACTION_PATTERN.exec(callback.data)?.[1]
        : undefined;
    if (!token || !this.ownerAlertsEnabled())
      return this.answer(callback, 'This action is unavailable.');
    try {
      const rows = await this.prisma.$queryRaw<
        AlertRecord[]
      >`SELECT * FROM telegram_business_security_alerts WHERE id = ${token}::uuid`;
      const row = rows[0];
      // An opaque token is not authorization: bind it to the owner and the exact private bot message.
      if (
        !row ||
        row.audience !== 'owner' ||
        !this.positiveId(callback.from?.id) ||
        callback.from.is_bot ||
        callback.message?.chat.type !== 'private' ||
        !this.positiveId(callback.message.chat.id) ||
        !this.positiveId(callback.message.message_id) ||
        BigInt(callback.from.id) !== row.owner_user_id ||
        BigInt(callback.message.chat.id) !== row.owner_chat_id ||
        BigInt(callback.message.message_id) !== row.alert_message_id
      ) {
        return this.answer(
          callback,
          'This action belongs to the account owner.',
        );
      }
      if (row.deleted_at)
        return this.answer(callback, 'The file message was already deleted.');
      if (row.expires_at.getTime() <= Date.now())
        return this.answer(callback, 'This action has expired (48 hours).');
      const connection = await this.bot.getBusinessConnection(
        row.business_connection_id,
      );
      if (
        !this.currentOwner(row, connection) ||
        connection.rights?.can_delete_all_messages !== true
      ) {
        return this.answer(
          callback,
          'Enable Delete all messages permission in Secretary Mode.',
        );
      }
      const lease = randomUUID();
      // A shared lease prevents concurrent clicks on different API replicas from deleting twice.
      const claimed = await this.prisma.$queryRaw<AlertRecord[]>`
        UPDATE telegram_business_security_alerts SET delete_started_at = NOW(), delete_token = ${lease}::uuid
        WHERE id = ${token}::uuid AND audience = 'owner' AND deleted_at IS NULL AND expires_at > NOW()
          AND (delete_started_at IS NULL OR delete_started_at < NOW() - INTERVAL '60 seconds') RETURNING *`;
      if (!claimed[0])
        return this.answer(callback, 'Deletion is already being processed.');
      await this.answer(callback, 'Deleting file message… / កំពុងលុប…');
      try {
        await this.bot.deleteBusinessMessages(row.business_connection_id, [
          Number(row.source_message_id),
        ]);
      } catch {
        const failed = await this.prisma.$queryRaw<AlertRecord[]>`
          UPDATE telegram_business_security_alerts SET decision = 'delete_failed',
            delete_started_at = NULL, delete_token = NULL, delivery_attempts = 0, next_delivery_at = NOW()
          WHERE event_key = ${row.event_key} AND deleted_at IS NULL AND EXISTS (
            SELECT 1 FROM telegram_business_security_alerts WHERE id = ${token}::uuid AND delete_token = ${lease}::uuid)
          RETURNING *`;
        this.record('delete_failed');
        for (const alert of failed) await this.deliver(alert, connection);
        return;
      }
      // Mark both destinations before editing alerts; failed edits must never re-enable deletion.
      const updated = await this.prisma.$queryRaw<AlertRecord[]>`
        UPDATE telegram_business_security_alerts SET decision = 'deleted', deleted_at = NOW(),
          delete_started_at = NULL, delete_token = NULL, delivery_attempts = 0, next_delivery_at = NOW()
        WHERE event_key = ${row.event_key} AND EXISTS (
          SELECT 1 FROM telegram_business_security_alerts WHERE id = ${token}::uuid AND delete_token = ${lease}::uuid)
        RETURNING *`;
      for (const alert of updated) await this.deliver(alert, connection);
    } catch {
      this.record('action_unavailable');
      await this.answer(
        callback,
        'Unable to delete right now. Please try again.',
      );
    }
  }

  async processPending() {
    if (!this.isEnabled() || this.processing) return;
    this.processing = true;
    try {
      // Expire action identifiers and recipient IDs once Telegram's deletion window closes.
      await this.prisma
        .$executeRaw`DELETE FROM telegram_business_security_alerts WHERE id IN (
        SELECT id FROM telegram_business_security_alerts WHERE expires_at <= NOW() ORDER BY expires_at LIMIT 100)`;
      const rows = await this.prisma.$queryRaw<AlertRecord[]>`
        SELECT * FROM telegram_business_security_alerts WHERE expires_at > NOW() AND delivery_attempts < 3
          AND next_delivery_at <= NOW() AND (alert_message_id IS NULL OR notified_decision IS DISTINCT FROM decision)
          AND (delivery_started_at IS NULL OR delivery_started_at < NOW() - INTERVAL '60 seconds')
        ORDER BY next_delivery_at LIMIT 10`;
      for (const row of rows) {
        try {
          await this.deliver(row);
        } catch {
          this.record('retry_unavailable');
        }
      }
    } catch {
      this.record('storage_unavailable');
    } finally {
      this.processing = false;
    }
  }

  private async deliver(
    row: AlertRecord,
    connection?: TelegramBusinessConnection,
  ) {
    const lease = randomUUID();
    const rows = await this.prisma.$queryRaw<AlertRecord[]>`
      UPDATE telegram_business_security_alerts SET delivery_started_at = NOW(), delivery_token = ${lease}::uuid,
        delivery_attempts = delivery_attempts + 1
      WHERE id = ${row.id}::uuid AND expires_at > NOW() AND delivery_attempts < 3 AND next_delivery_at <= NOW()
        AND (alert_message_id IS NULL OR notified_decision IS DISTINCT FROM decision)
        AND (delivery_started_at IS NULL OR delivery_started_at < NOW() - INTERVAL '60 seconds') RETURNING *`;
    const claimed = rows[0];
    if (!claimed) return;
    try {
      // Include connection lookups in the shared attempt budget so failures cannot starve the queue.
      const current =
        connection ??
        (await this.bot.getBusinessConnection(claimed.business_connection_id));
      if (
        !this.currentOwner(claimed, current) ||
        (claimed.audience === 'owner' && !this.ownerAlertsEnabled()) ||
        (claimed.audience === 'chat' &&
          (!this.chatAlertsEnabled() ||
            current.rights?.can_reply !== true ||
            Date.now() - claimed.source_message_date.getTime() >= REPLY_AGE_MS))
      ) {
        return this.cancelDelivery(claimed, lease);
      }
      const text = this.text(claimed);
      let messageId = claimed.alert_message_id;
      if (claimed.audience === 'chat') {
        if (messageId)
          await this.bot.editBusinessMessage(
            claimed.business_connection_id,
            Number(claimed.source_chat_id),
            Number(messageId),
            text,
          );
        else {
          const sent = await this.bot.sendBusinessMessage(
            claimed.business_connection_id,
            Number(claimed.source_chat_id),
            text,
          );
          messageId = this.sentMessageId(sent, claimed.source_chat_id);
        }
      } else {
        const keyboard = {
          inline_keyboard:
            claimed.deleted_at || claimed.decision === 'deleted'
              ? []
              : [
                  [
                    {
                      text: '🗑 Delete file / លុបឯកសារ',
                      callback_data: `${DELETE_PREFIX}${claimed.id}`,
                    },
                  ],
                ],
        };
        if (messageId)
          await this.bot.editMessage(
            Number(claimed.owner_chat_id),
            Number(messageId),
            text,
            keyboard,
          );
        else {
          const sent = await this.bot.sendMessage(
            Number(claimed.owner_chat_id),
            text,
            keyboard,
          );
          messageId = this.sentMessageId(sent, claimed.owner_chat_id);
        }
      }
      await this.prisma.$executeRaw`
        UPDATE telegram_business_security_alerts SET alert_message_id = ${messageId}, notified_decision = ${claimed.decision},
          delivery_started_at = NULL, delivery_token = NULL
        WHERE id = ${claimed.id}::uuid AND delivery_token = ${lease}::uuid`;
      this.record(
        claimed.audience === 'chat' ? 'chat_delivered' : 'owner_delivered',
      );
    } catch {
      // Delivery is best effort: bounded outbox retries cannot interrupt malware handling.
      await this.prisma.$executeRaw`
        UPDATE telegram_business_security_alerts SET delivery_started_at = NULL, delivery_token = NULL,
          next_delivery_at = NOW() + CASE WHEN delivery_attempts < 2 THEN INTERVAL '1 minute' ELSE INTERVAL '5 minutes' END
        WHERE id = ${claimed.id}::uuid AND delivery_token = ${lease}::uuid`;
      this.record('delivery_failed');
    }
  }

  private text(row: AlertRecord) {
    const status =
      row.decision === 'deleted'
        ? 'Deleted / បានលុបឯកសារ។'
        : row.decision === 'permission_missing'
          ? 'Kept: deletion permission is missing / មិនបានលុប៖ ខ្វះសិទ្ធិលុប។'
          : row.decision === 'delete_failed'
            ? 'Kept: deletion failed / មិនបានលុប៖ ការលុបបរាជ័យ។'
            : 'Kept / ឯកសារនៅមានក្នុង chat។';
    return `⚠️ Infected file detected / រកឃើញឯកសារមានមេរោគ\nClamAV detected malware in the incoming file. Do not open or download it.\nកុំបើក ឬទាញយកឯកសារនេះ។\n${status}\nMessage #${row.source_message_id} · ${row.source_message_date.toISOString()}`;
  }

  private currentOwner(
    row: AlertRecord,
    connection: TelegramBusinessConnection,
  ) {
    return (
      !!connection &&
      connection.id === row.business_connection_id &&
      connection.is_enabled === true &&
      this.positiveId(connection.user?.id) &&
      this.positiveId(connection.user_chat_id) &&
      BigInt(connection.user.id) === row.owner_user_id &&
      BigInt(connection.user_chat_id!) === row.owner_chat_id
    );
  }

  private sentMessageId(message: TelegramMessage, chatId: bigint) {
    if (
      !this.positiveId(message?.message_id) ||
      !this.positiveId(message.chat?.id) ||
      BigInt(message.chat.id) !== chatId
    )
      throw new Error('Invalid alert receipt');
    return BigInt(message.message_id);
  }

  private async cancelDelivery(row: AlertRecord, lease: string) {
    await this.prisma.$executeRaw`
      UPDATE telegram_business_security_alerts SET delivery_attempts = 3, delivery_started_at = NULL, delivery_token = NULL
      WHERE id = ${row.id}::uuid AND delivery_token = ${lease}::uuid`;
    this.record('delivery_cancelled');
  }

  private async answer(callback: TelegramCallbackQuery, text: string) {
    try {
      await this.bot.answerCallback(callback.id, text);
    } catch {
      this.record('callback_unavailable');
    }
  }

  private positiveId(value: unknown): value is number {
    return (
      typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    );
  }
  private flag(key: string, fallback = false) {
    const value = this.config.get(key);
    return value === undefined || value === ''
      ? fallback
      : String(value).toLowerCase() === 'true';
  }
  private record(action: string) {
    this.logger.log(
      JSON.stringify({ event: 'telegram_business_security_alert', action }),
    );
  }
}
