import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { AiFeature } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorAiException } from '../creator-ai/creator-ai.errors';
import { FEATURE_CATALOG, KNOWN_FEATURE_KEYS } from './feature-catalog';

@Injectable()
export class FeatureAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async disabledKeys() {
    const rows = await this.prisma.featureAvailability.findMany({
      where: { enabled: false },
      select: { key: true },
    });
    return rows.map((row) => row.key);
  }

  async isEnabled(key: string) {
    const row = await this.prisma.featureAvailability.findUnique({
      where: { key },
      select: { enabled: true },
    });
    // Existing installations start enabled without a bulk data migration.
    return row?.enabled ?? true;
  }

  async assertCreatorEnabled(feature: AiFeature) {
    if (!(await this.isEnabled(`creator:${feature}`))) {
      throw new CreatorAiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'FEATURE_DISABLED',
        'This Creator tool is temporarily unavailable.',
      );
    }
  }

  async list() {
    const rows = await this.prisma.featureAvailability.findMany({
      select: {
        key: true,
        enabled: true,
        updatedAt: true,
        updatedByUserId: true,
      },
    });
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return FEATURE_CATALOG.map((item) => ({
      ...item,
      enabled: byKey.get(item.key)?.enabled ?? true,
      updatedAt: byKey.get(item.key)?.updatedAt ?? null,
      updatedByUserId: byKey.get(item.key)?.updatedByUserId ?? null,
    }));
  }

  async update(key: string, enabled: boolean, adminUserId: string) {
    if (!KNOWN_FEATURE_KEYS.has(key) || typeof enabled !== 'boolean') {
      throw new BadRequestException(
        'Unknown feature or invalid availability value.',
      );
    }
    const saved = await this.prisma.featureAvailability.upsert({
      where: { key },
      create: { key, enabled, updatedByUserId: adminUserId },
      update: { enabled, updatedByUserId: adminUserId },
      select: {
        key: true,
        enabled: true,
        updatedAt: true,
        updatedByUserId: true,
      },
    });
    return saved;
  }
}
