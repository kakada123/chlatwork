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
  waitForAccount = false,
) {
  const places = ref<RankedPlace[]>([]),
    recipes = ref<KhmerRecipe[]>([]);
  const selectedPlace = ref<RankedPlace | null>(null),
    randomSuggestion = ref<RandomFoodSuggestion | null>(null);
  const isLoading = ref(false),
    isRecipeLoading = ref(false),
    isLoadingMore = ref(false),
    isRandomLoading = ref(false);
  const errorMessage = ref<string | null>(null),
    paginationError = ref(false),
    hasSearched = ref(false);
  const dataSource = ref<"google" | "curated" | "gemini">("google");
  const recent = ref({ placeIds: [] as string[], recipeNames: [] as string[] });
  const filterDefinitions = ref<FoodFilterDefinition[]>([]),
    filtersError = ref(false);
  const savedRecipesVersion = ref(0);
  let accountScope = "guest",
    accountRevision = 0,
    accountReady = !waitForAccount;
  let loadedHistory = false,
    pendingRefresh: string | null = null,
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
      recent.value = readFoodHistory(storage(), accountScope);
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
    saveFoodHistory(recent.value, storage(), accountScope);
  }
  function clearSuggestionHistory() {
    recent.value = { placeIds: [], recipeNames: [] };
    loadedHistory = true;
    saveFoodHistory(recent.value, storage(), accountScope);
  }
  function setAccountScope(ownerId: string | null): boolean {
    accountReady = true;
    const next = ownerId || "guest";
    if (next === accountScope) return false;
    accountScope = next;
    accountRevision++;
    places.value = [];
    recipes.value = [];
    selectedPlace.value = null;
    randomSuggestion.value = null;
    recent.value = { placeIds: [], recipeNames: [] };
    loadedHistory = false;
    nextPage = undefined;
    cursor.value = undefined;
    activeSignature.value = "";
    activeCriteria = {};
    searchCenter = undefined;
    routePolyline = undefined;
    seenTokens.clear();
    errorMessage.value = null;
    hasSearched.value = false;
    paginationError.value = false;
    pendingRefresh = null;
    isRecipeLoading.value = false;
    inFlightSignature = "";
    return true;
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
      const requestedCriteria = pendingRefresh;
      pendingRefresh = null;
      // Only the latest explicitly submitted criteria may run; opening another mode is not a request.
      if (requestedCriteria === signature()) void getRecommendations();
    }
  }

  function placesQuotaMessage(error: unknown): string | undefined {
    const response = (error as {
      data?: { code?: string; data?: { code?: string } };
    } | null)?.data;
    if (
      response?.code === "FOOD_PLACES_RATE_LIMITED" ||
      response?.data?.code === "FOOD_PLACES_RATE_LIMITED"
    )
      return "Google Places បានឈានដល់កម្រិតប្រើប្រាស់។ សូមរង់ចាំយ៉ាងហោចណាស់ ១ នាទី រួចសាកម្ដងទៀត។ បើនៅតែមិនបាន សូមទាក់ទងអ្នកគ្រប់គ្រងឱ្យពិនិត្យ quota របស់ Google។";
  }

  async function getRecommendations() {
    if (!accountReady) return;
    const ownerRevision = accountRevision;
    const key = signature();
    if (busy()) {
      pendingRefresh = key !== inFlightSignature ? key : null;
      return;
    }
    isLoading.value = true;
    isRecipeLoading.value = mode.value === "cook-at-home";
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
      if (ownerRevision !== accountRevision || signature() !== key) return;
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
      if (recipes.value.some((recipe) => recipe.savedRecipeId))
        savedRecipesVersion.value++;
      if (
        !places.value.length &&
        !recipes.value.length &&
        hasSuggestionHistory.value &&
        !cursor.value
      )
        errorMessage.value =
          "មិនមានជម្រើសថ្មីដែលត្រូវគ្នាទេ។ សាកប្តូរតម្រង ឬអនុញ្ញាតឱ្យបង្ហាញជម្រើសចាស់ឡើងវិញ។";
    } catch (error) {
      if (ownerRevision === accountRevision && signature() === key) {
        errorMessage.value =
          placesQuotaMessage(error) ??
          "មិនអាចទាញយកការណែនាំបានទេ។ សូមពិនិត្យតម្រង ទីតាំង និងព្យាយាមម្តងទៀត។";
        cursor.value = undefined;
      }
    } finally {
      isLoading.value = false;
      isRecipeLoading.value = false;
      drainRefresh();
    }
  }

  async function loadMorePlaces() {
    const ownerRevision = accountRevision;
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
      if (
        ownerRevision !== accountRevision ||
        signature() !== key ||
        activeSignature.value !== key
      )
        return;
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
    } catch (error) {
      if (ownerRevision !== accountRevision) return;
      paginationError.value = true;
      errorMessage.value =
        placesQuotaMessage(error) ??
        "មិនអាចផ្ទុកហាងបន្ថែមបានទេ។ ចុចដើម្បីសាកម្ដងទៀត។";
    } finally {
      isLoadingMore.value = false;
      drainRefresh();
    }
  }

  async function fetchRandomPick() {
    if (!accountReady || busy()) return;
    const ownerRevision = accountRevision;
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
      if (ownerRevision !== accountRevision || signature() !== key) return;
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
      if (result.recipe?.savedRecipeId) savedRecipesVersion.value++;
    } catch (error) {
      if (ownerRevision === accountRevision && signature() === key)
        errorMessage.value =
          placesQuotaMessage(error) ??
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
    isRecipeLoading,
    isLoadingMore,
    isRandomLoading,
    errorMessage,
    dataSource,
    hasSearched,
    filterDefinitions,
    savedRecipesVersion,
    setAccountScope,
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
