import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readClamavConfig } from '../config/clamav';
import { ClamavService } from './clamav.service';
import { TelegramBotClient } from './telegram-bot.client';
import type { TelegramMessage } from './telegram-bot.types';
import type { FileScanResult } from './security.types';

@Injectable()
export class TelegramFileSecurityService {
  private activeScans = 0;
  constructor(
    private readonly config: ConfigService,
    private readonly bot: TelegramBotClient,
    private readonly clamav: ClamavService,
  ) {}

  async scan(
    document: NonNullable<TelegramMessage['document']>,
  ): Promise<FileScanResult> {
    let settings;
    try {
      settings = readClamavConfig((key) => this.config.get(key));
    } catch {
      return { status: 'unavailable', reason: 'invalid_config' };
    }
    if (!settings) return { status: 'disabled' };
    if (
      typeof document.file_id !== 'string' ||
      !document.file_id.trim() ||
      document.file_id.length > 256 ||
      (document.file_size !== undefined &&
        (!Number.isSafeInteger(document.file_size) ||
          document.file_size < 1 ||
          document.file_size > settings.maxBytes))
    )
      return { status: 'unsupported', reason: 'invalid_or_oversized_file' };
    // Bound downloads as well as engine work; do not keep an unbounded queue of private attachments.
    if (this.activeScans >= settings.maxConcurrent)
      return { status: 'busy', reason: 'concurrency_limit' };
    this.activeScans++;
    try {
      let bytes: Uint8Array;
      try {
        bytes = await this.bot.downloadFile(
          document.file_id,
          settings.maxBytes,
        );
      } catch (error) {
        if (error instanceof BadRequestException) {
          return { status: 'unsupported', reason: 'invalid_or_oversized_file' };
        }
        return { status: 'unavailable', reason: 'download_failed' };
      }
      if (!bytes.length || bytes.length > settings.maxBytes) {
        return { status: 'unsupported', reason: 'invalid_or_oversized_file' };
      }
      try {
        return await this.clamav.scan(bytes, settings);
      } catch {
        return { status: 'unavailable', reason: 'scanner_unavailable' };
      }
    } finally {
      this.activeScans--;
    }
  }
}
