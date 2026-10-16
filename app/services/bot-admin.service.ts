import type { CreatorCreditAccountDetails } from "./creator-ai.service";

export type BotKind = "CREATOR" | "CHLATWORK";
export type BotStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export interface BotProfile {
  userId: string;
  telegramId: string;
  username: string | null;
  name: string | null;
  status: BotStatus;
  version: number;
  isActive: boolean;
  createdAt: string;
  balance: number;
  creatorEnabled: boolean;
  chlatworkEnabled: boolean;
}
export interface BotUserDetails {
  profile: BotProfile;
  memberships: {
    bot: BotKind;
    enabled: boolean;
    firstPrivateStartedAt: string | null;
    lastActivityAt: string | null;
  }[];
  audit: {
    id: string;
    actorId: string | null;
    bot: BotKind | null;
    action: string;
    details: {
      reason?: string;
      previousStatus?: BotStatus;
      status?: BotStatus;
    };
    createdAt: string;
  }[];
  credits: CreatorCreditAccountDetails | null;
  qrUrl: string | null;
}
export interface BotReview {
  status: BotStatus;
  creatorEnabled: boolean;
  chlatworkEnabled: boolean;
  expectedVersion: number;
  startingCredits: number;
  expectedBalance: number;
  reason: string;
}
export const botAdminHeaders = { "X-Bot-Admin": "1" };

export function getBotUsers(query: {
  search: string;
  bot?: BotKind;
  status?: BotStatus;
  page: number;
}) {
  return $fetch<{
    items: BotProfile[];
    total: number;
    page: number;
    pageSize: number;
  }>("/api/admin/bots/users", { query });
}
export function getBotOverview(bot?: BotKind) {
  return $fetch<{
    counts: { status: BotStatus; count: number }[];
    activity: { bot: BotKind; active: number }[];
    usage: { bot: BotKind; credits: number; failures: number }[];
  }>("/api/admin/bots/overview", { query: { bot } });
}
export function getBotUser(id: string) {
  return $fetch<BotUserDetails>(
    `/api/admin/bots/users/${encodeURIComponent(id)}`,
  );
}
export function reviewBotUser(id: string, body: BotReview, key: string) {
  return $fetch(`/api/admin/bots/users/${encodeURIComponent(id)}/review`, {
    method: "POST",
    headers: { ...botAdminHeaders, "Idempotency-Key": key },
    body,
  });
}
export function saveBotQr(id: string, image: File) {
  const body = new FormData();
  body.append("image", image);
  return $fetch(`/api/admin/bots/users/${encodeURIComponent(id)}/khqr`, {
    method: "POST",
    headers: botAdminHeaders,
    body,
  });
}
export function removeBotQr(id: string) {
  return $fetch(`/api/admin/bots/users/${encodeURIComponent(id)}/khqr`, {
    method: "DELETE",
    headers: botAdminHeaders,
  });
}
