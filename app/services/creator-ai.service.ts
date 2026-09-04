import type { CreatorToolId } from "~/data/creator-tools";

export type CreatorRequest = {
  text: string;
  platform: string;
  language: string;
  tone: string;
  videoLength: string;
  goal: string;
  shortness: string;
  customVideoLength: number;
  variation: number;
  file?: File | null;
  imageFile?: File | null;
};

export type CreatorResultItem = {
  id: string;
  title: string;
  content: string;
  description?: string;
};

export type CreatorResultSection = {
  id: string;
  label: string;
  content: string;
};

export type CreatorGenerationResult = {
  title: string;
  sections: CreatorResultSection[];
  items?: CreatorResultItem[];
  srt?: string;
};

export type CreatorServiceErrorCode =
  | "INSUFFICIENT_CREDITS"
  | "RATE_LIMITED"
  | "DAILY_LIMIT_REACHED"
  | "TEMPORARILY_UNAVAILABLE"
  | "AUTH_REQUIRED"
  | "INVALID_VIDEO"
  | "GENERATION_FAILED";

export interface CreatorGenerationResponse {
  data: CreatorGenerationResult;
  usage: { creditsCharged: number; creditsRemaining: number };
}

export interface CreatorGenerationContext {
  onVideoStage?: (stage: string) => void;
}

export interface CreatorHistoryApiItem {
  id: string;
  feature: string;
  inputSummary: string | null;
  result: CreatorGenerationResult | null;
  creditCost: number;
  createdAt: string;
}

export class CreatorServiceError extends Error {
  constructor(
    public readonly code: CreatorServiceErrorCode,
    message: string,
    public readonly requiredCredits?: number,
    public readonly availableCredits?: number,
  ) {
    super(message);
    this.name = "CreatorServiceError";
  }
}

const TEXT_ENDPOINTS: Partial<Record<CreatorToolId, string>> = {
  "create-post": "/api/creator-ai/posts/generate",
  "script-generator": "/api/creator-ai/scripts/generate",
  "hook-generator": "/api/creator-ai/hooks/generate",
  "content-ideas": "/api/creator-ai/content-ideas/generate",
  "facebook-to-tiktok": "/api/creator-ai/repurpose/facebook-to-tiktok",
  "long-to-short": "/api/creator-ai/repurpose/long-to-short",
  "khmer-grammar": "/api/creator-ai/khmer/grammar",
  "khmer-rewrite": "/api/creator-ai/khmer/rewrite",
  "latin-to-khmer": "/api/creator-ai/khmer/latin-to-khmer",
  "khmer-humanize": "/api/creator-ai/khmer/humanize",
};

const VIDEO_ENDPOINTS: Partial<Record<CreatorToolId, string>> = {
  "video-subtitle": "/api/creator-ai/video/subtitle",
  "video-caption": "/api/creator-ai/video/caption",
  "video-summary": "/api/creator-ai/video/summary",
  "video-content-pack": "/api/creator-ai/video/content-pack",
  "video-to-social": "/api/creator-ai/repurpose/video-to-social",
};

const VIDEO_FEATURES: Partial<Record<CreatorToolId, string>> = {
  "video-subtitle": "VIDEO_SUBTITLE",
  "video-caption": "VIDEO_CAPTION",
  "video-summary": "VIDEO_SUMMARY",
  "video-content-pack": "VIDEO_CONTENT_PACK",
  "video-to-social": "VIDEO_TO_SOCIAL",
};

export async function runCreatorGeneration(
  toolId: CreatorToolId,
  request: CreatorRequest,
  context: CreatorGenerationContext = {},
): Promise<CreatorGenerationResponse> {
  const textEndpoint = TEXT_ENDPOINTS[toolId];
  if (textEndpoint) return requestTextGeneration(toolId, textEndpoint, request);
  const videoEndpoint = VIDEO_ENDPOINTS[toolId];
  if (videoEndpoint) {
    return requestVideoGeneration(toolId, videoEndpoint, request, context);
  }
  throw new CreatorServiceError(
    "GENERATION_FAILED",
    "This Creator workflow is not available.",
  );
}

export async function getCreatorCredits() {
  return $fetch<{ balance: number }>("/api/creator-ai/credits");
}

export async function getCreatorHistory() {
  return $fetch<CreatorHistoryApiItem[]>("/api/creator-ai/history");
}

async function requestTextGeneration(
  toolId: CreatorToolId,
  endpoint: string,
  request: CreatorRequest,
) {
  const payload = textPayload(toolId, request);
  let body: Record<string, unknown> | FormData = payload;
  if (toolId === "create-post" && request.imageFile) {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) =>
      form.append(key, String(value)),
    );
    form.append("image", request.imageFile, request.imageFile.name);
    body = form;
  }
  try {
    return await $fetch<CreatorGenerationResponse>(endpoint, {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body,
    });
  } catch (error) {
    throw normalizeCreatorError(error);
  }
}

