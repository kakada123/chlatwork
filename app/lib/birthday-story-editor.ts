import type { BirthdaySceneId, BirthdayStorySettings } from "./birthday-story";

/** Fixed opening and finale positions remain valid after any editor action. */
export function toggleBirthdayScene(scenes: BirthdaySceneId[], scene: BirthdaySceneId): BirthdaySceneId[] {
  if (scenes.includes(scene)) return scenes.length > 1 ? scenes.filter((item) => item !== scene) : [...scenes];
  if (scene === "gift") return [scene, ...scenes];
  if (scene === "celebration") return [...scenes, scene];
  const next = [...scenes];
  const finale = next.indexOf("celebration");
  next.splice(finale < 0 ? next.length : finale, 0, scene);
  return next;
}

export function moveBirthdayScene(scenes: BirthdaySceneId[], scene: BirthdaySceneId, direction: -1 | 1): BirthdaySceneId[] {
  const index = scenes.indexOf(scene);
  const target = index + direction;
  if (scene === "gift" || scene === "celebration" || index < 0 || target < 0 || target >= scenes.length || scenes[target] === "gift" || scenes[target] === "celebration") return [...scenes];
  const next = [...scenes];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function reorderBirthdayPhotos<T extends { id: string }>(photos: readonly T[], id: string, target: number): T[] {
  const from = photos.findIndex((photo) => photo.id === id);
  const next = [...photos];
  if (from < 0 || target < 0 || target >= photos.length || !Number.isInteger(target)) return next;
  const [photo] = next.splice(from, 1);
  next.splice(target, 0, photo!);
  return next;
}

/** Upload position is the API contract; keep captions on photo objects until that boundary. */
export function alignBirthdayStoryMemories(settings: BirthdayStorySettings, photos: readonly { caption?: string; date?: string }[]): BirthdayStorySettings {
  return {
    ...settings,
    scenes: [...settings.scenes],
    cake: { ...settings.cake },
    memories: photos.map((photo) => ({ caption: photo.caption ?? "", date: photo.date ?? "" })),
  };
}
