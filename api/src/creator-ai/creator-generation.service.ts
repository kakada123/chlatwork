import { createHash } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AiFeature } from '@prisma/client';
import { CreatorAiGatewayService } from './creator-ai-gateway.service';
import {
  CreatorAiException,
  creatorGenerationFailed,
} from './creator-ai.errors';
import { CreatorCreditsService } from './creator-credits.service';
import { buildCreatorTextPrompt } from './creator-prompts';
import { CreatorPricingService } from './creator-pricing.service';
import type {
  CreatorGenerationResult,
  CreatorTextGenerationInput,
} from './creator-ai.types';

export interface CreatorImageUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const MAX_CREATOR_IMAGE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class CreatorGenerationService {
  constructor(
    private readonly gateway: CreatorAiGatewayService,
    private readonly credits: CreatorCreditsService,
    private readonly pricing: CreatorPricingService,
  ) {}

  async generate(
    userId: string,
    input: Omit<CreatorTextGenerationInput, 'idempotencyKey'>,
    idempotencyHeader: string | undefined,
  ) {
    const idempotencyKey = this.credits.validateIdempotencyKey(idempotencyHeader);
    const image = input.image ? this.validateImage(input.image) : undefined;
    const requestHash = hashRequest(input.feature, input.payload, image?.bytes);
    const cost = this.pricing.fixed(input.feature);
    const reservation = await this.credits.reserve({
      userId,
      feature: input.feature,
      idempotencyKey,
      requestHash,
      inputSummary: input.inputSummary,
      credits: cost,
      isVideo: false,
    });

    if (reservation.kind === 'existing') {
      return this.existingResponse(reservation);
    }

    try {
      await this.credits.markProcessing(reservation.generation.id);
      const generated = await this.gateway.generateStructured(
        input.feature,
        reservation.generation.id,
        buildCreatorTextPrompt(input.feature, input.payload),
        image,
      );
      const charged = await this.credits.complete(
        reservation.generation.id,
        generated.data,
        generated.usage,
      );
      return {
        generationId: reservation.generation.id,
        data: generated.data,
        usage: {
          creditsCharged: charged.creditsCharged,
          creditsRemaining: charged.balance,
        },
      };
    } catch (error) {
      await this.credits.refund(reservation.generation.id, 'AI_GENERATION_FAILED', {
        durationMs:
          error && typeof error === 'object' && 'durationMs' in error
            ? Number((error as { durationMs: unknown }).durationMs) || 0
            : 0,
      });
      throw creatorGenerationFailed();
    }
  }

  private existingResponse(reservation: Awaited<ReturnType<CreatorCreditsService['reserve']>>) {
    const generation = reservation.generation;
    if (generation.status === 'COMPLETED' && isCreatorResult(generation.result)) {
      return {
        generationId: generation.id,
        data: generation.result,
        usage: {
          creditsCharged: generation.creditCost,
          creditsRemaining: reservation.balance,
        },
        idempotentReplay: true,
      };
    }
    if (generation.status === 'FAILED') throw creatorGenerationFailed();
    throw new CreatorAiException(
      HttpStatus.CONFLICT,
      'AI_REQUEST_IN_PROGRESS',
      'This generation request is already processing.',
    );
  }

  private validateImage(image: { bytes: Buffer; mimeType: string }) {
    if (image.bytes.byteLength > MAX_CREATOR_IMAGE_BYTES) {
      throw new CreatorAiException(
        HttpStatus.PAYLOAD_TOO_LARGE,
        'AI_GENERATION_FAILED',
        'Reference images must be 5MB or smaller.',
      );
    }
    const detected = detectImageMime(image.bytes);
    if (!detected || detected !== image.mimeType) {
      throw new CreatorAiException(
        HttpStatus.BAD_REQUEST,
        'AI_GENERATION_FAILED',
        'Only valid JPEG, PNG, and WebP reference images are accepted.',
      );
    }
    return image;
  }
}

export function hashRequest(
  feature: AiFeature,
  payload: Record<string, unknown>,
  file?: Buffer,
) {
  const hash = createHash('sha256');
  hash.update(feature);
  hash.update(stableJson(payload));
  if (file) hash.update(createHash('sha256').update(file).digest());
  return hash.digest('hex');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function detectImageMime(bytes: Buffer) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }
  if (
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

function isCreatorResult(value: unknown): value is CreatorGenerationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Partial<CreatorGenerationResult>;
  return (
    typeof result.title === 'string' &&
    Array.isArray(result.sections) &&
    result.sections.every(
      (section) =>
        section &&
        typeof section.id === 'string' &&
        typeof section.label === 'string' &&
        typeof section.content === 'string',
    )
  );
}
