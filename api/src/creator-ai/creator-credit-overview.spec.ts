import { ConfigService } from '@nestjs/config';
import { AiFeature, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorCreditsService } from './creator-credits.service';
import { CreatorPricingService } from './creator-pricing.service';
import { CreatorProtectionService } from './creator-protection.service';
import type { CreatorPlanLimitsService } from './creator-plan-limits.service';
import { CreatorCreditAdminService } from './creator-credit-admin.service';

describe('Creator credit overview', () => {
  it('reports all-time totals without counting reservations or zero-amount charges as completed spending', async () => {
    const rows = [{ id: 'recent-charge', type: 'CHARGE', amount: 0 }];
    const tx = {
      aiWallet: { findUnique: jest.fn().mockResolvedValue({ balance: 39 }) },
      aiCreditTransaction: {
        groupBy: jest.fn().mockResolvedValue([
          { type: 'GRANT', _sum: { amount: 20 } },
          { type: 'PURCHASE', _sum: { amount: 30 } },
          { type: 'RESERVE', _sum: { amount: -17 } },
          { type: 'CHARGE', _sum: { amount: 0 } },
          { type: 'REFUND', _sum: { amount: 4 } },
          { type: 'ADMIN_ADJUSTMENT', _sum: { amount: 3 } },
          { type: 'EXPIRE', _sum: { amount: -1 } },
        ]),
        findMany: jest.fn().mockResolvedValue(rows),
      },
      aiGeneration: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'COMPLETED', _sum: { creditCost: 10 } },
          { status: 'RESERVED', _sum: { creditCost: 1 } },
          { status: 'PROCESSING', _sum: { creditCost: 2 } },
          { status: 'FAILED', _sum: { creditCost: 4 } },
        ]),
      },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const pricing = {
      catalogue: jest
        .fn()
        .mockReturnValue([{ feature: 'POST', credits: 2, unit: 'generation' }]),
    };
    const service = new CreatorCreditsService(
      prisma as unknown as PrismaService,
      {} as ConfigService,
      pricing as unknown as CreatorPricingService,
      {} as CreatorProtectionService,
    );
    const grant = jest
      .spyOn(service, 'getBalance')
      .mockResolvedValue({ balance: 39 });
    const overview = await service.overview('owner');
    expect(grant).toHaveBeenCalledWith('owner');
    expect(overview).toMatchObject({
      balance: 39,
      totals: {
        received: 50,
        used: 10,
        reserved: 3,
        refunded: 4,
        adjustments: 2,
      },
      transactions: rows,
      transactionLimit: 100,
    });
    expect(overview.balance).toBe(
      overview.totals.received -
        overview.totals.used -
        overview.totals.reserved +
        overview.totals.adjustments,
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    for (const query of [
      tx.aiWallet.findUnique,
      tx.aiCreditTransaction.groupBy,
      tx.aiCreditTransaction.findMany,
      tx.aiGeneration.groupBy,
    ]) {
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'owner' } }),
      );
    }
    expect(
      tx.aiCreditTransaction.findMany.mock.calls[0][0].select,
    ).not.toHaveProperty('metadata');
    expect(tx.aiCreditTransaction.groupBy.mock.calls[0][0]).not.toHaveProperty(
      'take',
    );
    expect(overview.prices).toEqual(pricing.catalogue());
  });

  it('uses the same configured tool prices in the catalogue and billing', () => {
    const config = {
      get: (key: string) =>
        ({
          AI_CREDIT_PRICE_POST: 7,
          AI_CREDIT_PRICE_VIDEO_CAPTION_PER_MINUTE: 9,
        })[key],
    };
    const pricing = new CreatorPricingService(config as ConfigService);
    expect(pricing.catalogue()).toEqual(
      expect.arrayContaining([
        {
          feature: AiFeature.POST,
          unit: 'generation',
          credits: pricing.fixed(AiFeature.POST),
        },
        {
          feature: AiFeature.VIDEO_CAPTION,
          unit: 'minute',
          credits: pricing.video(AiFeature.VIDEO_CAPTION, 60),
        },
      ]),
    );
    expect(pricing.video(AiFeature.VIDEO_CAPTION, 61)).toBe(18);
  });

  it('admin account browsing never grants credits and only exposes intended audit fields', async () => {
    const prisma = {
      aiUsageLimitChange: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'target', name: 'Test', email: null, aiWallet: null },
          ]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 'target',
            name: 'Test',
            email: null,
            aiWallet: null,
          }),
      },
      aiCreditTransaction: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: 'entry',
              metadata: {
                reason: 'Support credit',
                adminUserId: 'actor',
                internalOnly: 'omit',
              },
            },
          ]),
      },
    };
    const credits = { getBalance: jest.fn() };
    const service = new CreatorCreditAdminService(
      prisma as unknown as PrismaService,
      credits as unknown as CreatorCreditsService,
      { dailyUsage: jest.fn().mockResolvedValue({ limit: 10 }) } as unknown as CreatorPlanLimitsService,
    );
    expect(await service.users({ search: ' Test ', page: 2 })).toMatchObject({
      items: [{ balance: 0, hasWallet: false }],
      page: 2,
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: {
          isActive: true,
          OR: [
            { name: { contains: 'Test', mode: 'insensitive' } },
            { email: { contains: 'Test', mode: 'insensitive' } },
          ],
        },
      }),
    );
    const details = await service.details('target');
    expect(details.transactions).toEqual([
      { id: 'entry', reason: 'Support credit', adminUserId: 'actor' },
    ]);
    expect(prisma.aiCreditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'target' }, take: 50 }),
    );
    expect(credits.getBalance).not.toHaveBeenCalled();
  });
});