async function requestVideoGeneration(
  toolId: CreatorToolId,
  endpoint: string,
  request: CreatorRequest,
  context: CreatorGenerationContext,
): Promise<CreatorGenerationResponse> {
  if (!request.file) {
    throw new CreatorServiceError("INVALID_VIDEO", "Choose a video first.");
  }
  const form = new FormData();
  form.append("file", request.file, request.file.name);
  form.append("language", enumValue(request.language));
  form.append("tone", enumValue(request.tone));
  context.onVideoStage?.("UPLOADING");
  try {
    const idempotencyKey = crypto.randomUUID();
    const feature = VIDEO_FEATURES[toolId];
    if (!feature) {
      throw new CreatorServiceError(
        "GENERATION_FAILED",
        "This video workflow is not available.",
      );
    }
    const ticket = await $fetch<CreatorVideoUploadTicket>(
      "/api/creator-ai/video/upload-ticket",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: { feature },
      },
    );
    // This short-lived ticket can authorize only this one feature/idempotency pair;
    // the browser never receives the user's normal access or refresh token.
    let job = await $fetch<CreatorVideoJobResponse>(ticket.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ticket.ticket}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: form,
    });
    context.onVideoStage?.(job.data.stage);
    for (let attempt = 0; attempt < 400; attempt += 1) {
      if (job.data.status === "COMPLETED" && job.data.result) {
        return {
          data: job.data.result,
          usage: {
            creditsCharged: job.usage.creditsCharged,
            creditsRemaining: job.usage.creditsRemaining,
          },
        };
      }
      if (job.data.status === "FAILED" || job.data.status === "CANCELLED") {
        throw new CreatorServiceError(
          "GENERATION_FAILED",
          "Video processing failed. Your reserved credits were restored.",
        );
      }
      await wait(1_500);
      job = await $fetch<CreatorVideoJobResponse>(
        `/api/creator-ai/video/jobs/${job.data.jobId}`,
      );
      context.onVideoStage?.(job.data.stage);
    }
    throw new CreatorServiceError(
      "GENERATION_FAILED",
      "Video processing is taking too long. Check your recent generations later.",
    );
  } catch (error) {
    if (error instanceof CreatorServiceError) throw error;
    throw normalizeCreatorError(error);
  }
}

interface CreatorVideoUploadTicket {
  ticket: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

interface CreatorVideoJobResponse {
  data: {
    jobId: string;
    generationId: string;
    status:
      | "QUEUED"
      | "PROCESSING"
      | "TRANSCRIBING"
      | "CLEANING"
      | "GENERATING"
      | "COMPLETED"
      | "FAILED"
      | "CANCELLED";
    stage: string;
    durationSeconds: number;
    result?: CreatorGenerationResult;
  };
  usage: {
    creditsRemaining: number;
    creditsCharged: number;
    creditsReserved: number;
    final: boolean;
  };
}

function textPayload(toolId: CreatorToolId, request: CreatorRequest) {
  const shared = {
    language: enumValue(request.language),
    tone: enumValue(request.tone),
  };
  switch (toolId) {
    case "create-post":
      return {
        topic: request.text.trim(),
        platform: enumValue(request.platform),
        ...shared,
      };
    case "script-generator":
      return {
        topic: request.text.trim(),
        platform: enumValue(request.platform),
        durationSeconds: videoLengthSeconds(request),
        ...shared,
      };
    case "hook-generator":
      return {
        topic: request.text.trim(),
        platform: enumValue(request.platform),
        tone: enumValue(request.tone),
        count: 5,
      };
    case "content-ideas":
      return {
        niche: request.text.trim(),
        platform: enumValue(request.platform),
        goal: enumValue(request.goal),
        count: 5,
      };
    case "khmer-grammar":
    case "latin-to-khmer":
      return { content: request.text.trim() };
    case "khmer-rewrite":
    case "khmer-humanize":
    case "facebook-to-tiktok":
      return { content: request.text.trim(), ...shared };
    case "long-to-short":
      return {
        content: request.text.trim(),
        language: enumValue(request.language),
        style: shortStyle(request.shortness),
      };
    default:
      return {};
  }
}

function enumValue(value: string) {
  return value
    .trim()
    .replace(/\+/g, "_")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

function videoLengthSeconds(request: CreatorRequest) {
  if (request.videoLength === "Custom") return request.customVideoLength;
  if (request.videoLength === "2 min") return 120;
  return Number.parseInt(request.videoLength, 10) || 30;
}

function shortStyle(value: string) {
  if (value === "TikTok style") return "TIKTOK";
  if (value === "Facebook short post") return "FACEBOOK_SHORT";
  return enumValue(value);
}

function normalizeCreatorError(error: unknown) {
  const response =
    error && typeof error === "object" && "response" in error
      ? (error as {
          response?: { status?: number; _data?: Record<string, unknown> };
        }).response
      : undefined;
  const body = response?._data ?? {};
  const backendCode = typeof body.code === "string" ? body.code : "";
  const message =
    typeof body.message === "string"
      ? body.message
      : response?.status === 401
        ? "Sign in to use ChlatWork Creator."
        : "AI generation could not be completed. Please try again.";
  const code: CreatorServiceErrorCode =
    backendCode === "INSUFFICIENT_AI_CREDITS"
      ? "INSUFFICIENT_CREDITS"
      : backendCode === "AI_RATE_LIMITED"
        ? "RATE_LIMITED"
        : backendCode === "AI_DAILY_LIMIT_REACHED"
          ? "DAILY_LIMIT_REACHED"
          : backendCode === "AI_TEMPORARILY_UNAVAILABLE"
            ? "TEMPORARILY_UNAVAILABLE"
            : response?.status === 401
              ? "AUTH_REQUIRED"
              : [
                    "INVALID_VIDEO",
                    "VIDEO_TOO_LARGE",
                    "VIDEO_TOO_LONG",
                    "UNSUPPORTED_VIDEO_FORMAT",
                  ].includes(backendCode)
                ? "INVALID_VIDEO"
                : "GENERATION_FAILED";
  return new CreatorServiceError(
    code,
    message,
    typeof body.requiredCredits === "number"
      ? body.requiredCredits
      : undefined,
    typeof body.availableCredits === "number"
      ? body.availableCredits
      : undefined,
  );
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
