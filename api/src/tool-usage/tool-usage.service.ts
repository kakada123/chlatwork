import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RecordToolUsageDto } from './dto/record-tool-usage.dto';

// Keep this allowlist server-owned so clients cannot create arbitrary analytics labels.
const ENABLED_TOOL_KEYS = new Set([
  'payback-calculator',
  'image-compress',
  'image-to-pdf',
  'pdf-to-jpg',
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'remove-pdf-pages',
  'reorder-pdf-pages',
  'html-to-pdf',
  'text-to-pdf',
  'invoice-to-pdf',
  'qr',
  'scan-qr',
  'wifi-qr',
  'text-to-voice',
  'khmer-unicode-fixer',
  'calculator',
  'barcode',
  'scan-barcode',
  'expense-tracker',
  'lucky-draw',
  'json-formatter',
  'jwt-decoder',
  'base64',
  'url-encoder',
  'regex-tester',
  'uuid-generator',
  'unix-timestamp',
  'cron-explainer',
  'hash-generator',
  'password-generator',
]);

@Injectable()
export class ToolUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getPopular() {
    const grouped = await this.prisma.toolUsageEvent.groupBy({
      by: ['toolKey'],
      where: { event: 'OPEN' },
      _count: { _all: true },
      orderBy: { _count: { toolKey: 'desc' } },
      take: 16,
    });

    // The public response is aggregate-only: account IDs and individual counts stay private.
    return grouped
      .filter((item) => ENABLED_TOOL_KEYS.has(item.toolKey))
      .map((item) => ({ toolKey: item.toolKey }));
  }

  async record(userId: string, dto: RecordToolUsageDto) {
    if (!ENABLED_TOOL_KEYS.has(dto.toolKey)) {
      throw new BadRequestException('Unknown tool');
    }

    await this.prisma.toolUsageEvent.create({
      data: { userId, toolKey: dto.toolKey, event: dto.event },
    });
    return { recorded: true };
  }

  async getSummary(userId: string) {
    const grouped = await this.prisma.toolUsageEvent.groupBy({
      by: ['toolKey'],
      where: { userId, event: 'OPEN' },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _count: { toolKey: 'desc' } },
      take: 12,
    });

    return grouped.map((item) => ({
      toolKey: item.toolKey,
      usageCount: item._count._all,
      lastUsedAt: item._max.createdAt,
    }));
  }

  async clear(userId: string) {
    const result = await this.prisma.toolUsageEvent.deleteMany({ where: { userId } });
    return { deleted: result.count };
  }
}
