export const BIRTHDAY_SCENE_IDS = ["gift", "cake", "memories", "message", "secret", "celebration"] as const;
export type BirthdaySceneId = typeof BIRTHDAY_SCENE_IDS[number];
export type BirthdayStoryTheme = "ROMANTIC_PINK" | "LUXURY_GOLD" | "CUTE_PASTEL" | "MINIMAL_ELEGANT";
export type BirthdayCakeDesign = "CLASSIC" | "CHOCOLATE" | "PASTEL";
export interface BirthdayMemory { caption: string; date: string }
export interface BirthdayStorySettings {
  version: 1;
  enabled: boolean;
  theme: BirthdayStoryTheme;
  scenes: BirthdaySceneId[];
  teaser: string;
  cake: { design: BirthdayCakeDesign; candles: number };
  memories: BirthdayMemory[];
  allowReplay: boolean;
  allowReactions: boolean;
}

export const BIRTHDAY_STORY_THEMES = [
  { value: "ROMANTIC_PINK", label: "Romantic Pink", labelKm: "ផ្កាឈូករ៉ូមែនទិក", background: "#fff1f5", surface: "#ffffff", ink: "#4c1530", muted: "#87576f", accent: "#be185d", soft: "#fbcfe8", border: "#f3b3cf", swatches: ["#fff1f5", "#be185d", "#fbcfe8"] },
  { value: "LUXURY_GOLD", label: "Luxury Gold", labelKm: "មាសប្រណីត", background: "#15151b", surface: "#24232b", ink: "#fff5de", muted: "#d0c1a4", accent: "#e9c46a", soft: "#3c3324", border: "#6d5936", swatches: ["#15151b", "#e9c46a", "#fff5de"] },
  { value: "CUTE_PASTEL", label: "Cute Pastel", labelKm: "ពណ៌ផាស្ទែលគួរឱ្យស្រឡាញ់", background: "#f5f0ff", surface: "#ffffff", ink: "#463365", muted: "#79658f", accent: "#7c3aed", soft: "#e9d5ff", border: "#cdb7e9", swatches: ["#f5f0ff", "#a7f3d0", "#fbcfe8"] },
  { value: "MINIMAL_ELEGANT", label: "Minimal Elegant", labelKm: "សាមញ្ញនិងឆើតឆាយ", background: "#f6f4ef", surface: "#ffffff", ink: "#292b2c", muted: "#676b69", accent: "#486657", soft: "#e0e8df", border: "#cbd3c8", swatches: ["#f6f4ef", "#486657", "#e0e8df"] },
] as const;

export function createBirthdayStorySettings(): BirthdayStorySettings {
  return { version: 1, enabled: false, theme: "ROMANTIC_PINK", scenes: [...BIRTHDAY_SCENE_IDS], teaser: "", cake: { design: "CLASSIC", candles: 3 }, memories: [], allowReplay: true, allowReactions: true };
}

export function validBirthdayMemoryDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function readBirthdayStorySettings(value: unknown): BirthdayStorySettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const cake = v.cake as Record<string, unknown> | undefined;
  if (v.version !== 1 || typeof v.enabled !== "boolean" ||
      !BIRTHDAY_STORY_THEMES.some((theme) => theme.value === v.theme) ||
      !Array.isArray(v.scenes) || !v.scenes.length || v.scenes.length > 6 ||
      new Set(v.scenes).size !== v.scenes.length || v.scenes.some((scene) => !BIRTHDAY_SCENE_IDS.includes(scene as BirthdaySceneId)) ||
      (v.scenes.includes("gift") && v.scenes[0] !== "gift") ||
      (v.scenes.includes("celebration") && v.scenes.at(-1) !== "celebration") ||
      typeof v.teaser !== "string" || v.teaser.length > 160 ||
      !cake || typeof cake !== "object" || Array.isArray(cake) || !["CLASSIC", "CHOCOLATE", "PASTEL"].includes(cake.design as string) ||
      typeof cake.candles !== "number" || !Number.isInteger(cake.candles) || cake.candles < 1 || cake.candles > 12 ||
      !Array.isArray(v.memories) || v.memories.length > 10 ||
      typeof v.allowReplay !== "boolean" || typeof v.allowReactions !== "boolean") return null;
  const memories: BirthdayMemory[] = [];
  for (const entry of v.memories) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const memory = entry as Record<string, unknown>;
    if (typeof memory.caption !== "string" || memory.caption.length > 200 || typeof memory.date !== "string" || !validBirthdayMemoryDate(memory.date)) return null;
    memories.push({ caption: memory.caption.trim(), date: memory.date });
  }
  return { version: 1, enabled: v.enabled, theme: v.theme as BirthdayStoryTheme, scenes: [...v.scenes] as BirthdaySceneId[], teaser: v.teaser.trim(), cake: { design: cake.design as BirthdayCakeDesign, candles: cake.candles }, memories, allowReplay: v.allowReplay, allowReactions: v.allowReactions };
}

export function getBirthdayStoryScenes(settings: BirthdayStorySettings, context: { photoCount: number; hasSecret: boolean }): BirthdaySceneId[] {
  const scenes = settings.scenes.filter((scene) => (scene !== "memories" || context.photoCount > 0) && (scene !== "secret" || context.hasSecret));
  return scenes.length ? scenes : ["message"];
}

export function birthdayStoryThemeStyle(theme: BirthdayStoryTheme) {
  const tokens = BIRTHDAY_STORY_THEMES.find((item) => item.value === theme) ?? BIRTHDAY_STORY_THEMES[0];
  return { "--moment-bg": tokens.background, "--moment-surface": tokens.surface, "--moment-ink": tokens.ink, "--moment-muted": tokens.muted, "--moment-accent": tokens.accent, "--moment-accent-soft": tokens.soft, "--moment-border": tokens.border, "--moment-shadow": `${tokens.accent}20` };
}
