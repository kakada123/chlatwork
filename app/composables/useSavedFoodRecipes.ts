import { computed, ref, watch } from "vue";
import type { KhmerRecipe } from "~/composables/useFoodDiscovery";

export function useSavedFoodRecipes(owner: () => string | null) {
  const recipes = ref<KhmerRecipe[]>([]);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const cursor = ref<string | undefined>();
  const hasMore = computed(() => Boolean(owner() && cursor.value));
  let revision = 0,
    pendingRefresh = false;
  const seen = new Set<string>();
  // A new account must never briefly see the previous account's saved content or late responses.
  watch(
    owner,
    () => {
      revision++;
      recipes.value = [];
      cursor.value = undefined;
      errorMessage.value = null;
      isLoading.value = false;
      pendingRefresh = false;
      seen.clear();
    },
    { flush: "sync" },
  );

  async function load(reset: boolean) {
    const account = owner();
    if (!account) return;
    if (isLoading.value) {
      if (reset) pendingRefresh = true;
      return;
    }
    if (!reset && !cursor.value) return;
    const version = revision,
      token = reset ? undefined : cursor.value;
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const response = await $fetch<{
        recipes: KhmerRecipe[];
        nextCursor?: string;
      }>("/api/food/saved-recipes", {
        query: { limit: 20, ...(token ? { cursor: token } : {}) },
        retry: 0,
      });
      if (version !== revision || account !== owner()) return;
      if (reset) {
        recipes.value = [];
        seen.clear();
      }
      const ids = new Set(recipes.value.map((recipe) => recipe.savedRecipeId));
      for (const recipe of response.recipes) {
        if (recipe.savedRecipeId && !ids.has(recipe.savedRecipeId)) {
          recipes.value.push(recipe);
          ids.add(recipe.savedRecipeId);
        }
      }
      if (token) seen.add(token);
      cursor.value =
        response.nextCursor && !seen.has(response.nextCursor)
          ? response.nextCursor
          : undefined;
    } catch {
      if (version === revision && account === owner())
        errorMessage.value =
          "មិនអាចផ្ទុករូបមន្តដែលបានរក្សាទុកបានទេ។ សូមសាកម្ដងទៀត។";
    } finally {
      if (version === revision && account === owner()) {
        isLoading.value = false;
        if (pendingRefresh) {
          pendingRefresh = false;
          void load(true);
        }
      }
    }
  }
  return {
    recipes,
    isLoading,
    errorMessage,
    hasMore,
    refresh: () => load(true),
    loadMore: () => load(false),
  };
}
