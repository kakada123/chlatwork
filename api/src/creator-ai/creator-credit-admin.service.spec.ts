import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorCreditAdminController } from './creator-credit-admin.controller';
import { CreatorCreditAdminService } from './creator-credit-admin.service';
import { CreatorCreditsService } from './creator-credits.service';
import type { CreatorPlanLimitsService } from './creator-plan-limits.service';
import {
  AdjustCreatorCreditsDto,
  CreatorCreditUsersQueryDto,
  UpdateCreatorUsageLimitDto,
} from './dto/creator-credit-admin.dto';

const input = {
  userId: 'ba668858-dbc8-46c0-80eb-049072e22682',
  amount: 5,
  expectedBalance: 20,
  reason: 'Support credit',
};
const key = 'credit-adjustment-0001';

function setup(initialBalance: number | null = 20) {
  let balance = initialBalance;
  let entries: any[] = [];
  let limit: number | null = null;
  let changes: any[] = [];
  let serial = Promise.resolve();
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    user: {
      findFirst: jest.fn(async () => ({
        id: input.userId,
        aiDailyCreditLimit: limit,
      })),
      update: jest.fn(async ({ data }) => {
        limit = data.aiDailyCreditLimit;
        return data;
      }),
    },
    aiUsageLimitChange: {
      findUnique: jest.fn(
        async ({ where }) =>
          changes.find((entry) => entry.id === where.id) ?? null,
      ),
      create: jest.fn(async ({ data }) => {
        changes.push(data);
        return data;
      }),
    },
    aiWallet: {
      findUnique: jest.fn(async () => (balance === null ? null : { balance })),
      updateMany: jest.fn(async ({ where, data }) => {
        if (balance !== where.balance) return { count: 0 };
        balance = data.balance;
        return { count: 1 };
      }),
      create: jest.fn(async ({ data }) => {
        balance = data.balance;
        return data;
      }),
    },
    aiCreditTransaction: {
      findFirst: jest.fn(
        async ({ where }) =>
          entries.find((entry) => entry.referenceId === where.referenceId) ??
          null,
      ),
      create: jest.fn(async ({ data }) => {
        const entry = { id: `entry-${entries.length}`, ...data };
        entries.push(entry);
        return entry;
      }),
    },
  };
  // Model transaction rollback and serialization; live PostgreSQL locking still
  // needs integration verification against a database before deployment.
  const prisma = {
    $transaction: jest.fn((callback) => {
      const pending = serial.then(async () => {
        const before = balance;
        const limitBefore = limit;
        const changesBefore = [...changes];
        const ledgerBefore = [...entries];
        try {
          return await callback(tx);
        } catch (error) {
          balance = before;
          limit = limitBefore;
          changes = changesBefore;
          entries = ledgerBefore;
          throw error;
        }
      });
      serial = pending.then(
        () => undefined,
        () => undefined,
      );
      return pending;
    }),
  };
  const credits = {
    validateIdempotencyKey:
      CreatorCreditsService.prototype.validateIdempotencyKey,
  };
  return {
    service: new CreatorCreditAdminService(
      prisma as unknown as PrismaService,
      credits as CreatorCreditsService,
      {} as CreatorPlanLimitsService,
    ),
    tx,
    prisma,
    balance: () => balance,
    limit: () => limit,
    changes: () => changes,
    entries: () => entries,
  };
}

describe('Creator admin credit security and validation', () => {
  it('requires both an authenticated session and an admin role on every credit admin route', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CreatorCreditAdminController),
    ).toEqual([JwtAuthGuard, AdminGuard]);
    const guard = new AdminGuard();
    for (const user of [undefined, { role: 'USER' }]) {
      const context = {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      } as ExecutionContext;
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    }
    expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'ADMIN' } }),
        }),
      } as ExecutionContext),
    ).toBe(true);
  });

  it.each([
    { amount: 0 },
    { amount: 1.5 },
    { amount: 100001 },
    { amount: -100001 },
    { expectedBalance: -1 },
    { expectedBalance: 2147483648 },
    { reason: '   ' },
    { reason: 'x'.repeat(241) },
    { userId: 'not-an-id' },
  ])('rejects invalid adjustment %j', async (override) => {
    expect(
      await validate(
        plainToInstance(AdjustCreatorCreditsDto, { ...input, ...override }),
      ),
    ).not.toHaveLength(0);
  });

  it('trims the audit reason and accepts bounded signed whole credits', async () => {
    const dto = plainToInstance(AdjustCreatorCreditsDto, {
      ...input,
      amount: -5,
      reason: '  Correct support credit  ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.reason).toBe('Correct support credit');
    expect(
      await validate(plainToInstance(CreatorCreditUsersQueryDto, { page: 0 })),
    ).not.toHaveLength(0);
  });
});

