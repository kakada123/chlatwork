import type { MomentOccasion, MomentTheme } from "../types/moment.ts";

export const MOMENT_OCCASIONS: ReadonlyArray<{
  value: MomentOccasion;
  label: string;
  emoji: string;
  titlePrefix: string;
}> = [
  {
    value: "BIRTHDAY",
    label: "Birthday",
    emoji: "🎂",
    titlePrefix: "Happy Birthday",
  },
  {
    value: "ANNIVERSARY",
    label: "Anniversary",
    emoji: "❤️",
    titlePrefix: "Happy Anniversary",
  },
  { value: "LOVE", label: "Just because", emoji: "💕", titlePrefix: "For" },
  {
    value: "FRIENDSHIP",
    label: "Friendship",
    emoji: "👯",
    titlePrefix: "For my friend",
  },
  {
    value: "GRADUATION",
    label: "Graduation",
    emoji: "🎓",
    titlePrefix: "Congratulations",
  },
  {
    value: "WEDDING",
    label: "Wedding",
    emoji: "💍",
    titlePrefix: "Celebrating",
  },
  { value: "BABY", label: "Welcome baby", emoji: "👶", titlePrefix: "Welcome" },
  {
    value: "MOTHERS_DAY",
    label: "Mother's Day",
    emoji: "🌷",
    titlePrefix: "Happy Mother's Day",
  },
  {
    value: "FATHERS_DAY",
    label: "Father's Day",
    emoji: "💙",
    titlePrefix: "Happy Father's Day",
  },
  {
    value: "HOLIDAY",
    label: "Holiday",
    emoji: "🎄",
    titlePrefix: "Warm wishes",
  },
  { value: "FAREWELL", label: "Farewell", emoji: "👋", titlePrefix: "For" },
  { value: "OTHER", label: "Something else", emoji: "✨", titlePrefix: "For" },
];

export const MOMENT_THEMES: ReadonlyArray<{
  value: MomentTheme;
  label: string;
  description: string;
  swatches: readonly [string, string, string];
}> = [
  {
    value: "ROMANTIC",
    label: "Romantic",
    description: "Rose, wine, and soft candlelight",
    swatches: ["#fff1f2", "#fb7185", "#881337"],
  },
  {
    value: "CUTE",
    label: "Cute",
    description: "Playful peach, lavender, and sunshine",
    swatches: ["#fff7ed", "#c4b5fd", "#fb7185"],
  },
  {
    value: "MINIMAL",
    label: "Minimal",
    description: "Quiet, airy, and photo-first",
    swatches: ["#fafafa", "#d4d4d4", "#171717"],
  },
  {
    value: "ELEGANT",
    label: "Elegant",
    description: "Midnight, cream, and gold",
    swatches: ["#111827", "#f5e6c8", "#b68a3a"],
  },
];

export function getMomentOccasion(value: MomentOccasion) {
  return (
    MOMENT_OCCASIONS.find((occasion) => occasion.value === value) ??
    MOMENT_OCCASIONS[0]!
  );
}
