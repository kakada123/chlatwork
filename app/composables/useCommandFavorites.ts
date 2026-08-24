import { DEVELOPER_COMMANDS } from "~/data/developer-commands";

const STORAGE_KEY = "chlatwork_developer_command_favorites";

export function useCommandFavorites() {
  const favoriteCommandIds = useState<string[]>("favorite-command-ids", () => []);
  const favoritesReady = useState<boolean>("favorite-commands-ready", () => false);

  function readStoredFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      const validIds = new Set(DEVELOPER_COMMANDS.map((command) => command.id));
      favoriteCommandIds.value = Array.isArray(stored)
        ? stored.filter((id): id is string => typeof id === "string" && validIds.has(id))
        : [];
    } catch {
      favoriteCommandIds.value = [];
    }

    favoritesReady.value = true;
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) readStoredFavorites();
  }

  onMounted(() => {
    if (!favoritesReady.value) readStoredFavorites();
    window.addEventListener("storage", handleStorage);
  });

  onBeforeUnmount(() => window.removeEventListener("storage", handleStorage));

  function toggleCommandFavorite(id: string) {
    favoriteCommandIds.value = favoriteCommandIds.value.includes(id)
      ? favoriteCommandIds.value.filter((item) => item !== id)
      : [id, ...favoriteCommandIds.value];

    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteCommandIds.value));
    }
  }

  return { favoriteCommandIds, favoritesReady, toggleCommandFavorite };
}
