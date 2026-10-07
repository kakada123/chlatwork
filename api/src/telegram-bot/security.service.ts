import { Injectable } from '@nestjs/common';
import { TelegramAssistantAiService } from './telegram-assistant-ai.service';
import { TelegramFileSecurityService } from './telegram-file-security.service';
import { TelegramUrlSecurityService } from './telegram-url-security.service';
import { extractSecurityLinks } from './security-links';
import type { TelegramMessage } from './telegram-bot.types';
import type { SecurityScanInput, SecurityScanResult } from './security.types';

@Injectable()
export class SecurityService {
  constructor(
    private readonly ai: TelegramAssistantAiService,
    private readonly files: TelegramFileSecurityService,
    private readonly urls: TelegramUrlSecurityService,
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
    const links = extractSecurityLinks(message);
    const urlScan = links.length ? await this.urls.scan(links) : undefined;
    if (urlScan?.status === 'unsafe') {
      return {
        status: 'scanned',
        riskScore: 100,
        confidence: 100,
        categories: [
          urlScan.threatTypes?.includes('SOCIAL_ENGINEERING')
            ? 'phishing_url'
            : 'unsafe_url',
        ],
        urlScan,
        ...(fileScan ? { fileScan } : {}),
      };
    }
    const result = await this.assessMessage(message, links);
    return {
      ...result,
      ...(fileScan ? { fileScan } : {}),
      ...(urlScan ? { urlScan } : {}),
      ...((fileScan?.status === 'clean' || urlScan?.status === 'not_listed') &&
      result.status === 'unavailable'
        ? { status: 'scanned' as const }
        : {}),
    };
  }

  private async assessMessage(
    message: TelegramMessage,
    links: SecurityScanInput['links'],
  ): Promise<SecurityScanResult> {
    const input: SecurityScanInput = {
      text: message.text ?? '',
      caption: message.caption ?? '',
      links,
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
}
