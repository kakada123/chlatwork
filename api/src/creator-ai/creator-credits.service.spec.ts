import type { ConfigService } from '@nestjs/config';
import { AiFeature, AiGenerationStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { CreatorCreditsService } from './creator-credits.service';
import type { CreatorPricingService } from './creator-pricing.service';
import type { CreatorProtectionService } from './creator-protection.service';

describe('CreatorCreditsService atomic reservation', () => {
  function setup(initialBalance: number) {
    let balance = initialBalance;
    let serial = Promise.resolve();
    const generations = new Map<string, Record<string, unknown>>();
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn(async (query: { values?: unknown[] }) => {
        const cost = Number(query.values?.[0] ?? 0);
        if (balance < cost) return [];
        balance -= cost;
        return [{ balance }];
      }),
      aiWallet: {
        findUnique: jest.fn(async () => ({ userId: 'user-id', balance })),
        create: jest.fn(),
        update: jest.fn(async ({ data }: { data: { balance: { increment: number } } }) => {
          balance += data.balance.increment;
          return { userId: 'user-id', balance };
        }),
      },
      aiGeneration: {
        findUnique: jest.fn(async ({ where }: { where: { id?: string; userId_feature_idempotencyKey?: { idempotencyKey: string } } }) => {
          if (where.id) {
            return [...generations.values()].find((item) => item.id === where.id) ?? null;
          }
          return generations.get(where.userId_feature_idempotencyKey!.idempotencyKey) ?? null;
        }),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const generation = {
            id: `generation-${generations.size + 1}`,
            status: AiGenerationStatus.RESERVED,
            result: null,
            errorCode: null,
            ...data,
          };
          generations.set(String(data.idempotencyKey), generation);
          return generation;
        }),
        update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const generation = [...generations.values()].find((item) => item.id === where.id)!;
          Object.assign(generation, data);
          return generation;
        }),
      },
      aiCreditTransaction: { create: jest.fn() },
      aiUsageLog: { upsert: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => {
        const execution = serial.then(() => callback(tx));
        serial = execution.then(() => undefined, () => undefined);
        return execution;
      }),
    };
    const config = { get: jest.fn() } as unknown as ConfigService;
    const pricing = {
      estimatedProviderCost: jest.fn().mockReturnValue(0.01),
    } as unknown as CreatorPricingService;
    const protection = {
      assertCanReserve: jest.fn(),
    } as unknown as CreatorProtectionService;
    const service = new CreatorCreditsService(
      prisma as unknown as PrismaService,
      config,
      pricing,
      protection,
    );
    return { service, getBalance: () => balance };
  }

  const reserve = (service: CreatorCreditsService, key: string) =>
    service.reserve({
      userId: 'user-id',
      feature: AiFeature.POST,
      idempotencyKey: key,
      requestHash: key.padEnd(64, '0').slice(0, 64),
      inputSummary: 'Post',
      credits: 2,
      isVideo: false,
    });

  it('changes a 10 credit wallet to 8 inside the reservation transaction', async () => {
    const { service, getBalance } = setup(10);
    await reserve(service, 'idempotency-key-0001');
    expect(getBalance()).toBe(8);
  });

  it('rejects without making a negative balance', async () => {
    const { service, getBalance } = setup(1);
    await expect(reserve(service, 'idempotency-key-0001')).rejects.toMatchObject({
      response: { code: 'INSUFFICIENT_AI_CREDITS' },
    });
    expect(getBalance()).toBe(1);
  });

  it('allows only one of two parallel full-balance reservations', async () => {
    const { service, getBalance } = setup(2);
    const outcomes = await Promise.allSettled([
      reserve(service, 'idempotency-key-0001'),
      reserve(service, 'idempotency-key-0002'),
    ]);
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(1);
    expect(getBalance()).toBe(0);
  });

  it('restores reserved credits once when generation fails', async () => {
    const { service, getBalance } = setup(10);
    const reservation = await reserve(service, 'idempotency-key-0001');
    expect(getBalance()).toBe(8);
    await service.refund(reservation.generation.id, 'AI_GENERATION_FAILED');
    await service.refund(reservation.generation.id, 'AI_GENERATION_FAILED');
    expect(getBalance()).toBe(10);
  });
});
