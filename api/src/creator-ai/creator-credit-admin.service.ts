import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiCreditTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorCreditsService } from './creator-credits.service';
import { CreatorPlanLimitsService } from './creator-plan-limits.service';
import type {
  AdjustCreatorCreditsDto,
  CreatorCreditUsersQueryDto,
  UpdateCreatorUsageLimitDto,
} from './dto/creator-credit-admin.dto';

@Injectable()
export class CreatorCreditAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreatorCreditsService,
    private readonly plans: CreatorPlanLimitsService,
  ) {}

  async users(query: CreatorCreditUsersQueryDto) {
    const search = query.search.trim();
    const where: Prisma.UserWhereInput = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * 20,
        take: 20,
        select: {
          id: true,
          name: true,
          email: true,
          aiWallet: { select: { balance: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: users.map(({ aiWallet, ...user }) => ({
        ...user,
        balance: aiWallet?.balance ?? 0,
        hasWallet: Boolean(aiWallet),
      })),
      total,
      page: query.page,
      pageSize: 20,
    };
  }

  async details(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        aiWallet: { select: { balance: true } },
      },
    });
    if (!user) throw new NotFoundException('Account not found.');
    const usage = await this.plans.dailyUsage(this.prisma, userId);
    const usageLimitChanges = await this.prisma.aiUsageLimitChange.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 20,
      select: {
        id: true,
        previousLimit: true,
        dailyCreditLimit: true,
        adminUserId: true,
        reason: true,
        createdAt: true,
      },
    });
    const transactions = await this.prisma.aiCreditTransaction.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      select: {
        id: true,
        type: true,
        amount: true,
        feature: true,
        balanceAfter: true,
        createdAt: true,
        metadata: true,
      },
    });
    return {
      usage,
      usageLimitChanges,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.aiWallet?.balance ?? 0,
        hasWallet: Boolean(user.aiWallet),
      },
      transactions: transactions.map(({ metadata, ...entry }) => {
        const audit = this.audit(metadata);
        return {
          ...entry,
          reason: audit.reason,
          adminUserId: audit.adminUserId,
        };
      }),
    };
  }

  async adjust(
    adminUserId: string,
    idempotencyHeader: string | undefined,
    input: AdjustCreatorCreditsDto,
  ) {
    const key = this.credits.validateIdempotencyKey(idempotencyHeader);
    const referenceId = `ADMIN:${createHash('sha256').update(`${adminUserId}:${key}`).digest('hex')}`;
    return this.prisma.$transaction(async (tx) => {
      // Serialize retries across targets, then share the wallet lock used by generations.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${referenceId}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-ai-user:${input.userId}`}))`;
      const existing = await tx.aiCreditTransaction.findFirst({
        where: { type: AiCreditTransactionType.ADMIN_ADJUSTMENT, referenceId },
      });
      if (existing) {
        if (
          existing.userId !== input.userId ||
          existing.amount !== input.amount ||
          existing.balanceBefore !== input.expectedBalance ||
          this.audit(existing.metadata).reason !== input.reason
        ) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_REUSED',
            message:
              'This confirmation was already used for a different adjustment.',
          });
        }
        return { transactionId: existing.id, balance: existing.balanceAfter };
      }
      const user = await tx.user.findFirst({
        where: { id: input.userId, isActive: true },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('Account not found.');
      const wallet = await tx.aiWallet.findUnique({
        where: { userId: input.userId },
      });
      const balance = wallet?.balance ?? 0;
      if (balance !== input.expectedBalance) throw this.balanceChanged();
      const nextBalance = balance + input.amount;
      if (
        !Number.isSafeInteger(nextBalance) ||
        nextBalance < 0 ||
        nextBalance > 2147483647
      ) {
        throw new BadRequestException(
          'The resulting credit balance is outside the allowed range.',
        );
      }
      if (wallet) {
        const updated = await tx.aiWallet.updateMany({
          where: { userId: input.userId, balance: input.expectedBalance },
          data: { balance: nextBalance },
        });
        // Refunds can update a wallet under a generation lock; catch those races too.
        if (updated.count !== 1) throw this.balanceChanged();
      } else {
        // A confirmed first grant initializes the wallet. It must not also receive
        // a second, automatic welcome grant when the user opens Creator later.
        await tx.aiWallet.create({
          data: { userId: input.userId, balance: nextBalance },
        });
      }
      const transaction = await tx.aiCreditTransaction.create({
        data: {
          userId: input.userId,
          type: AiCreditTransactionType.ADMIN_ADJUSTMENT,
          amount: input.amount,
          referenceId,
          balanceBefore: balance,
          balanceAfter: nextBalance,
          metadata: { adminUserId, reason: input.reason },
        },
      });
      return { transactionId: transaction.id, balance: nextBalance };
    });
  }

  async updateUsageLimit(
    adminUserId: string,
    idempotencyHeader: string | undefined,
    input: UpdateCreatorUsageLimitDto,
  ) {
    const key = this.credits.validateIdempotencyKey(idempotencyHeader);
    const id = createHash('sha256')
      .update(`USAGE:${adminUserId}:${key}`)
      .digest('hex');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-usage:${id}`}))`;
      // Share the reservation lock so new generations see a complete limit change.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-ai-user:${input.userId}`}))`;
      const existing = await tx.aiUsageLimitChange.findUnique({
        where: { id },
      });
      if (existing) {
        if (
          existing.userId !== input.userId ||
          existing.dailyCreditLimit !== input.dailyCreditLimit ||
          existing.previousLimit !== input.expectedLimit ||
          existing.reason !== input.reason
        ) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_REUSED',
            message:
              'This confirmation was already used for a different limit change.',
          });
        }
        return { changeId: id, dailyCreditLimit: existing.dailyCreditLimit };
      }
      const user = await tx.user.findFirst({
        where: { id: input.userId, isActive: true },
        select: { aiDailyCreditLimit: true },
      });
      if (!user) throw new NotFoundException('Account not found.');
      if (user.aiDailyCreditLimit !== input.expectedLimit) {
        throw new ConflictException({
          code: 'AI_USAGE_LIMIT_CHANGED',
          message:
            'This usage limit changed. Refresh the account and review it again.',
        });
      }
      await tx.user.update({
        where: { id: input.userId },
        data: { aiDailyCreditLimit: input.dailyCreditLimit },
      });
      await tx.aiUsageLimitChange.create({
        data: {
          id,
          userId: input.userId,
          adminUserId,
          previousLimit: input.expectedLimit,
          dailyCreditLimit: input.dailyCreditLimit,
          reason: input.reason,
        },
      });
      return { changeId: id, dailyCreditLimit: input.dailyCreditLimit };
    });
  }

  private balanceChanged() {
    return new ConflictException({
      code: 'CREDIT_BALANCE_CHANGED',
      message:
        'This balance changed. Refresh the account and review the adjustment again.',
    });
  }

  private audit(metadata: Prisma.JsonValue | null) {
    const value =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? metadata
        : {};
    return {
      reason: typeof value.reason === 'string' ? value.reason : null,
      adminUserId:
        typeof value.adminUserId === 'string' ? value.adminUserId : null,
    };
  }
}
