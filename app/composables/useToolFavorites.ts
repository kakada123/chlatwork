import { ENABLED_TOOLS } from "~/lib/tool-registry";

const STORAGE_KEY = "chlatwork_tool_favorites";

export function useToolFavorites() {
  const favoriteToolKeys = useState<string[]>("favorite-tool-keys", () => []);
  const favoritesReady = useState<boolean>("favorite-tools-ready", () => false);

  function readStoredFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      const validKeys = new Set(ENABLED_TOOLS.map((tool) => tool.key));
      favoriteToolKeys.value = Array.isArray(stored)
        ? stored.filter((key): key is string => typeof key === "string" && validKeys.has(key))
        : [];
    } catch {
      favoriteToolKeys.value = [];
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

  function isFavorite(toolKey: string) {
    return favoriteToolKeys.value.includes(toolKey);
  }

  function toggleFavorite(toolKey: string) {
    favoriteToolKeys.value = isFavorite(toolKey)
      ? favoriteToolKeys.value.filter((key) => key !== toolKey)
      : [toolKey, ...favoriteToolKeys.value];

    if (import.meta.client) {
      // Persist only public registry keys; tool input and generated content are never stored here.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteToolKeys.value));
    }
  }

  return { favoriteToolKeys, favoritesReady, isFavorite, toggleFavorite };
}
