export interface MemberQr {
  key: string;
  displayName: string;
  imageName: string | null;
}

// Explicit aliases prevent display-name guessing from selecting another
// person's payment QR. Add an imageName here when an unmapped member uploads.
export const MEMBER_QR_DIRECTORY: readonly MemberQr[] = [
  { key: 'sna', displayName: 'Sovan Krusna', imageName: 'sna' },
  { key: 'phearun', displayName: 'Phann Phearun', imageName: 'phearun' },
  { key: 'sikeat', displayName: '𝙎𝙞𝙠𝙚𝙖𝙩', imageName: 'sikeat' },
  { key: 'daro', displayName: 'Mrr. ដារ៉ូ', imageName: 'daro' },
  { key: 'venge', displayName: 'Veng E Sorn', imageName: null },
  { key: 'vexal', displayName: 'vexal.s', imageName: 'vexal' },
  { key: 'visal', displayName: 'MOEUNG VISAL', imageName: 'visal' },
  { key: 'mingseung', displayName: 'Chhoeun Mingseung', imageName: null },
  { key: 'kakada', displayName: 'Kakada Ngen', imageName: 'kakada' },
];

export interface ObservedQrMember {
  telegramUserId: string;
  displayName: string;
  isActive: boolean;
}

export function buildMemberQrDirectory(
  observed: ObservedQrMember[],
): MemberQr[] {
  const normalize = (name: string) =>
    name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  const members: MemberQr[] = [];
  const configuredNames = new Set<string>();
  for (const member of MEMBER_QR_DIRECTORY) {
    const name = normalize(member.displayName);
    configuredNames.add(name);
    const matches = observed.filter(
      (row) => normalize(row.displayName) === name,
    );
    // Seed the supplied roster before members interact, but honor observed departures.
    if (!matches.length || matches.some((row) => row.isActive))
      members.push(member);
  }
  for (const member of observed) {
    if (!member.isActive || configuredNames.has(normalize(member.displayName)))
      continue;
    members.push({
      key: `tg_${member.telegramUserId}`,
      displayName: member.displayName,
      imageName: null,
    });
  }
  return members;
}
