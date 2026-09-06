import {
  CREATOR_FEATURE_TO_TOOL,
  CREATOR_TOOLS,
} from "../data/creator-tools.ts";
import type { CreatorCreditTransaction } from "../services/creator-ai.service.ts";

export function creatorFeatureLabel(feature: string | null) {
  return (
    CREATOR_TOOLS.find(
      (tool) => tool.id === CREATOR_FEATURE_TO_TOOL[feature ?? ""],
    )?.title ?? "Creator credits"
  );
}

export function creatorFeatureRoute(feature: string) {
  return (
    CREATOR_TOOLS.find((tool) => tool.id === CREATOR_FEATURE_TO_TOOL[feature])
      ?.route ?? "/creator"
  );
}

export function creatorTransactionLabel(
  type: CreatorCreditTransaction["type"],
) {
  return {
    GRANT: "Credits received",
    RESERVE: "Reserved for generation",
    CHARGE: "Generation completed",
    REFUND: "Credits returned",
    PURCHASE: "Credits purchased",
    EXPIRE: "Credits expired",
    ADMIN_ADJUSTMENT: "Admin adjustment",
  }[type];
}

export function formatCreditChange(amount: number) {
  if (amount === 0) return "No balance change";
  return `${amount > 0 ? "+" : "−"}${Math.abs(amount).toLocaleString("en-US")}`;
}

export function creatorCreditRequestError(error: unknown, fallback: string) {
  const body = (error as { data?: { message?: unknown } } | null)?.data;
  return typeof body?.message === "string" ? body.message : fallback;
}
