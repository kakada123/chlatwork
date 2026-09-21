import { ENABLED_TOOLS } from "~/lib/tool-registry";
import { useFeatureAvailability } from "~/composables/useFeatureAvailability";

export function useToolFavorites() {
  const { websiteEnabled } = useFeatureAvailability();
  const {
    favoriteToolKeys,
    favoritesReady,
    favoriteError,
    setFavorite,
    isFavoriteSaving,
  } = useAccountFavorites();
  const validToolKeys = new Set(ENABLED_TOOLS.map((tool) => tool.key));
  const validFavoriteToolKeys = computed(() =>
    favoriteToolKeys.value.filter((key) => validToolKeys.has(key) && websiteEnabled(key)),
  );

  function isFavorite(toolKey: string) {
    return validFavoriteToolKeys.value.includes(toolKey);
  }

  async function toggleFavorite(toolKey: string) {
    if (!validToolKeys.has(toolKey) || !websiteEnabled(toolKey)) return false;
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
