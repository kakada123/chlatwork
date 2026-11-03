export type BirthdayWizardStage = "recipient" | "template" | "scenes" | "music" | "cake" | "photos" | "wish" | "message" | "secret" | "unlock" | "preview";

export function getBirthdayWizardStages(story: boolean): BirthdayWizardStage[] {
  return ["recipient", "template", ...(story ? ["scenes" as const] : []), "music", ...(story ? ["cake" as const] : []), "photos", "wish", "message", ...(story ? ["secret" as const] : []), "unlock", "preview"];
}

/** Leap year permits February 29 without collecting a private birth year. */
export function parseBirthdayUnlock(day: string, month: string): { day: number; month: number } | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month)) return null;
  const dayNumber = Number(day), monthNumber = Number(month);
  const date = new Date(Date.UTC(2000, monthNumber - 1, dayNumber));
  return monthNumber >= 1 && monthNumber <= 12 && dayNumber >= 1 && date.getUTCMonth() === monthNumber - 1 && date.getUTCDate() === dayNumber ? { day: dayNumber, month: monthNumber } : null;
}
