import { FoodRecipeValidationError } from "./food-ai-recipes";

export type RecipeFailureStage =
  "provider" | "response" | "json" | "validation";

const FINISH_REASONS = new Set([
  "STOP",
  "MAX_TOKENS",
  "SAFETY",
  "RECITATION",
  "LANGUAGE",
  "OTHER",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "MALFORMED_FUNCTION_CALL",
  "UNEXPECTED_TOOL_CALL",
  "IMAGE_SAFETY",
  "IMAGE_PROHIBITED_CONTENT",
  "IMAGE_RECITATION",
  "NO_IMAGE",
  "FINISH_REASON_UNSPECIFIED",
]);
const BLOCK_REASONS = new Set([
  "SAFETY",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "IMAGE_SAFETY",
  "OTHER",
]);

// These fields originate with the provider; only fixed categories may enter application logs.
export function safeFinishReason(value: unknown): string | null {
  return value == null
    ? null
    : typeof value === "string" && FINISH_REASONS.has(value)
      ? value
      : "UNKNOWN";
}
export function safeBlockReason(value: unknown): string | null {
  return value == null || value === "BLOCKED_REASON_UNSPECIFIED"
    ? null
    : typeof value === "string" && BLOCK_REASONS.has(value)
      ? value
      : "UNKNOWN";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function isGeminiUpstreamDeadline(error: unknown): boolean {
  const raw = record(error);
  const status =
    typeof raw.status === "number"
      ? raw.status
      : typeof raw.code === "number"
        ? raw.code
        : undefined;
  // A local abort may leave inference running; only retry a confirmed upstream failure, never a 4xx rejection.
  if (
    raw.name === "AbortError" ||
    raw.name === "TimeoutError" ||
    (status !== undefined && status < 500)
  )
    return false;
  return (
    status === 504 ||
    [raw.code, raw.status].includes("DEADLINE_EXCEEDED") ||
    (typeof raw.message === "string" &&
      /\bDEADLINE_EXCEEDED\b/.test(raw.message))
  );
}

export function recipeFailureDetails(
  error: unknown,
  stage: RecipeFailureStage,
  finishReason: string | null,
  blockReason: string | null,
) {
  let providerStatus: number | null = null;
  let validationField: string | null = null;
  let reason: string;
  if (stage === "provider") {
    const raw = record(error);
    const status = typeof raw.status === "number" ? raw.status : raw.code;
    if (
      typeof status === "number" &&
      Number.isInteger(status) &&
      status >= 100 &&
      status <= 599
    )
      providerStatus = status;
    const cause = record(raw.cause);
    // Google can wrap an inference deadline in HTTP 500 and put the canonical code only in message text.
    const upstreamDeadline =
      [raw.code, raw.status].includes("DEADLINE_EXCEEDED") ||
      (typeof raw.message === "string" &&
        /\bDEADLINE_EXCEEDED\b/.test(raw.message));
    if (
      upstreamDeadline ||
      raw.name === "AbortError" ||
      raw.name === "TimeoutError" ||
      providerStatus === 408 ||
      providerStatus === 504 ||
      [raw.code, cause.code].some(
        (code) =>
          code === "ETIMEDOUT" ||
          code === "UND_ERR_CONNECT_TIMEOUT" ||
          code === "UND_ERR_HEADERS_TIMEOUT" ||
          code === "UND_ERR_BODY_TIMEOUT",
      )
    )
      reason = "TIMEOUT";
    else if (providerStatus === 400) reason = "INVALID_REQUEST";
    else if (providerStatus === 401) reason = "AUTHENTICATION_FAILED";
    else if (providerStatus === 403) reason = "PERMISSION_DENIED";
    else if (providerStatus === 404) reason = "MODEL_OR_RESOURCE_NOT_FOUND";
    else if (providerStatus === 429) reason = "RATE_LIMITED";
    else if (providerStatus !== null && providerStatus >= 500)
      reason = "PROVIDER_UNAVAILABLE";
    else if (
      [raw.code, cause.code].some(
        (code) =>
          code === "ENOTFOUND" ||
          code === "EAI_AGAIN" ||
          code === "ECONNRESET" ||
          code === "ECONNREFUSED",
      )
    )
      reason = "NETWORK_ERROR";
    else reason = "PROVIDER_ERROR";
  } else if (stage === "json") reason = "INVALID_JSON";
  else if (
    stage === "validation" &&
    error instanceof FoodRecipeValidationError
  ) {
    reason = error.reason;
    validationField = error.field;
  } else if (stage === "validation") reason = "INVALID_RECIPE";
  else if (
    blockReason ||
    [
      "SAFETY",
      "RECITATION",
      "BLOCKLIST",
      "PROHIBITED_CONTENT",
      "SPII",
    ].includes(finishReason || "")
  )
    reason = "BLOCKED";
  else if (finishReason === "MAX_TOKENS") reason = "OUTPUT_LIMIT";
  else if (finishReason === "STOP") reason = "EMPTY_RESPONSE";
  else reason = "INCOMPLETE_RESPONSE";
  return {
    stage,
    reason,
    providerStatus,
    finishReason,
    blockReason,
    validationField,
  };
}
