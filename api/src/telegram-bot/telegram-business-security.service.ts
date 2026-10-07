import {
  BadRequestException,
  Injectable,
  Logger,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityService } from './security.service';
import { TelegramBotClient } from './telegram-bot.client';
import type { TelegramMessage } from './telegram-bot.types';
import type { SecurityScanResult } from './security.types';

const MAX_MESSAGE_AGE_SECONDS = 48 * 60 * 60;

@Injectable()
export class TelegramBusinessSecurityService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBusinessSecurityService.name);
  private scanWindowStarted = 0;
  private scansInWindow = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly bot: TelegramBotClient,
    private readonly security: SecurityService,
  ) {}

  onModuleInit() {
    // Publish only non-sensitive switches so an idle scanner can be diagnosed in runtime logs.
    this.logger.log(
      JSON.stringify({
        event: 'telegram_business_security_status',
        scanningEnabled: this.enabled('TELEGRAM_BUSINESS_SECURITY_ENABLED'),
        fileScanEnabled: this.enabled('TELEGRAM_BUSINESS_FILE_SCAN_ENABLED'),
        autoDeleteEnabled: this.enabled(
          'TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE',
        ),
        riskThreshold: this.threshold(
          'TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD',
          90,
        ),
        confidenceThreshold: this.threshold(
          'TELEGRAM_BUSINESS_SECURITY_CONFIDENCE_THRESHOLD',
          95,
        ),
      }),
    );
  }

  async handleMessage(value: unknown) {
    if (!this.enabled('TELEGRAM_BUSINESS_SECURITY_ENABLED')) {
      this.recordSkip('disabled');
      return;
    }
    const message = this.validateMessage(value);
    const ageSeconds = Date.now() / 1000 - message.date!;
    if (message.from?.is_bot || message.sender_business_bot) {
      this.recordSkip('bot_message');
      return;
    }
    if (ageSeconds >= MAX_MESSAGE_AGE_SECONDS) {
      this.recordSkip('expired_message');
      return;
    }

    // A per-process ceiling bounds provider spending during webhook floods. Messages
    // beyond the ceiling stay untouched rather than being deleted without a scan.
    if (!this.reserveScan()) {
      this.logger.warn('Business security decision: rate_limited');
      return;
    }
    const connectionId = message.business_connection_id!;
    const connection = await this.bot.getBusinessConnection(connectionId);
    if (
      !connection ||
      connection.id !== connectionId ||
      typeof connection.is_enabled !== 'boolean' ||
      !Number.isSafeInteger(connection.user?.id) ||
      connection.user.id <= 0
    ) {
      throw new ServiceUnavailableException(
        'Telegram business connection is unavailable',
      );
    }
    // Outgoing account messages must never be mistaken for an incoming threat.
    if (!connection.is_enabled) {
      this.recordSkip('inactive_connection');
      return;
    }
    if (message.from!.id === connection.user.id) {
      this.recordSkip('outgoing_message');
      return;
    }

    const result = await this.security.scan(message);
    if (!this.shouldDelete(result)) {
      this.recordDecision(
        result,
        result.status === 'scanned' ? 'preserved' : result.status,
      );
      return;
    }
    if (connection.rights?.can_delete_all_messages !== true) {
      this.recordDecision(result, 'permission_missing');
      return;
    }
    try {
      // The Business API uses connection ID plus message IDs, not the ordinary chat deletion API.
      await this.bot.deleteBusinessMessages(connectionId, [message.message_id]);
    } catch {
      this.recordDecision(result, 'delete_failed');
      // Release the existing webhook claim so Telegram can retry transient deletion failures.
      throw new ServiceUnavailableException(
        'Telegram business deletion failed',
      );
    }
    this.recordDecision(result, 'deleted');
  }

  private shouldDelete(result: SecurityScanResult) {
    return (
      this.enabled('TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE') &&
      result.status === 'scanned' &&
      result.categories.length > 0 &&
      result.riskScore >=
        this.threshold('TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD', 90) &&
      result.confidence >=
        this.threshold('TELEGRAM_BUSINESS_SECURITY_CONFIDENCE_THRESHOLD', 95)
    );
  }

  private enabled(key: string) {
    return String(this.config.get(key)).toLowerCase() === 'true';
  }

  private threshold(key: string, fallback: number) {
    const raw = this.config.get(key);
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    return Number.isInteger(value) && value >= 90 && value <= 100 ? value : 101;
  }

  private reserveScan() {
    const now = Date.now();
    if (now - this.scanWindowStarted >= 60_000) {
      this.scanWindowStarted = now;
      this.scansInWindow = 0;
    }
    const configured = this.config.get(
      'TELEGRAM_BUSINESS_SECURITY_MAX_SCANS_PER_MINUTE',
    );
    const limit =
      configured === undefined || configured === '' ? 60 : Number(configured);
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 300 ||
      this.scansInWindow >= limit
    )
      return false;
    this.scansInWindow++;
    return true;
  }

  private recordSkip(reason: string) {
    this.logger.log(
      JSON.stringify({
        event: 'telegram_business_security',
        action: 'skipped',
        reason,
      }),
    );
  }

  private recordDecision(result: SecurityScanResult, action: string) {
    // Do not retain message bodies, links, filenames, account IDs, or provider error details.
    this.logger.log(
      JSON.stringify({
        event: 'telegram_business_security',
        action,
        riskScore: result.riskScore,
        confidence: result.confidence,
        categories: result.categories,
        ...(result.fileScan
          ? {
              fileScanStatus: result.fileScan.status,
              ...(result.fileScan.reason
                ? { fileScanReason: result.fileScan.reason }
                : {}),
            }
          : {}),
      }),
    );
  }

  private validateMessage(value: unknown): TelegramMessage {
    const object = (input: unknown): Record<string, unknown> | null =>
      input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : null;
    const boundedText = (input: unknown, max: number) =>
      input === undefined || (typeof input === 'string' && input.length <= max);
    const message = object(value);
    const chat = object(message?.chat);
    const from = object(message?.from);
    if (
      !message ||
      !chat ||
      !from ||
      chat.type !== 'private' ||
      !Number.isSafeInteger(chat.id) ||
      Number(chat.id) <= 0 ||
      !Number.isSafeInteger(from.id) ||
      Number(from.id) <= 0 ||
      !Number.isSafeInteger(message.message_id) ||
      Number(message.message_id) <= 0 ||
      typeof message.business_connection_id !== 'string' ||
      !message.business_connection_id.trim() ||
      message.business_connection_id.length > 256 ||
      !Number.isSafeInteger(message.date) ||
      Number(message.date) <= 0 ||
      Number(message.date) > Date.now() / 1000 + 300 ||
      !boundedText(message.text, 4096) ||
      !boundedText(message.caption, 1024) ||
      (from.is_bot !== undefined && typeof from.is_bot !== 'boolean')
    ) {
      throw new BadRequestException('Telegram business message is invalid');
    }
    for (const [key, textKey] of [
      ['entities', 'text'],
      ['caption_entities', 'caption'],
    ] as const) {
      const entities = message[key];
      if (entities === undefined) continue;
      if (
        !Array.isArray(entities) ||
        entities.length > 100 ||
        entities.some((input: unknown) => {
          const entity = object(input);
          return (
            !entity ||
            typeof entity.type !== 'string' ||
            entity.type.length > 64 ||
            !Number.isSafeInteger(entity.offset) ||
            Number(entity.offset) < 0 ||
            !Number.isSafeInteger(entity.length) ||
            Number(entity.length) < 1 ||
            Number(entity.offset) + Number(entity.length) >
              String(message[textKey] ?? '').length ||
            !boundedText(entity.url, 2048) ||
            (entity.type === 'text_link' &&
              (typeof entity.url !== 'string' || !entity.url.trim()))
          );
        })
      ) {
        throw new BadRequestException(
          'Telegram business message entities are invalid',
        );
      }
    }
    if (message.document !== undefined) {
      const document = object(message.document);
      if (
        !document ||
        typeof document.file_id !== 'string' ||
        !document.file_id.trim() ||
        document.file_id.length > 256 ||
        (document.file_size !== undefined &&
          (!Number.isSafeInteger(document.file_size) ||
            Number(document.file_size) < 0)) ||
        !boundedText(document.file_name, 512) ||
        !boundedText(document.mime_type, 128)
      ) {
        throw new BadRequestException('Telegram business document is invalid');
      }
    }
    return value as TelegramMessage;
  }
}
