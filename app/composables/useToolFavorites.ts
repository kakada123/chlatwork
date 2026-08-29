import { ENABLED_TOOLS } from "~/lib/tool-registry";

export function useToolFavorites() {
  const {
    favoriteToolKeys,
    favoritesReady,
    favoriteError,
    setFavorite,
    isFavoriteSaving,
  } = useAccountFavorites();
  const validToolKeys = new Set(ENABLED_TOOLS.map((tool) => tool.key));
  const validFavoriteToolKeys = computed(() =>
    favoriteToolKeys.value.filter((key) => validToolKeys.has(key)),
  );

  function isFavorite(toolKey: string) {
    return validFavoriteToolKeys.value.includes(toolKey);
  }

  async function toggleFavorite(toolKey: string) {
    if (!validToolKeys.has(toolKey)) return false;
    return await setFavorite("TOOL", toolKey, !isFavorite(toolKey));
  }

  return {
    favoriteToolKeys: validFavoriteToolKeys,
    favoritesReady,
    favoriteError,
    isFavorite,
    toggleFavorite,
    isFavoriteSaving: (toolKey: string) => isFavoriteSaving("TOOL", toolKey),
  };
}
