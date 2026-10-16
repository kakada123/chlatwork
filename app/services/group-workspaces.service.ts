import type { BotKind } from "./bot-admin.service";
export type { BotKind } from "./bot-admin.service";
export type ManagerStatus =
  "NOT_REQUESTED" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export interface BotSession {
  bot: BotKind;
  managerStatus: ManagerStatus;
  enabled: boolean;
  balance: number;
  botUsername: string;
}
export interface GroupFeatures {
  voting: boolean;
  split: boolean;
  khqr: boolean;
  creator: boolean;
  enabled: boolean;
}
export interface GroupSummary extends GroupFeatures {
  workspaceId: string;
  chatId: string;
  title: string;
  bot: BotKind;
  workspaceVersion: number;
  connectionVersion: number;
  health: string;
  status: string;
}
export interface PollOption {
  id?: string;
  label: string;
  imageId?: string;
  imageUrl?: string;
}
export interface VoteInput {
  expectedVersion: number;
  question: string;
  options: PollOption[];
  timeZone: string;
  sendHour: number;
  sendMinute: number;
  durationMinutes: number;
  enabled: boolean;
}
export interface GroupDetails extends GroupSummary {
  poll: null | {
    id: string;
    question: string;
    options: PollOption[];
    schedule: Omit<
      VoteInput,
      "expectedVersion" | "question" | "options"
    > | null;
    currentRound: { id: string; closesAt: string } | null;
  };
}
const headers = { "X-Group-Workspace": "1" };
export function groupRequest<T>(
  path: string,
  bot: BotKind,
  options: Record<string, unknown> = {},
) {
  return $fetch<T>(`/api/bot/groups/${path}`, {
    ...options,
    query: { bot, ...((options.query as object) ?? {}) },
    headers: { ...headers, ...((options.headers as object) ?? {}) },
  });
}
export const groupApi = {
  session: (bot: BotKind) => groupRequest<BotSession>("session", bot),
  requestManager: (bot: BotKind) =>
    groupRequest("manager-request", bot, { method: "POST" }),
  connect: (bot: BotKind) =>
    groupRequest<{ deepLink: string; expiresAt: string }>("connections", bot, {
      method: "POST",
    }),
  list: (bot: BotKind, page = 1) =>
    groupRequest<{ items: GroupSummary[]; hasMore: boolean; page: number }>(
      "",
      bot,
      { query: { page } },
    ),
  details: (id: string, bot: BotKind) =>
    groupRequest<GroupDetails>(encodeURIComponent(id), bot),
  features: (group: GroupSummary, body: GroupFeatures, key: string) =>
    groupRequest(`${group.workspaceId}/features`, group.bot, {
      method: "PATCH",
      body: { ...body, expectedVersion: group.workspaceVersion },
      headers: { "Idempotency-Key": key },
    }),
  vote: (group: GroupSummary, body: VoteInput, key: string) =>
    groupRequest(`${group.workspaceId}/vote`, group.bot, {
      method: "PUT",
      body,
      headers: { "Idempotency-Key": key },
    }),
  upload: (group: GroupSummary, optionId: string, image: File, key: string) => {
    const body = new FormData();
    body.append("image", image);
    return groupRequest(
      `${group.workspaceId}/vote/options/${encodeURIComponent(optionId)}/image`,
      group.bot,
      {
        method: "PUT",
        query: { version: group.workspaceVersion },
        body,
        headers: { "Idempotency-Key": key },
      },
    );
  },
  reset: (group: GroupSummary, expectedRoundId: string, key: string) =>
    groupRequest(`${group.workspaceId}/vote/reset`, group.bot, {
      method: "POST",
      body: { expectedRoundId },
      headers: { "Idempotency-Key": key },
    }),
  activity: (id: string, bot: BotKind, page = 1) =>
    groupRequest<{
      items: {
        id: string;
        action: string;
        actorName: string | null;
        telegramUserId: string | null;
        bot: BotKind;
        createdAt: string;
      }[];
      page: number;
    }>(`${id}/activity`, bot, { query: { page } }),
  khqr: (id: string, bot: BotKind) =>
    groupRequest<{
      items: { memberKey: string; displayName: string; imageUrl: string }[];
    }>(`${id}/khqr`, bot),
  history: (id: string, bot: BotKind, page = 1) =>
    groupRequest<{
      items: {
        id: string;
        voteDate: string;
        closesAt: string;
        finalizedAt: string | null;
      }[];
      page: number;
    }>(`${id}/vote/history`, bot, { query: { page } }),
};
