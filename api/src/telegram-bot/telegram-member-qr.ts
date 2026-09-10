import type { TelegramMessage } from './telegram-bot.types';

export type MemberQrMention = { userId: string } | { username: string };

export function readMemberQrMention(
  message: TelegramMessage,
): MemberQrMention | null {
  const text = message.text ?? '';
  // Telegram entity offsets use UTF-16, matching JavaScript string slicing.
  for (const entity of message.entities ?? []) {
    if (
      entity.type !== 'text_mention' ||
      !entity.user ||
      entity.user.is_bot ||
      !Number.isSafeInteger(entity.user.id) ||
      entity.user.id <= 0 ||
      !Number.isInteger(entity.offset) ||
      entity.offset < 1 ||
      !Number.isInteger(entity.length) ||
      entity.length < 1 ||
      entity.offset + entity.length > text.length
    )
      continue;
    if (
      /^\s*\/(?:\$\s+|\s*)$/.test(text.slice(0, entity.offset)) &&
      !text.slice(entity.offset + entity.length).trim()
    ) {
      return { userId: String(entity.user.id) };
    }
  }
  const match = /^\s*\/(?:\$\s+|\s*)@([a-z][a-z0-9_]{0,31})\s*$/i.exec(text);
  return match ? { username: match[1].toLowerCase() } : null;
}

export interface MemberQr {
  key: string;
  displayName: string;
}

export interface ObservedQrMember {
  telegramUserId: string;
  displayName: string;
  isActive: boolean;
}

export function buildMemberQrDirectory(
  observed: ObservedQrMember[],
): MemberQr[] {
  // Payment images follow Telegram identity, even when names change or match.
  return observed
    .filter((member) => member.isActive)
    .map((member) => ({
      key: `tg_${member.telegramUserId}`,
      displayName: member.displayName,
    }));
}
