import type { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { CreatorPlanLimitsService } from './creator-plan-limits.service';
import { CreatorProtectionService } from './creator-protection.service';

describe('CreatorProtectionService', () => {
  const plans = new CreatorPlanLimitsService(config({}));

  function config(values: Record<string, string>) {
    return {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
  }

  function transaction(overrides: {
    minute?: number;
    hour?: number;
    dailyCredits?: number;
    dailyProvider?: number;
    monthlyProvider?: number;
    activeProvider?: number;
    override?: number | null;
  }) {
    return {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            aiDailyCreditLimit: overrides.override ?? null,
          }),
      },
      aiGeneration: {
        count: jest
          .fn()
          .mockResolvedValueOnce(overrides.minute ?? 0)
          .mockResolvedValueOnce(overrides.hour ?? 0),
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({
            _sum: { creditCost: overrides.dailyCredits ?? 0 },
          })
          .mockResolvedValueOnce({
            _sum: { estimatedProviderCostUsd: overrides.activeProvider ?? 0 },
          }),
      },
      aiVideoJob: { count: jest.fn().mockResolvedValue(0) },
      aiUsageLog: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({
            _sum: { estimatedProviderCostUsd: overrides.dailyProvider ?? 0 },
          })
          .mockResolvedValueOnce({
            _sum: { estimatedProviderCostUsd: overrides.monthlyProvider ?? 0 },
          }),
      },
    } as unknown as Prisma.TransactionClient;
  }

  it('blocks a user at the per-minute request limit', async () => {
    const service = new CreatorProtectionService(
      config({ AI_ENABLED: 'true' }),
      plans,
    );
    await expect(
      service.assertCanReserve(
        transaction({ minute: 5 }),
        'user-id',
        1,
        0.01,
        false,
      ),
    ).rejects.toMatchObject({ response: { code: 'AI_RATE_LIMITED' } });
  });

  it('blocks credits beyond the independent daily allowance', async () => {
    const service = new CreatorProtectionService(
      config({ AI_ENABLED: 'true' }),
      plans,
    );
    await expect(
      service.assertCanReserve(
        transaction({ dailyCredits: 10 }),
        'user-id',
        1,
        0.01,
        false,
      ),
    ).rejects.toMatchObject({ response: { code: 'AI_DAILY_LIMIT_REACHED' } });
  });

  it('fails closed before reservation when the global daily budget is reached', async () => {
    const service = new CreatorProtectionService(
      config({
        AI_ENABLED: 'true',
        AI_DAILY_PROVIDER_BUDGET_USD: '0.05',
        AI_MONTHLY_PROVIDER_BUDGET_USD: '1',
      }),
      plans,
    );
    await expect(
      service.assertCanReserve(
        transaction({ dailyProvider: 0.04 }),
        'user-id',
        1,
        0.02,
        false,
      ),
    ).rejects.toMatchObject({
      response: { code: 'AI_TEMPORARILY_UNAVAILABLE' },
    });
  });

  it('allows usage above the default after an admin raises the daily limit', async () => {
    const service = new CreatorProtectionService(
      config({
        AI_ENABLED: 'true',
        AI_DAILY_PROVIDER_BUDGET_USD: '100',
        AI_MONTHLY_PROVIDER_BUDGET_USD: '1000',
      }),
      plans,
    );
    await expect(
      service.assertCanReserve(
        transaction({ dailyCredits: 10, override: 20 }),
        'user-id',
        10,
        0.1,
        false,
      ),
    ).resolves.toBeUndefined();
    await expect(
      service.assertCanReserve(
        transaction({ dailyCredits: 20, override: 20 }),
        'user-id',
        1,
        0.1,
        false,
      ),
    ).rejects.toMatchObject({ response: { code: 'AI_DAILY_LIMIT_REACHED' } });
  });

  it('treats zero as a blocking override and null as the configured default', async () => {
    const service = new CreatorProtectionService(
      config({ AI_ENABLED: 'true' }),
      plans,
    );
    for (const overrides of [
      { dailyCredits: 0, override: 0 },
      { dailyCredits: 10, override: null },
    ]) {
      await expect(
        service.assertCanReserve(
          transaction(overrides),
          'user-id',
          1,
          0.1,
          false,
        ),
      ).rejects.toMatchObject({ response: { code: 'AI_DAILY_LIMIT_REACHED' } });
    }
  });

  it('uses the UTC day and counts pending/completed usage consistently for the admin display', async () => {
    const tx = transaction({ dailyCredits: 25, override: 20 });
    expect(
      await plans.dailyUsage(tx, 'user-id', new Date('2026-09-09T23:59:59Z')),
    ).toEqual({
      override: 20,
      defaultLimit: 10,
      limit: 20,
      used: 25,
      remaining: 0,
      resetsAt: '2026-09-10T00:00:00.000Z',
    });
    expect(tx.aiGeneration.aggregate).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        createdAt: { gte: new Date('2026-09-09T00:00:00Z') },
        status: { in: ['RESERVED', 'PROCESSING', 'COMPLETED'] },
      },
      _sum: { creditCost: true },
    });
  });

  it('keeps the provider budget enforced with a raised account allowance', async () => {
    const service = new CreatorProtectionService(
      config({
        AI_ENABLED: 'true',
        AI_DAILY_PROVIDER_BUDGET_USD: '1',
        AI_MONTHLY_PROVIDER_BUDGET_USD: '100',
      }),
      plans,
    );
    await expect(
      service.assertCanReserve(
        transaction({ dailyCredits: 10, override: 100, dailyProvider: 1 }),
        'user-id',
        1,
        0.1,
        false,
      ),
    ).rejects.toMatchObject({
      response: { code: 'AI_TEMPORARILY_UNAVAILABLE' },
    });
  });
});
