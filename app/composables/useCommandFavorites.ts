import { DEVELOPER_COMMANDS } from "~/data/developer-commands";

export function useCommandFavorites() {
  const {
    favoriteCommandIds,
    favoritesReady,
    favoriteError,
    setFavorite,
    isFavoriteSaving,
  } = useAccountFavorites();
  const validCommandIds = new Set(DEVELOPER_COMMANDS.map((command) => command.id));
  const validFavoriteCommandIds = computed(() =>
    favoriteCommandIds.value.filter((id) => validCommandIds.has(id)),
  );

  async function toggleCommandFavorite(id: string) {
    if (!validCommandIds.has(id)) return false;
    return await setFavorite("COMMAND", id, !validFavoriteCommandIds.value.includes(id));
  }

  return {
    favoriteCommandIds: validFavoriteCommandIds,
    favoritesReady,
    favoriteError,
    toggleCommandFavorite,
    isFavoriteSaving: (id: string) => isFavoriteSaving("COMMAND", id),
  };
}
