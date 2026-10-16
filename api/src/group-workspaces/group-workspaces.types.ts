import type { BotKind } from '../bot-admin/bot-access.service';

export interface GroupFeatures {
  voting: boolean;
  split: boolean;
  khqr: boolean;
  creator: boolean;
}

export interface GroupContext extends GroupFeatures {
  workspaceId: string;
  chatId: string;
  title: string;
  bot: BotKind;
  workspaceVersion: number;
  connectionVersion: number;
}

export interface GroupConnectionRow extends GroupContext {
  status: string;
  enabled: boolean;
  health: string;
}

export const DEFAULT_GROUP_FEATURES: Record<BotKind, GroupFeatures> = {
  CHLATWORK: { voting: true, split: true, khqr: true, creator: false },
  CREATOR: { voting: false, split: false, khqr: false, creator: true },
};
