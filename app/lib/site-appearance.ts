export const KHMER_FONT_NAMES = {
  "google-sans": "Google Sans",
  hanuman: "Hanuman",
} as const;

export type KhmerFont = keyof typeof KHMER_FONT_NAMES;
export type SiteAppearance = { khmerFont: KhmerFont };

export function containsKhmerContent(value: string) {
  return /[\u1780-\u17FF\u19E0-\u19FF]/u.test(value);
}
