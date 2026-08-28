import type { MomentOccasion, MomentTheme } from "../types/moment.ts";

export type MomentCategory =
  | "CELEBRATIONS" | "LOVE_AND_FAMILY" | "MEMORIES"
  | "SURPRISES" | "COMMUNITY";

export const MOMENT_CATEGORIES: ReadonlyArray<{
  value: MomentCategory;
  label: string;
  occasions: readonly MomentOccasion[];
}> = [
  {
    value: "CELEBRATIONS",
    label: "Celebrations",
    occasions: ["BIRTHDAY", "GRADUATION", "HOLIDAY"],
  },
  {
    value: "LOVE_AND_FAMILY",
    label: "Love & family",
    occasions: ["ANNIVERSARY", "LOVE", "WEDDING", "BABY", "MOTHERS_DAY", "FATHERS_DAY"],
  },
  {
    value: "MEMORIES",
    label: "Friends & memories",
    occasions: ["FRIENDSHIP", "FAREWELL"],
  },
  {
    value: "SURPRISES",
    label: "Surprises",
    occasions: ["SURPRISE", "OTHER"],
  },
  {
    value: "COMMUNITY",
    label: "Plan together",
    occasions: ["INVITATION", "VOTING"],
  },
];

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
  { value: "SURPRISE", label: "Surprise gift", emoji: "🎁", titlePrefix: "A surprise for" },
  {
    value: "INVITATION",
    label: "Invitation",
    emoji: "💌",
    titlePrefix: "You're invited",
  },
  {
    value: "VOTING",
    label: "Vote together",
    emoji: "🗳️",
    titlePrefix: "Help us choose",
  },
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
    value: "CELEBRATION",
    label: "Celebration",
    description: "Confetti, berry, and bright party color",
    swatches: ["#fff7ed", "#f59e0b", "#7c3aed"],
  },
  {
    value: "SUNSET",
    label: "Sunset",
    description: "Warm coral, apricot, and evening glow",
    swatches: ["#fff7ed", "#fb7185", "#7c2d12"],
  },
  {
    value: "BOTANICAL",
    label: "Botanical",
    description: "Fresh sage, linen, and garden green",
    swatches: ["#f4f7ef", "#86a789", "#244436"],
  },
  {
    value: "OCEAN",
    label: "Ocean",
    description: "Sea glass, blue sky, and deep water",
    swatches: ["#ecfeff", "#38bdf8", "#164e63"],
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

export function getMomentCategory(value: MomentOccasion) {
  return MOMENT_CATEGORIES.find((category) => category.occasions.includes(value)) ?? MOMENT_CATEGORIES[0]!;
}
