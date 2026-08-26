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

export type WinnerHistoryEntry = {
  name: string;
  note: string;
};

export type LuckyDrawSession = {
  version: 1;
  rows: string[];
  raw: string;
  preventRepeatWinners: boolean;
  showWinnerDialog: boolean;
  soundEnabled: boolean;
  spinSpeed: "quick" | "standard" | "suspense";
  drawNote: string;
  winnerHistory: WinnerHistoryEntry[];
  lastWinner: string;
};

export function parseLuckyDrawSession(value: string): LuckyDrawSession | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const session = parsed as Record<string, unknown>;
    const rows = session.rows;
    const winnerHistory = session.winnerHistory;
    const spinSpeed = session.spinSpeed;

    if (
      session.version !== 1
      || !Array.isArray(rows)
      || rows.length > 5_000
      || !rows.every((name) => typeof name === "string" && name.length <= 1_000)
      || typeof session.raw !== "string"
      || session.raw.length > 1_000_000
      || !Array.isArray(winnerHistory)
      || winnerHistory.length > 5_000
      || !winnerHistory.every(
        (entry) =>
          entry
          && typeof entry === "object"
          && typeof (entry as Record<string, unknown>).name === "string"
          && String((entry as Record<string, unknown>).name).length <= 1_000
          && typeof (entry as Record<string, unknown>).note === "string"
          && String((entry as Record<string, unknown>).note).length <= 120,
      )
      || typeof session.preventRepeatWinners !== "boolean"
      || typeof session.showWinnerDialog !== "boolean"
      || typeof session.soundEnabled !== "boolean"
      || !["quick", "standard", "suspense"].includes(String(spinSpeed))
      || typeof session.drawNote !== "string"
      || session.drawNote.length > 120
      || typeof session.lastWinner !== "string"
      || session.lastWinner.length > 1_000
    ) {
      return null;
    }

    return session as LuckyDrawSession;
  } catch {
    return null;
  }
}

export function formatWinnerListText(winners: WinnerHistoryEntry[]) {
  return winners
    .map((winner, index) => {
      const note = winner.note.trim();
      return `${index + 1}. ${winner.name}${note ? ` — ${note}` : ""}`;
    })
    .join("\n");
}

export function formatWinnerListCsv(winners: WinnerHistoryEntry[]) {
  const escapeCell = (value: string) => {
    // Spreadsheet apps can execute formula-like user input when opening CSV files.
    const safeValue = /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replaceAll('"', '""')}"`;
  };
  return [
    "Position,Winner,Note",
    ...winners.map(
      (winner, index) =>
        `${index + 1},${escapeCell(winner.name)},${escapeCell(winner.note.trim())}`,
    ),
  ].join("\r\n");
}
