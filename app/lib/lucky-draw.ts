export function normalizeParticipantName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function parseParticipantText(value: string) {
  return value
    .split(/\n|,/)
    .map(normalizeParticipantName)
    .filter(Boolean);
}

export function findDuplicateParticipantNames(participants: string[]) {
  const seen = new Set<string>();
  const duplicates = new Map<string, string>();

  for (const name of participants) {
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) duplicates.set(key, name);
    else seen.add(key);
  }

  return [...duplicates.values()];
}

export function deduplicateParticipants(participants: string[]) {
  const seen = new Set<string>();

  return participants.filter((name) => {
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getEligibleParticipants(
  participants: string[],
  previousWinners: string[],
  preventRepeats: boolean,
) {
  if (!preventRepeats || previousWinners.length === 0) return participants;

  // A casing difference must not let the same person re-enter a no-repeat draw.
  const winnerNames = new Set(
    previousWinners.map((name) => normalizeParticipantName(name).toLocaleLowerCase()),
  );
  return participants.filter(
    (name) => !winnerNames.has(normalizeParticipantName(name).toLocaleLowerCase()),
  );
}
