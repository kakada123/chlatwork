import { computed, ref } from "vue";
import {
  appendRecent,
  readFoodHistory,
  recipeNameKey,
  saveFoodHistory,
} from "~/lib/food-history";
import type {
  FoodDistrict,
  KhmerRecipe,
  RandomFoodSuggestion,
  RankedPlace,
} from "~/composables/useFoodDiscovery";

export interface FoodFilterDefinition {
  key: string;
  label: string;
  labelKm: string;
  multiple: boolean;
  groups: Array<{
    label: string;
    options: Array<{ value: string; label: string; disabled?: boolean }>;
  }>;
}
interface FoodResult {
  mode: string;
  places: RankedPlace[];
  recipes?: KhmerRecipe[];
  dataSource: "google" | "curated" | "gemini";
  nextPageToken?: string;
  searchCenter?: { lat: number; lng: number };
  routePolyline?: string;
}

export function useFoodResults(
  criteria: () => Record<string, unknown>,
  mode: { value: string },
) {
  const places = ref<RankedPlace[]>([]),
    recipes = ref<KhmerRecipe[]>([]);
  const selectedPlace = ref<RankedPlace | null>(null),
    randomSuggestion = ref<RandomFoodSuggestion | null>(null);
  const isLoading = ref(false),
    isLoadingMore = ref(false),
    isRandomLoading = ref(false);
  const errorMessage = ref<string | null>(null),
    paginationError = ref(false),
    hasSearched = ref(false);
  const dataSource = ref<"google" | "curated" | "gemini">("google");
  const recent = ref({ placeIds: [] as string[], recipeNames: [] as string[] });
  const filterDefinitions = ref<FoodFilterDefinition[]>([]),
    filtersError = ref(false);
  let loadedHistory = false,
    pendingRefresh = false,
    inFlightSignature = "";
  let nextPage: string | undefined,
    activeCriteria: Record<string, unknown> = {};
  const activeSignature = ref("");
  let searchCenter: { lat: number; lng: number } | undefined,
    routePolyline: string | undefined;
  const cursor = ref<string | undefined>();
  const seenTokens = new Set<string>();
  const busy = () =>
    isLoading.value || isLoadingMore.value || isRandomLoading.value;
  const signature = () => JSON.stringify(criteria());
  const hasSuggestionHistory = computed(() =>
    Boolean(recent.value.placeIds.length || recent.value.recipeNames.length),
  );
  const hasMorePlaces = computed(
    () =>
      mode.value === "dine-out" &&
      Boolean(cursor.value) &&
      signature() === activeSignature.value,
  );
  const canAutoLoadMore = computed(
    () => hasMorePlaces.value && !busy() && !paginationError.value,
  );

  function storage() {
    try {
      return typeof window === "undefined" ? undefined : window.sessionStorage;
    } catch {
      return undefined;
    }
  }
  function loadHistory() {
    if (!loadedHistory) {
      recent.value = readFoodHistory(storage());
      loadedHistory = true;
    }
  }
  function payload(
    base: Record<string, unknown>,
    limit: number,
    includeCurrent = false,
  ) {
    loadHistory();
    const ids = [
      ...new Set([
        ...recent.value.placeIds,
        ...(includeCurrent ? places.value.map((place) => place.id) : []),
      ]),
    ].slice(-100);
    return {
      ...base,
      limit,
      ...(ids.length ? { excludePlaceIds: ids } : {}),
      ...(recent.value.recipeNames.length
        ? { recentRecipeNames: [...recent.value.recipeNames] }
        : {}),
    };
  }
  function remember(
    newPlaces: RankedPlace[] = [],
    newRecipes: KhmerRecipe[] = [],
  ) {
    recent.value = {
      placeIds: appendRecent(
        recent.value.placeIds,
        newPlaces.map((place) => place.id),
      ),
      recipeNames: appendRecent(
        recent.value.recipeNames,
        newRecipes.flatMap((recipe) => [recipe.nameKm, recipe.nameEn]),
      ),
    };
    saveFoodHistory(recent.value, storage());
  }
  function clearSuggestionHistory() {
    recent.value = { placeIds: [], recipeNames: [] };
    loadedHistory = true;
    saveFoodHistory(recent.value, storage());
  }
  function freshRecipes(values: KhmerRecipe[]) {
    const names = new Set(recent.value.recipeNames.map(recipeNameKey));
    return values.filter((recipe) => {
      const keys = [recipeNameKey(recipe.nameKm), recipeNameKey(recipe.nameEn)];
      if (keys.some((key) => names.has(key))) return false;
      keys.forEach((key) => names.add(key));
      return true;
    });
  }
  async function fetchFilters() {
    try {
      filterDefinitions.value =
        await $fetch<FoodFilterDefinition[]>("/api/food/filters");
      filtersError.value = false;
    } catch {
      filtersError.value = true;
    }
  }
  function drainRefresh() {
    if (pendingRefresh && !busy()) {
      pendingRefresh = false;
      void getRecommendations();
    }
  }

  async function getRecommendations() {
    const key = signature();
    if (busy()) {
      if (key !== inFlightSignature) pendingRefresh = true;
      return;
    }
    isLoading.value = true;
    inFlightSignature = key;
    errorMessage.value = null;
    paginationError.value = false;
    hasSearched.value = true;
    const base = JSON.parse(key) as Record<string, unknown>;
    try {
      const result = await $fetch<FoodResult>("/api/food/recommend", {
        method: "POST",
        // One full bilingual recipe per request reduces model latency without extra paid calls.
        body: payload(base, mode.value === "cook-at-home" ? 1 : 20),
        retry: 0,
      });
      if (signature() !== key) return;
      const known = new Set(recent.value.placeIds);
      places.value = (result.places || []).filter((place) => {
        if (known.has(place.id)) return false;
        known.add(place.id);
        return true;
      });
      recipes.value = freshRecipes(result.recipes || []);
      selectedPlace.value = places.value[0] || null;
      dataSource.value = result.dataSource;
      activeSignature.value = key;
      activeCriteria = base;
      seenTokens.clear();
      nextPage = result.nextPageToken;
      cursor.value = nextPage;
      searchCenter = result.searchCenter;
      routePolyline = result.routePolyline;
      remember(places.value, recipes.value);
      if (
        !places.value.length &&
        !recipes.value.length &&
        hasSuggestionHistory.value &&
        !cursor.value
      )
        errorMessage.value =
          "មិនមានជម្រើសថ្មីដែលត្រូវគ្នាទេ។ សាកប្តូរតម្រង ឬអនុញ្ញាតឱ្យបង្ហាញជម្រើសចាស់ឡើងវិញ។";
    } catch {
      if (signature() === key) {
        errorMessage.value =
          "មិនអាចទាញយកការណែនាំបានទេ។ សូមពិនិត្យតម្រង ទីតាំង និងព្យាយាមម្តងទៀត។";
        cursor.value = undefined;
      }
    } finally {
      isLoading.value = false;
      drainRefresh();
    }
  }

  async function loadMorePlaces() {
    if (busy() || !hasMorePlaces.value || !nextPage) return;
    const key = activeSignature.value,
      token = nextPage;
    isLoadingMore.value = true;
    inFlightSignature = key;
    paginationError.value = false;
    try {
      const result = await $fetch<FoodResult>("/api/food/recommend", {
        method: "POST",
        retry: 0,
        body: {
          ...payload(activeCriteria, 20, true),
          pageToken: token,
          ...(searchCenter
            ? { searchLat: searchCenter.lat, searchLng: searchCenter.lng }
            : {}),
          ...(routePolyline ? { routePolyline } : {}),
        },
      });
      if (signature() !== key || activeSignature.value !== key) return;
      const known = new Set([
        ...recent.value.placeIds,
        ...places.value.map((place) => place.id),
      ]);
      const additions = (result.places || []).filter((place) => {
        if (known.has(place.id)) return false;
        known.add(place.id);
        return true;
      });
      places.value.push(...additions);
      remember(additions);
      seenTokens.add(token);
      nextPage =
        result.nextPageToken && !seenTokens.has(result.nextPageToken)
          ? result.nextPageToken
          : undefined;
      cursor.value = nextPage;
      if (!selectedPlace.value) selectedPlace.value = places.value[0] || null;
    } catch {
      paginationError.value = true;
      errorMessage.value = "មិនអាចផ្ទុកហាងបន្ថែមបានទេ។ ចុចដើម្បីសាកម្ដងទៀត។";
    } finally {
      isLoadingMore.value = false;
      drainRefresh();
    }
  }

  async function fetchRandomPick() {
    if (busy()) return;
    const key = signature();
    inFlightSignature = key;
    isRandomLoading.value = true;
    errorMessage.value = null;
    randomSuggestion.value = null;
    try {
      const result = await $fetch<RandomFoodSuggestion>("/api/food/pick", {
        method: "POST",
        body: payload(JSON.parse(key), 20, true),
        retry: 0,
      });
      if (signature() !== key) return;
      if (
        result.place &&
        (recent.value.placeIds.includes(result.place.id) ||
          places.value.some((place) => place.id === result.place!.id))
      )
        throw new Error("Repeated place");
      if (result.recipe && !freshRecipes([result.recipe]).length)
        throw new Error("Repeated recipe");
      randomSuggestion.value = result;
      remember(
        result.place ? [result.place] : [],
        result.recipe ? [result.recipe] : [],
      );
    } catch {
      if (signature() === key)
        errorMessage.value =
          "មិនអាចរើសជម្រើសថ្មីជាមួយ AI បានទេ។ សាកប្តូរតម្រង ឬព្យាយាមម្ដងទៀត។";
    } finally {
      isRandomLoading.value = false;
      drainRefresh();
    }
  }

  return {
    places,
    recipes,
    selectedPlace,
    randomSuggestion,
    isLoading,
    isLoadingMore,
    isRandomLoading,
    errorMessage,
    dataSource,
    hasSearched,
    filterDefinitions,
    filtersError,
    hasSuggestionHistory,
    hasMorePlaces,
    canAutoLoadMore,
    paginationError,
    fetchFilters,
    getRecommendations,
    loadMorePlaces,
    fetchRandomPick,
    clearSuggestionHistory,
  };
}
