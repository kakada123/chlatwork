import type { AiFeature, Prisma } from '@prisma/client';

export interface CreatorResultSection {
  id: string;
  label: string;
  content: string;
}

export interface CreatorResultItem {
  id: string;
  title: string;
  content: string;
  description?: string;
}

export interface CreatorGenerationResult {
  title: string;
  sections: CreatorResultSection[];
  items?: CreatorResultItem[];
  srt?: string;
}

export interface CreatorProviderUsage {
  provider: 'OPENAI';
  model: string;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  audioSeconds: number | null;
  estimatedProviderCostUsd: number;
  providerRequestId: string | null;
  durationMs: number;
}

export interface CreatorGatewayResult<T> {
  data: T;
  usage: CreatorProviderUsage;
}

export interface CreatorReservation {
  kind: 'created' | 'existing';
  generation: {
    id: string;
    feature: AiFeature;
    status: 'RESERVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    creditCost: number;
    result: Prisma.JsonValue | null;
    errorCode: string | null;
  };
  balance: number;
}

export interface CreatorTextGenerationInput {
  feature: AiFeature;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  inputSummary: string;
  image?: { bytes: Buffer; mimeType: string };
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface CreatorTranscript {
  text: string;
  segments: TranscriptSegment[];
}