describe('Creator admin credit adjustments', () => {
  it('records an atomic adjustment with the responsible admin and reason', async () => {
    const test = setup();
    expect(await test.service.adjust('admin-id', key, input)).toEqual({
      transactionId: 'entry-0',
      balance: 25,
    });
    expect(test.balance()).toBe(25);
    expect(test.entries()[0]).toMatchObject({
      userId: input.userId,
      type: 'ADMIN_ADJUSTMENT',
      amount: 5,
      balanceBefore: 20,
      balanceAfter: 25,
      metadata: { adminUserId: 'admin-id', reason: input.reason },
    });
  });

  it('applies concurrent retries of one confirmation only once', async () => {
    const test = setup();
    const results = await Promise.all([
      test.service.adjust('admin-id', key, input),
      test.service.adjust('admin-id', key, input),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(test.balance()).toBe(25);
    expect(test.entries()).toHaveLength(1);
  });

  it.each([
    { amount: 6 },
    { expectedBalance: 25 },
    { reason: 'Another reason' },
    { userId: 'other-user' },
  ])(
    'rejects reusing a confirmation with changed intent %j',
    async (override) => {
      const test = setup();
      await test.service.adjust('admin-id', key, input);
      await expect(
        test.service.adjust('admin-id', key, { ...input, ...override }),
      ).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_KEY_REUSED' } });
      expect(test.balance()).toBe(25);
      expect(test.entries()).toHaveLength(1);
    },
  );

  it('allows a reviewed removal down to exactly zero', async () => {
    const test = setup();
    await test.service.adjust('admin-id', key, { ...input, amount: -20 });
    expect(test.balance()).toBe(0);
  });

  it.each([
    { initial: 20, amount: -21 },
    { initial: 2147483647, amount: 1 },
  ])(
    'rejects balances outside the stored integer range %j',
    async ({ initial, amount }) => {
      const test = setup(initial);
      await expect(
        test.service.adjust('admin-id', key, {
          ...input,
          amount,
          expectedBalance: initial,
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(test.balance()).toBe(initial);
      expect(test.entries()).toHaveLength(0);
    },
  );

  it('rejects a stale review before changing the wallet', async () => {
    const test = setup(18);
    await expect(
      test.service.adjust('admin-id', key, input),
    ).rejects.toMatchObject({ response: { code: 'CREDIT_BALANCE_CHANGED' } });
    expect(test.tx.aiWallet.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a concurrent refund detected by the conditional wallet update', async () => {
    const test = setup();
    test.tx.aiWallet.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      test.service.adjust('admin-id', key, input),
    ).rejects.toMatchObject({ response: { code: 'CREDIT_BALANCE_CHANGED' } });
    expect(test.entries()).toHaveLength(0);
  });

  it('initializes a missing wallet only with the confirmed starting balance', async () => {
    const test = setup(null);
    await test.service.adjust('admin-id', key, {
      ...input,
      expectedBalance: 0,
    });
    expect(test.balance()).toBe(5);
    expect(test.tx.aiWallet.create).toHaveBeenCalledTimes(1);
    expect(test.entries()).toHaveLength(1);
  });

  it('rolls back the balance if the audit ledger cannot be written', async () => {
    const test = setup();
    test.tx.aiCreditTransaction.create.mockRejectedValueOnce(
      new Error('Database unavailable'),
    );
    await expect(test.service.adjust('admin-id', key, input)).rejects.toThrow(
      'Database unavailable',
    );
    expect(test.balance()).toBe(20);
    expect(test.entries()).toHaveLength(0);
  });

  it('rejects an invalid retry key before starting a transaction', async () => {
    const test = setup();
    await expect(
      test.service.adjust('admin-id', undefined, input),
    ).rejects.toMatchObject({ status: 400 });
    expect(test.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects inactive or missing target accounts without changing credits', async () => {
    const test = setup();
    test.tx.user.findFirst.mockResolvedValueOnce(null as never);
    await expect(
      test.service.adjust('admin-id', key, input),
    ).rejects.toMatchObject({ status: 404 });
    expect(test.tx.aiWallet.updateMany).not.toHaveBeenCalled();
  });
});

describe('Creator admin usage limits', () => {
  const limitInput = {
    userId: input.userId,
    dailyCreditLimit: 30,
    expectedLimit: null,
    reason: 'Support allowance',
  };

  it.each([
    { dailyCreditLimit: -1 },
    { dailyCreditLimit: 1.5 },
    { dailyCreditLimit: 100001 },
    { dailyCreditLimit: undefined },
    { dailyCreditLimit: '' },
    { dailyCreditLimit: false },
    { expectedLimit: undefined },
    { expectedLimit: -1 },
    { expectedLimit: '10' },
    { reason: '  ' },
    { reason: 'x'.repeat(241) },
    { userId: 'bad' },
  ])('rejects invalid limit change %j', async (override) => {
    expect(
      await validate(
        plainToInstance(UpdateCreatorUsageLimitDto, {
          ...limitInput,
          ...override,
        }),
      ),
    ).not.toHaveLength(0);
  });

  it.each([0, 100000, null])(
    'accepts explicit daily allowance %s',
    async (dailyCreditLimit) => {
      expect(
        await validate(
          plainToInstance(UpdateCreatorUsageLimitDto, {
            ...limitInput,
            dailyCreditLimit,
          }),
        ),
      ).toHaveLength(0);
    },
  );

  it('saves and audits the limit without touching wallet credits or generation history', async () => {
    const test = setup();
    await test.service.updateUsageLimit('admin-id', key, limitInput);
    expect(test.limit()).toBe(30);
    expect(test.balance()).toBe(20);
    expect(test.entries()).toHaveLength(0);
    expect(test.changes()).toEqual([
      expect.objectContaining({
        adminUserId: 'admin-id',
        previousLimit: null,
        dailyCreditLimit: 30,
        reason: limitInput.reason,
      }),
    ]);
    expect(test.tx.$executeRaw.mock.calls[1][1]).toBe(
      `creator-ai-user:${input.userId}`,
    );
  });

  it('serializes concurrent retries and records a single limit change', async () => {
    const test = setup();
    const results = await Promise.all([
      test.service.updateUsageLimit('admin-id', key, limitInput),
      test.service.updateUsageLimit('admin-id', key, limitInput),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(test.changes()).toHaveLength(1);
  });

  it.each([
    { dailyCreditLimit: 50 },
    { expectedLimit: 30 },
    { reason: 'Different reason' },
    { userId: 'other-user' },
  ])('rejects retry with changed intent %j', async (override) => {
    const test = setup();
    await test.service.updateUsageLimit('admin-id', key, limitInput);
    await expect(
      test.service.updateUsageLimit('admin-id', key, {
        ...limitInput,
        ...override,
      }),
    ).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_KEY_REUSED' } });
    expect(test.limit()).toBe(30);
    expect(test.changes()).toHaveLength(1);
  });

  it('rejects a stale review, then supports restoring the default from a fresh review', async () => {
    const test = setup();
    await test.service.updateUsageLimit('admin-id', key, limitInput);
    await expect(
      test.service.updateUsageLimit(
        'admin-id',
        'another-limit-change',
        limitInput,
      ),
    ).rejects.toMatchObject({ response: { code: 'AI_USAGE_LIMIT_CHANGED' } });
    await test.service.updateUsageLimit('admin-id', 'restore-default-limit', {
      ...limitInput,
      expectedLimit: 30,
      dailyCreditLimit: null,
    });
    expect(test.limit()).toBeNull();
    expect(test.changes()).toHaveLength(2);
    // Replaying an older success must never overwrite a later admin decision.
    await test.service.updateUsageLimit('admin-id', key, limitInput);
    expect(test.limit()).toBeNull();
  });

  it('rolls back the limit if its audit record fails', async () => {
    const test = setup();
    test.tx.aiUsageLimitChange.create.mockRejectedValueOnce(
      new Error('Audit unavailable'),
    );
    await expect(
      test.service.updateUsageLimit('admin-id', key, limitInput),
    ).rejects.toThrow('Audit unavailable');
    expect(test.limit()).toBeNull();
    expect(test.changes()).toHaveLength(0);
  });

  it('rejects missing retry keys and unavailable accounts', async () => {
    const test = setup();
    await expect(
      test.service.updateUsageLimit('admin-id', undefined, limitInput),
    ).rejects.toMatchObject({ status: 400 });
    expect(test.prisma.$transaction).not.toHaveBeenCalled();
    test.tx.user.findFirst.mockResolvedValueOnce(null as never);
    await expect(
      test.service.updateUsageLimit('admin-id', key, limitInput),
    ).rejects.toMatchObject({ status: 404 });
    expect(test.tx.user.update).not.toHaveBeenCalled();
  });
});
