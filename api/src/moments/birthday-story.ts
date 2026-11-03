export type BirthdaySceneId = 'gift' | 'cake' | 'memories' | 'message' | 'secret' | 'celebration';
export interface BirthdayStorySettings {
  version: 1;
  enabled: boolean;
  theme: 'ROMANTIC_PINK' | 'LUXURY_GOLD' | 'CUTE_PASTEL' | 'MINIMAL_ELEGANT';
  scenes: BirthdaySceneId[];
  teaser: string;
  cake: { design: 'CLASSIC' | 'CHOCOLATE' | 'PASTEL'; candles: number };
  memories: Array<{ caption: string; date: string }>;
  allowReplay: boolean;
  allowReactions: boolean;
}

function validMemoryDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Validate the wire contract independently: Railway never depends on files in the Nuxt application. */
export function readBirthdayStorySettings(value: unknown): BirthdayStorySettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const cake = v.cake as Record<string, unknown> | undefined;
  const sceneIds = ['gift', 'cake', 'memories', 'message', 'secret', 'celebration'];
  if (v.version !== 1 || typeof v.enabled !== 'boolean' ||
      !['ROMANTIC_PINK', 'LUXURY_GOLD', 'CUTE_PASTEL', 'MINIMAL_ELEGANT'].includes(v.theme as string) ||
      !Array.isArray(v.scenes) || !v.scenes.length || v.scenes.length > 6 ||
      new Set(v.scenes).size !== v.scenes.length || v.scenes.some((scene) => !sceneIds.includes(scene)) ||
      (v.scenes.includes('gift') && v.scenes[0] !== 'gift') ||
      (v.scenes.includes('celebration') && v.scenes.at(-1) !== 'celebration') ||
      typeof v.teaser !== 'string' || v.teaser.length > 160 ||
      !cake || typeof cake !== 'object' || Array.isArray(cake) || !['CLASSIC', 'CHOCOLATE', 'PASTEL'].includes(cake.design as string) ||
      typeof cake.candles !== 'number' || !Number.isInteger(cake.candles) || cake.candles < 1 || cake.candles > 12 ||
      !Array.isArray(v.memories) || v.memories.length > 10 ||
      typeof v.allowReplay !== 'boolean' || typeof v.allowReactions !== 'boolean') return null;
  const memories: BirthdayStorySettings['memories'] = [];
  for (const entry of v.memories) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const memory = entry as Record<string, unknown>;
    if (typeof memory.caption !== 'string' || memory.caption.length > 200 || typeof memory.date !== 'string' || !validMemoryDate(memory.date)) return null;
    memories.push({ caption: memory.caption.trim(), date: memory.date });
  }
  return { version: 1, enabled: v.enabled, theme: v.theme as BirthdayStorySettings['theme'], scenes: [...v.scenes] as BirthdaySceneId[], teaser: v.teaser.trim(), cake: { design: cake.design as BirthdayStorySettings['cake']['design'], candles: cake.candles }, memories, allowReplay: v.allowReplay, allowReactions: v.allowReactions };
}
