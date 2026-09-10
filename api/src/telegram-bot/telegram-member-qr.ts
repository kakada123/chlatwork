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
