import { AiFeature } from '@prisma/client';
import { FeatureAvailabilityService } from './feature-availability.service';
import { CreatorGenerationService } from '../creator-ai/creator-generation.service';
import { FeatureAvailabilityController } from './feature-availability.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

describe('Feature availability', () => {
  it('requires an authenticated admin for reads and changes to the switches', () => {
    for (const method of ['list', 'update'] as const) {
      expect(
        Reflect.getMetadata(
          '__guards__',
          FeatureAvailabilityController.prototype[method],
        ),
      ).toEqual([JwtAuthGuard, AdminGuard]);
    }
  });
  const setup = () => {
    const rows = new Map<
      string,
      { enabled: boolean; updatedByUserId: string; updatedAt: Date }
    >();
    const prisma = {
      featureAvailability: {
        findUnique: jest.fn(async ({ where }) => rows.get(where.key) ?? null),
        findMany: jest.fn(async ({ where }) =>
          Array.from(rows, ([key, row]) => ({ key, ...row })).filter(
            (row) =>
              where?.enabled === undefined || row.enabled === where.enabled,
          ),
        ),
        upsert: jest.fn(async ({ where, create, update }) => {
          const row = {
            enabled: rows.has(where.key) ? update.enabled : create.enabled,
            updatedByUserId: update.updatedByUserId,
            updatedAt: new Date(),
          };
          rows.set(where.key, row);
          return { key: where.key, ...row };
        }),
      },
    };
    return { service: new FeatureAvailabilityService(prisma as never), prisma };
  };

  it('starts enabled and blocks a disabled Creator feature before reserving credits', async () => {
    const { service } = setup();
    expect(await service.isEnabled('creator:POST')).toBe(true);
    await service.update(
      'creator:POST',
      false,
      '00000000-0000-4000-8000-000000000001',
    );
    const credits = { reserve: jest.fn() };
    const generations = new CreatorGenerationService(
      {} as never,
      credits as never,
      {} as never,
      service,
    );
    await expect(
      generations.generate(
        'user',
        {
          feature: AiFeature.POST,
          payload: { topic: 'test' },
          inputSummary: 'Post',
        },
        'request-key',
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(credits.reserve).not.toHaveBeenCalled();
    expect(await service.disabledKeys()).toEqual(['creator:POST']);
  });

  it('only permits catalog keys and boolean values', async () => {
    const { service, prisma } = setup();
    await expect(
      service.update('unknown:key', false, 'admin'),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.update('website:qr', 'false' as never, 'admin'),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.featureAvailability.upsert).not.toHaveBeenCalled();
  });
});
