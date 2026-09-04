import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiCreditTransactionType,
  AiFeature,
  AiGenerationStatus,
  AiUsageStatus,
  Prisma,
  type AiGeneration,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CREATOR_AI_DEFAULTS } from './creator-ai.config';
import { CreatorAiException } from './creator-ai.errors';
import { CreatorPricingService } from './creator-pricing.service';
import { CreatorProtectionService } from './creator-protection.service';
import type {
  CreatorGenerationResult,
  CreatorProviderUsage,
  CreatorReservation,
} from './creator-ai.types';

@Injectable()
export class CreatorCreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly pricing: CreatorPricingService,
    private readonly protection: CreatorProtectionService,
  ) {}

  validateIdempotencyKey(value: string | undefined) {
    const key = value?.trim() ?? '';
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(key)) {
      throw new CreatorAiException(
        HttpStatus.BAD_REQUEST,
        'IDEMPOTENCY_KEY_REQUIRED',
        'A valid Idempotency-Key header is required.',
      );
    }
    return key;
  }

  async reserve(input: {
    userId: string;
    feature: AiFeature;
    idempotencyKey: string;
    requestHash: string;
    inputSummary: string;
    credits: number;
    isVideo: boolean;
  }): Promise<CreatorReservation> {
    const estimate = this.pricing.estimatedProviderCost(input.credits);
    return this.prisma.$transaction(
      async (tx) => {
        // The user lock serializes wallet, idempotency, and per-user limit checks.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-ai-user:${input.userId}`}))`;
        // The global lock prevents parallel reservations from overshooting the provider budget.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('creator-ai-global-budget'))`;

        const existing = await tx.aiGeneration.findUnique({
          where: {
            userId_feature_idempotencyKey: {
              userId: input.userId,
              feature: input.feature,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) {
          if (existing.requestHash !== input.requestHash) {
            throw new CreatorAiException(
              HttpStatus.CONFLICT,
              'IDEMPOTENCY_KEY_REUSED',
              'This idempotency key was already used for different content.',
            );
          }
          return {
            kind: 'existing' as const,
            generation: this.reservationGeneration(existing),
            balance: await this.walletBalance(tx, input.userId),
          };
        }

        await this.ensureWallet(tx, input.userId);
        await this.protection.assertCanReserve(
          tx,
          input.userId,
          input.credits,
          estimate,
          input.isVideo,
        );

        // Balance deduction and ledger creation share one transaction. The predicate
        // is the final authority and never permits a negative wallet under concurrency.
        const updated = await tx.$queryRaw<Array<{ balance: number }>>(Prisma.sql`
          UPDATE ai_wallets
          SET balance = balance - ${input.credits}, updated_at = now()
          WHERE user_id = ${input.userId}::uuid AND balance >= ${input.credits}
          RETURNING balance
        `);
        if (!updated[0]) {
          const available = await this.walletBalance(tx, input.userId);
          throw new CreatorAiException(
            HttpStatus.PAYMENT_REQUIRED,
            'INSUFFICIENT_AI_CREDITS',
            `You need ${input.credits} credits to generate this content.`,
            { requiredCredits: input.credits, availableCredits: available },
          );
        }

        const generation = await tx.aiGeneration.create({
          data: {
            userId: input.userId,
            feature: input.feature,
            idempotencyKey: input.idempotencyKey,
            requestHash: input.requestHash,
            inputSummary: input.inputSummary.slice(0, 160),
            creditCost: input.credits,
            estimatedProviderCostUsd: estimate,
          },
        });
        await tx.aiCreditTransaction.create({
          data: {
            userId: input.userId,
            type: AiCreditTransactionType.RESERVE,
            amount: -input.credits,
            feature: input.feature,
            referenceId: generation.id,
            balanceBefore: updated[0].balance + input.credits,
            balanceAfter: updated[0].balance,
            metadata: { generationId: generation.id },
          },
        });
        return {
          kind: 'created' as const,
          generation: this.reservationGeneration(generation),
          balance: updated[0].balance,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async markProcessing(generationId: string) {
    await this.prisma.aiGeneration.updateMany({
      where: { id: generationId, status: AiGenerationStatus.RESERVED },
      data: { status: AiGenerationStatus.PROCESSING },
    });
  }

  async complete(
    generationId: string,
    result: CreatorGenerationResult,
    usage: CreatorProviderUsage,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-ai-generation:${generationId}`}))`;
      const generation = await tx.aiGeneration.findUnique({
        where: { id: generationId },
      });
      if (!generation) throw new ConflictException('Generation not found');
      if (generation.status === AiGenerationStatus.COMPLETED) {
        return {
          balance: await this.walletBalance(tx, generation.userId),
          creditsCharged: generation.creditCost,
        };
      }
      if (generation.status === AiGenerationStatus.FAILED) {
        throw new ConflictException('Generation reservation was already refunded');
      }

      await tx.aiGeneration.update({
        where: { id: generationId },
        data: {
          status: AiGenerationStatus.COMPLETED,
          result: result as unknown as Prisma.InputJsonValue,
          providerRequestId: usage.providerRequestId,
          completedAt: new Date(),
        },
      });
      const balance = await this.walletBalance(tx, generation.userId);
      await tx.aiCreditTransaction.create({
        data: {
          userId: generation.userId,
          type: AiCreditTransactionType.CHARGE,
          amount: 0,
          feature: generation.feature,
          referenceId: generation.id,
          balanceBefore: balance,
          balanceAfter: balance,
          metadata: { reservedCreditsFinalized: generation.creditCost },
        },
      });
      await tx.aiUsageLog.upsert({
        where: { generationId },
        create: {
          generationId,
          userId: generation.userId,
          feature: generation.feature,
          provider: usage.provider,
          model: usage.model,
          inputTokens: usage.inputTokens,
          cachedInputTokens: usage.cachedInputTokens,
          outputTokens: usage.outputTokens,
          audioSeconds: usage.audioSeconds,
          creditsCharged: generation.creditCost,
          estimatedProviderCostUsd: Math.max(
            usage.estimatedProviderCostUsd,
            Number(generation.estimatedProviderCostUsd),
          ),
          providerRequestId: usage.providerRequestId,
          durationMs: usage.durationMs,
          status: AiUsageStatus.SUCCEEDED,
        },
        update: {},
      });
      return { balance, creditsCharged: generation.creditCost };
    });
  }

  async refund(
    generationId: string,
    errorCode: string,
    usage?: Partial<CreatorProviderUsage>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-ai-generation:${generationId}`}))`;
      const generation = await tx.aiGeneration.findUnique({
        where: { id: generationId },
      });
      if (!generation) return null;
      if (
        generation.status === AiGenerationStatus.FAILED ||
        generation.status === AiGenerationStatus.COMPLETED
      ) {
        return this.walletBalance(tx, generation.userId);
      }

      const wallet = await tx.aiWallet.update({
        where: { userId: generation.userId },
        data: { balance: { increment: generation.creditCost } },
      });
      await tx.aiGeneration.update({
        where: { id: generation.id },
        data: {
          status: AiGenerationStatus.FAILED,
          errorCode,
          completedAt: new Date(),
        },
      });
      await tx.aiCreditTransaction.create({
        data: {
          userId: generation.userId,
          type: AiCreditTransactionType.REFUND,
          amount: generation.creditCost,
          feature: generation.feature,
          referenceId: generation.id,
          balanceBefore: wallet.balance - generation.creditCost,
          balanceAfter: wallet.balance,
          metadata: { errorCode },
        },
      });
      await tx.aiUsageLog.upsert({
        where: { generationId },
        create: {
          generationId,
          userId: generation.userId,
          feature: generation.feature,
          provider: usage?.provider ?? 'OPENAI',
          model: usage?.model ?? 'not-called',
          inputTokens: usage?.inputTokens,
          cachedInputTokens: usage?.cachedInputTokens,
          outputTokens: usage?.outputTokens,
          audioSeconds: usage?.audioSeconds,
          creditsCharged: 0,
          estimatedProviderCostUsd: Math.max(
            usage?.estimatedProviderCostUsd ?? 0,
            Number(generation.estimatedProviderCostUsd),
          ),
          providerRequestId: usage?.providerRequestId,
          durationMs: usage?.durationMs ?? 0,
          status: AiUsageStatus.FAILED,
          errorCode,
        },
        update: {},
      });
      return wallet.balance;
    });
  }

  async getBalance(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-ai-user:${userId}`}))`;
      const wallet = await this.ensureWallet(tx, userId);
      return { balance: wallet.balance };
    });
  }

  async transactions(userId: string) {
    return this.prisma.aiCreditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        amount: true,
        feature: true,
        balanceAfter: true,
        createdAt: true,
      },
    });
  }

  async history(userId: string) {
    return this.prisma.aiGeneration.findMany({
      where: { userId, status: AiGenerationStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        feature: true,
        inputSummary: true,
        result: true,
        creditCost: true,
        createdAt: true,
      },
    });
  }

  private async ensureWallet(tx: Prisma.TransactionClient, userId: string) {
    const existing = await tx.aiWallet.findUnique({ where: { userId } });
    if (existing) return existing;
    const initialCredits = this.number(
      'AI_INITIAL_CREDITS',
      CREATOR_AI_DEFAULTS.initialCredits,
    );
    const wallet = await tx.aiWallet.create({
      data: { userId, balance: initialCredits },
    });
    await tx.aiCreditTransaction.create({
      data: {
        userId,
        type: AiCreditTransactionType.GRANT,
        amount: initialCredits,
        referenceId: `INITIAL_GRANT:${userId}`,
        balanceBefore: 0,
        balanceAfter: initialCredits,
        metadata: { source: 'INITIAL_ACCOUNT_GRANT' },
      },
    });
    return wallet;
  }

  private async walletBalance(tx: Prisma.TransactionClient, userId: string) {
    return (await tx.aiWallet.findUnique({ where: { userId } }))?.balance ?? 0;
  }

  private reservationGeneration(generation: AiGeneration) {
    return {
      id: generation.id,
      feature: generation.feature,
      status: generation.status,
      creditCost: generation.creditCost,
      result: generation.result,
      errorCode: generation.errorCode,
    };
  }

  private number(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) ? Math.floor(value) : fallback;
  }
}
