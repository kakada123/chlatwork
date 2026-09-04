import type { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import type { CreatorPlanLimitsService } from './creator-plan-limits.service';
import { CreatorProtectionService } from './creator-protection.service';

describe('CreatorProtectionService', () => {
  const plans = {
    forUser: jest.fn().mockReturnValue({
      ratePerMinute: 5,
      ratePerHour: 20,
      dailyCredits: 10,
      maxVideoSeconds: 180,
      maxVideoBytes: 100,
      maxConcurrentVideoJobs: 1,
    }),
  } as unknown as CreatorPlanLimitsService;

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
  }) {
    return {
      aiGeneration: {
        count: jest
          .fn()
          .mockResolvedValueOnce(overrides.minute ?? 0)
          .mockResolvedValueOnce(overrides.hour ?? 0),
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({ _sum: { creditCost: overrides.dailyCredits ?? 0 } })
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
      service.assertCanReserve(transaction({ minute: 5 }), 'user-id', 1, 0.01, false),
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
});
