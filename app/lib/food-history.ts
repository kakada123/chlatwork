export const FOOD_HISTORY_KEY = "chlatwork:food:recent-suggestions:v1";
export interface FoodRecentHistory { placeIds: string[]; recipeNames: string[] }
type SessionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function recipeNameKey(name: string) { return name.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\p{S}\s\u200b-\u200d]+/gu, ""); }
export function appendRecent(values: string[], additions: string[]): string[] {
  return [...new Set([...values, ...additions].filter((value) => typeof value === "string" && value.trim()))].slice(-40);
}
export function readFoodHistory(store?: SessionStore): FoodRecentHistory {
  const empty = { placeIds: [], recipeNames: [] };
  try {
    const value = JSON.parse(store?.getItem(FOOD_HISTORY_KEY) || "null");
    if (!value || !Array.isArray(value.placeIds) || !Array.isArray(value.recipeNames)) return empty;
    return { placeIds: appendRecent([], value.placeIds.filter((value: unknown) => typeof value === "string" && value.length <= 300)), recipeNames: appendRecent([], value.recipeNames.filter((value: unknown) => typeof value === "string" && value.length <= 160)) };
  } catch { return empty; }
}
export function saveFoodHistory(history: FoodRecentHistory, store?: SessionStore) {
  // Persist only bounded suggestion names/IDs, never locations, allergies, account details or route data.
  try { store?.setItem(FOOD_HISTORY_KEY, JSON.stringify(history)); } catch { /* Private mode/quota must not block discovery. */ }
}
