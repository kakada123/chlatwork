import { useGemini } from '../config/ai-provider';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import { createHash } from 'node:crypto';
import { CreatorCreditsService } from '../creator-ai/creator-credits.service';
import { BotAccessService } from './bot-access.service';

// SQL and Prisma add these values together. String literals also let source checks
// run before the deployment regenerates the Prisma client (without reading .env).
export type ChlatworkPaidFeature =
  'CHLATWORK_ASSISTANT' | 'CHLATWORK_VOICE' | 'CHLATWORK_RECEIPT';

@Injectable()
export class BotPaidAiService {
  constructor(
    private readonly credits: CreatorCreditsService,
    private readonly access: BotAccessService,
    private readonly config: ConfigService,
  ) {}

  async run<T>(
    userId: string,
    messageId: number,
    feature: ChlatworkPaidFeature,
    request: string | Uint8Array,
    operation: () => Promise<T>,
  ): Promise<T> {
    await this.access.assertAllowed('CHLATWORK', userId);
    const key = `chlatwork:${feature}:${messageId}`;
    const reservation = await this.credits.reserve({
      userId,
      feature: feature as AiFeature,
      sourceBot: 'CHLATWORK',
      idempotencyKey: key,
      requestHash: createHash('sha256').update(request).digest('hex'),
      inputSummary: `Telegram ${feature.toLowerCase().replace('chlatwork_', '')}`,
      credits: 1,
      isVideo: false,
    });
    if (reservation.kind === 'existing') {
      const result = reservation.generation.result as {
        sections?: { content?: string }[];
      } | null;
      if (
        reservation.generation.status === 'COMPLETED' &&
        result?.sections?.[0]?.content
      ) {
        return JSON.parse(result.sections[0].content) as T;
      }
      // An ambiguous/in-progress attempt must not repeat provider work or task
      // side effects. Failed attempts have already followed the refund policy.
      throw new ConflictException(
        'This AI request was already handled or is still processing. Send a new message to try again.',
      );
    }
    const started = Date.now();
    try {
      await this.access.assertAllowed('CHLATWORK', userId);
      await this.credits.markProcessing(reservation.generation.id);
      const result = await operation();
      const provider = useGemini(this.config) ? 'GEMINI' : 'OPENAI';
      await this.credits.complete(
        reservation.generation.id,
        {
          title: 'ChlatWork bot result',
          sections: [
            { id: 'result', label: 'Result', content: JSON.stringify(result) },
          ],
        },
        {
          provider,
          model: 'telegram-assistant',
          inputTokens: null,
          cachedInputTokens: null,
          outputTokens: null,
          audioSeconds: null,
          estimatedProviderCostUsd: 0,
          providerRequestId: null,
          durationMs: Date.now() - started,
        },
        'CHLATWORK',
      );
      return result;
    } catch (error) {
      await this.credits.refund(
        reservation.generation.id,
        'BOT_AI_FAILED',
        undefined,
        'CHLATWORK',
      );
      throw error;
    }
  }
}
