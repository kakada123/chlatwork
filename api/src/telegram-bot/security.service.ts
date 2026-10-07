import { Injectable } from '@nestjs/common';
import { TelegramAssistantAiService } from './telegram-assistant-ai.service';
import { TelegramFileSecurityService } from './telegram-file-security.service';
import type {
  TelegramMessage,
  TelegramMessageEntity,
} from './telegram-bot.types';
import type { SecurityScanInput, SecurityScanResult } from './security.types';

@Injectable()
export class SecurityService {
  constructor(
    private readonly ai: TelegramAssistantAiService,
    private readonly files: TelegramFileSecurityService,
  ) {}

  async scan(message: TelegramMessage): Promise<SecurityScanResult> {
    const fileScan = message.document
      ? await this.files.scan(message.document)
      : undefined;
    if (fileScan?.status === 'infected') {
      // Only a real signature verdict can override the file-metadata confidence ceiling.
      return {
        status: 'scanned',
        riskScore: 100,
        confidence: 100,
        categories: ['suspicious_file'],
        fileScan,
      };
    }
    const result = await this.assessMessage(message);
    return {
      ...result,
      ...(fileScan ? { fileScan } : {}),
      ...(fileScan?.status === 'clean' && result.status === 'unavailable'
        ? { status: 'scanned' as const }
        : {}),
    };
  }

  private async assessMessage(
    message: TelegramMessage,
  ): Promise<SecurityScanResult> {
    const input: SecurityScanInput = {
      text: message.text ?? '',
      caption: message.caption ?? '',
      links: [
        ...this.links(message.text ?? '', message.entities),
        ...this.links(message.caption ?? '', message.caption_entities),
      ],
      document: message.document
        ? {
            fileName: message.document.file_name ?? '',
            mimeType: message.document.mime_type ?? '',
          }
        : null,
    };
    const unchanged = { riskScore: 0, confidence: 0, categories: [] };
    if (JSON.stringify(input).length > 20_000) {
      return { ...unchanged, status: 'unsupported' };
    }
    if (
      !input.text.trim() &&
      !input.caption.trim() &&
      !input.document &&
      !input.links.length
    ) {
      return { ...unchanged, status: 'unsupported' };
    }
    if (!this.ai.isConfigured()) return { ...unchanged, status: 'unavailable' };
    try {
      const assessment = await this.ai.assessMessageSecurity(input);
      // File metadata alone cannot justify deletion, regardless of the model's categories.
      if (
        (input.document && !input.text.trim() && !input.caption.trim()) ||
        (assessment.categories.length === 1 &&
          assessment.categories[0] === 'suspicious_file')
      ) {
        assessment.confidence = Math.min(assessment.confidence, 85);
      }
      return { ...assessment, status: 'scanned' };
    } catch {
      // Preserve the message on provider failures; never log private input or provider errors.
      return { ...unchanged, status: 'unavailable' };
    }
  }

  private links(text: string, entities?: TelegramMessageEntity[]) {
    return (entities ?? []).flatMap((entity) => {
      if (entity.type === 'text_link' && entity.url) {
        return [
          {
            target: entity.url,
            label: text.slice(entity.offset, entity.offset + entity.length),
          },
        ];
      }
      if (entity.type === 'url') {
        return [
          { target: text.slice(entity.offset, entity.offset + entity.length) },
        ];
      }
      return [];
    });
  }
}
