export type FavoriteKind = "TOOL" | "COMMAND";

interface FavoritesResponse {
  toolKeys: string[];
  commandIds: string[];
}

interface FavoriteMutationResponse {
  favorite: boolean;
}

// Network requests belong to one running app, not Nuxt's serialized hydration state.
const favoriteReads = new WeakMap<object, { userId: string; promise: Promise<void> }>();

export function useAccountFavorites() {
  const app = useNuxtApp();
  const { user, isReady: authReady, fetchMe } = useAuth();
  const route = useRoute();
  const favoriteToolKeys = useState<string[]>("favorite-tool-keys", () => []);
  const favoriteCommandIds = useState<string[]>("favorite-command-ids", () => []);
  const favoritesReady = useState<boolean>("account-favorites-ready", () => false);
  const favoritesLoadedForUserId = useState<string>("account-favorites-user-id", () => "");
  const favoriteSavingKeys = useState<string[]>("account-favorites-saving-keys", () => []);
  const favoriteError = useState<string>("account-favorites-error", () => "");

  function clearFavorites() {
    favoriteReads.delete(app);
    favoriteToolKeys.value = [];
    favoriteCommandIds.value = [];
    favoritesLoadedForUserId.value = "";
    favoriteSavingKeys.value = [];
  }

  async function loadFavorites() {
    // $fetch on the server does not inherit the browser's host-only auth cookies.
    // Start the shared read in the browser instead of serializing a stuck pending marker.
    if (import.meta.server) return;
    if (!authReady.value) return;

    const userId = user.value?.id;
    if (!userId) {
      clearFavorites();
      favoriteError.value = "";
      favoritesReady.value = true;
      return;
    }

    if (favoritesLoadedForUserId.value === userId && favoritesReady.value) return;
    const pending = favoriteReads.get(app);
    if (pending?.userId === userId) return await pending.promise;

    favoritesReady.value = false;
    favoriteError.value = "";
    if (favoritesLoadedForUserId.value !== userId) {
      // Never show one account's favorites while a different account is loading.
      favoriteToolKeys.value = [];
      favoriteCommandIds.value = [];
      favoritesLoadedForUserId.value = "";
    }

    const request = { userId, promise: Promise.resolve() };
    favoriteReads.set(app, request);
    request.promise = (async () => {
      try {
        const response = await $fetch<FavoritesResponse>("/api/favorites");
        if (user.value?.id !== userId || favoriteReads.get(app) !== request) return;
        if (!response || !Array.isArray(response.toolKeys) || !Array.isArray(response.commandIds)
          || [...response.toolKeys, ...response.commandIds].some((key) => typeof key !== "string")) {
          throw new Error("Invalid favorites response");
        }
        favoriteToolKeys.value = response.toolKeys;
        favoriteCommandIds.value = response.commandIds;
        favoritesLoadedForUserId.value = userId;
      } catch {
        if (user.value?.id !== userId || favoriteReads.get(app) !== request) return;
        favoriteToolKeys.value = [];
        favoriteCommandIds.value = [];
        favoriteError.value = "Favorites could not be loaded from your account. Please try again.";
      } finally {
        if (favoriteReads.get(app) === request) {
          favoriteReads.delete(app);
          if (user.value?.id === userId) favoritesReady.value = true;
        }
      }
    })();
    await request.promise;
  }

  async function ensureSignedIn() {
    if (!authReady.value) await fetchMe();
    if (user.value) return true;

    await navigateTo({ path: "/login", query: { redirect: route.fullPath } });
    return false;
  }

  async function setFavorite(kind: FavoriteKind, itemKey: string, favorite: boolean) {
    if (!(await ensureSignedIn())) return false;

    const userId = user.value?.id;
    if (!userId) return false;
    if (favoritesLoadedForUserId.value !== userId || !favoritesReady.value) {
      await loadFavorites();
    }
    if (favoritesLoadedForUserId.value !== userId) return false;

    const savingKey = `${userId}:${kind}:${itemKey}`;
    if (favoriteSavingKeys.value.includes(savingKey)) return false;
    favoriteSavingKeys.value = [...favoriteSavingKeys.value, savingKey];
    favoriteError.value = "";

    try {
      const response = await $fetch<FavoriteMutationResponse>("/api/favorites", {
        method: "PUT",
        body: { kind, itemKey, favorite },
      });
      if (user.value?.id !== userId) return false;

      const target = kind === "TOOL" ? favoriteToolKeys : favoriteCommandIds;
      target.value = response.favorite
        ? [itemKey, ...target.value.filter((key) => key !== itemKey)]
        : target.value.filter((key) => key !== itemKey);
      return true;
    } catch {
      if (user.value?.id === userId) {
        favoriteError.value = "Your favorite was not saved. Please try again.";
      }
      return false;
    } finally {
      favoriteSavingKeys.value = favoriteSavingKeys.value.filter((key) => key !== savingKey);
    }
  }

  function isFavoriteSaving(kind: FavoriteKind, itemKey: string) {
    const userId = user.value?.id;
    return Boolean(userId && favoriteSavingKeys.value.includes(`${userId}:${kind}:${itemKey}`));
  }

  watch(
    [authReady, () => user.value?.id ?? ""],
    () => void loadFavorites(),
    { immediate: true },
  );

  return {
    favoriteToolKeys,
    favoriteCommandIds,
    favoritesReady,
    favoriteError,
    loadFavorites,
    setFavorite,
    isFavoriteSaving,
  };
}
