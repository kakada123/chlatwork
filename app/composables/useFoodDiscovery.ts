import { ref, computed } from "vue";
import { foodDirectionsUrl } from "~/lib/food-maps";
import { useFoodResults } from "~/composables/useFoodResults";
import {
  FOOD_QUICK_PRESETS,
  applyFoodQuickPreset,
  matchesFoodQuickPreset,
} from "~/lib/food-quick-presets";

export type DiscoveryMode = "dine-out" | "cook-at-home";
export type MealTime = "breakfast" | "lunch" | "snack" | "dinner" | "any";
export type Occasion =
  "solo" | "friends" | "first-date" | "couple" | "family" | "elderly" | "any";

export interface PlaceFeatures {
  wheelchair?: boolean;
  airConditioning?: boolean;
  outdoorSeating?: boolean;
  takeaway?: boolean;
  romantic?: boolean;
  familyFriendly?: boolean;
  groupFriendly?: boolean;
  quiet?: boolean;
}

export interface RankedPlace {
  id: string;
  googlePlaceId?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  attributions?: Array<{ provider: string; providerUri?: string }>;
  name: string;
  nameKm?: string;
  nameEn?: string;
  amenity: string;
  cuisine: string[];
  lat: number;
  lng: number;
  distanceMeters?: number;
  street?: string;
  district?: string;
  city: string;
  openingHours?: string;
  phone?: string;
  website?: string;
  priceTier?: string;
  estimatedPricePerPersonUsd?: number;
  isPriceVerified: boolean;
  recommendedDishes?: string[];
  features?: PlaceFeatures;
  source: "google" | "curated";
  score: number;
  budgetFit: string;
  matchedFactors: string[];
}

export interface RecipeIngredient {
  nameKm: string;
  nameEn: string;
  amount: string;
  optional?: boolean;
}

export interface RecipeStep {
  step: number;
  textKm: string;
  textEn: string;
}

export interface KhmerRecipe {
  id: string;
  nameKm: string;
  nameEn: string;
  descriptionKm: string;
  descriptionEn: string;
  mealTimes: Array<"breakfast" | "lunch" | "snack" | "dinner">;
  occasions: Array<
    "solo" | "friends" | "first-date" | "couple" | "family" | "elderly"
  >;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  estimatedCostUsd: number;
  category:
    "soup" | "stir-fry" | "curry" | "rice" | "noodle" | "salad" | "dessert";
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips?: string;
  source?: "gemini";
  savedRecipeId?: string;
  savedAt?: string;
  savedToAccount?: boolean;
  recommendationKm?: string;
}

export interface FoodDistrict {
  id: string;
  nameKm: string;
  nameEn: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface RandomFoodSuggestion {
  selectionSource?: "gemini";
  type: "dish" | "place";
  dish?: {
    nameKm: string;
    nameEn: string;
    descriptionKm: string;
    mealTime: MealTime;
    suggestedCuisine: string;
    recipeId?: string;
  };
  place?: RankedPlace;
  recipe?: KhmerRecipe;
  messageKm: string;
}

export function useFoodDiscovery(options: { waitForAccount?: boolean } = {}) {
  const mode = ref<DiscoveryMode>("dine-out");
  const mealTime = ref<MealTime>("lunch");
  const occasion = ref<Occasion>("friends");
  const peopleCount = ref<number>(3);
  const totalBudget = ref<number>(10);
  const selectedDistrictId = ref<string>("bkk");
  const searchKeyword = ref<string>("");

  const userCoords = ref<{ lat: number; lng: number } | null>(null);
  const isLocating = ref<boolean>(false);
  const locationError = ref(false);
  const locationLabel = ref<string>("បឹងកេងកង (Boeng Keng Kang)");

  const districts = ref<FoodDistrict[]>([]);
  const selectedRecipe = ref<KhmerRecipe | null>(null);
  const isSharedRecipeLoading = ref(false);
  const recipeDetailError = ref<string | null>(null);
  let sharedRecipeRequest = 0;
  const filters = ref<Record<string, string | string[]>>({});
  const locationQuery = ref("");
  const routeOrigin = ref("");
  const routeDestination = ref("");
  const allergies = ref("");
  const minimumRating = ref(0);
  const quickCriteria = () => ({
    filters: filters.value,
    peopleCount: peopleCount.value,
    totalBudget: totalBudget.value,
    mode: mode.value,
    keyword: searchKeyword.value,
  });
  const activeQuickPreset = computed(
    () =>
      FOOD_QUICK_PRESETS.find((preset) =>
        matchesFoodQuickPreset(quickCriteria(), preset),
      )?.id || null,
  );
  function selectQuickPreset(id: string) {
    const preset = FOOD_QUICK_PRESETS.find((preset) => preset.id === id);
    if (!preset) return;
    const next = applyFoodQuickPreset(quickCriteria(), preset);
    filters.value = next.filters;
    peopleCount.value = next.peopleCount;
    totalBudget.value = next.totalBudget;
    mode.value = next.mode;
    searchKeyword.value = next.keyword;
    minimumRating.value = 0;
  }
  async function selectCatalogFood(item: { nameKm: string; mealTimes: Array<"breakfast" | "lunch" | "snack" | "dinner"> }, target: DiscoveryMode) {
    const { foodTypes, cuisines, restaurantTypes, mealWindow, ...remaining } = filters.value;
    filters.value = remaining;
    mode.value = target;
    searchKeyword.value = item.nameKm;
    if (!item.mealTimes.some((meal) => meal === mealTime.value)) mealTime.value = item.mealTimes[0] || "any";
    closeRecipeDetail();
    randomSuggestion.value = null;
    await getRecommendations();
  }
  const results = useFoodResults(currentCriteria, mode, options.waitForAccount);
  let discoveryAccountRevision = 0;
  let locationRevision = 0;
  function setDiscoveryAccount(ownerId: string | null) {
    if (!results.setAccountScope(ownerId)) return;
    discoveryAccountRevision++;
    locationRevision++;
    isLocating.value = false;
    locationError.value = false;
    closeRecipeDetail();
    filters.value = {};
    allergies.value = "";
    locationQuery.value = "";
    routeOrigin.value = "";
    routeDestination.value = "";
    searchKeyword.value = "";
    minimumRating.value = 0;
    peopleCount.value = 3;
    totalBudget.value = 10;
    mealTime.value = "lunch";
    occasion.value = "friends";
    userCoords.value = null;
    selectedDistrictId.value = "bkk";
    locationLabel.value = "បឹងកេងកង (Boeng Keng Kang)";
  }
  const {
    places,
    recipes,
    selectedPlace,
    randomSuggestion,
    isLoading,
    isRandomLoading,
    errorMessage,
    getRecommendations,
  } = results;
  const copyNotification = ref<string | null>(null);

  const budgetPerPerson = computed(() => {
    if (filters.value.budgetType === "flexible-no-fixed-budget") return null;
    const range = String(filters.value.budgetRange || "");
    if (range.startsWith("fine-dining")) return null;
    const rangeCap = range.startsWith("ultra-budget")
      ? 1.99
      : range.startsWith("student-budget")
        ? 5
        : range.startsWith("affordable")
          ? 10
          : range.startsWith("moderate")
            ? 20
            : range.startsWith("comfortable")
              ? 35
              : range.startsWith("premium")
                ? 50
                : range.startsWith("luxury")
                  ? 100
                  : undefined;
    if (rangeCap !== undefined) return rangeCap;
    if (!totalBudget.value || peopleCount.value <= 0) return 0;
    if (filters.value.budgetType === "per-person") return totalBudget.value;
    return Number((totalBudget.value / peopleCount.value).toFixed(2));
  });

  async function fetchDistricts() {
    try {
      const data = await $fetch<FoodDistrict[]>("/api/food/districts");
      districts.value = data;
    } catch {
      // Fallback districts if API is slow
      districts.value = [
        {
          id: "daun-penh",
          nameKm: "ដូនពេញ (Daun Penh)",
          nameEn: "Daun Penh",
          lat: 11.5721,
          lng: 104.9255,
          radiusMeters: 2500,
        },
        {
          id: "bkk",
          nameKm: "បឹងកេងកង (Boeng Keng Kang)",
          nameEn: "Boeng Keng Kang",
          lat: 11.5516,
          lng: 104.9247,
          radiusMeters: 2000,
        },
        {
          id: "chamkarmon",
          nameKm: "ចំការមន (Chamkarmon)",
          nameEn: "Chamkarmon",
          lat: 11.5414,
          lng: 104.9282,
          radiusMeters: 2500,
        },
        {
          id: "tuol-kork",
          nameKm: "ទួលគោក (Tuol Kork)",
          nameEn: "Tuol Kork",
          lat: 11.5714,
          lng: 104.8973,
          radiusMeters: 3000,
        },
        {
          id: "7-makara",
          nameKm: "៧មករា (Prampir Makara)",
          nameEn: "Prampir Makara",
          lat: 11.5627,
          lng: 104.9142,
          radiusMeters: 2000,
        },
      ];
    }
  }

  function requestGeolocation(options: { refresh?: boolean } = {}) {
    if (typeof window === "undefined" || !navigator.geolocation) {
      locationError.value = true;
      errorMessage.value =
        "ឧបករណ៍របស់អ្នកមិនគាំទ្រ Geolocation ទេ។ សូមជ្រើសរើសខណ្ឌខាងក្រោម។";
      return;
    }

    isLocating.value = true;
    locationError.value = false;
    errorMessage.value = null;
    const ownerRevision = discoveryAccountRevision;
    const requestRevision = ++locationRevision;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (ownerRevision !== discoveryAccountRevision || requestRevision !== locationRevision) return;
        // GPS is the new anchor; an earlier city/address must not override the user's location.
        const { city, area, ...remaining } = filters.value;
        filters.value = remaining;
        locationQuery.value = "";
        userCoords.value = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        locationLabel.value = "ទីតាំងបច្ចុប្បន្នរបស់អ្នក (GPS)";
        selectedDistrictId.value = "";
        isLocating.value = false;
        locationError.value = false;
        // GPS can refresh restaurant search, but changing location must never create a recipe.
        if (options.refresh !== false && mode.value === "dine-out") getRecommendations();
      },
      (err) => {
        if (ownerRevision !== discoveryAccountRevision || requestRevision !== locationRevision) return;
        isLocating.value = false;
        locationError.value = true;
        userCoords.value = null;
        if (!selectedDistrictId.value) locationLabel.value = "សូមជ្រើសរើសតំបន់ជំនួស GPS";
        if (err.code === err.PERMISSION_DENIED) {
          errorMessage.value =
            "កម្មវិធីអ៊ីនធឺណិតមិនអនុញ្ញាត GPS ទេ។ អ្នកនៅតែអាចស្វែងរកដោយជ្រើសតំបន់ ឬចុច «ប្រើតំបន់ដែលបានជ្រើស»។ បើចង់ប្រើ GPS សូមបើក Location ក្នុងសិទ្ធិរបស់គេហទំព័រ។";
        } else {
          errorMessage.value =
            "មិនអាចកំណត់ទីតាំង GPS បានទេ។ សូមជ្រើសរើសខណ្ឌខាងក្រោម។";
        }
      },
      { timeout: 8000, enableHighAccuracy: false },
    );
  }

  function onDistrictChange(districtId: string) {
    // A later manual choice wins over any GPS lookup still in flight.
    locationRevision++;
    isLocating.value = false;
    selectedDistrictId.value = districtId;
    userCoords.value = null;
    locationError.value = false;
    errorMessage.value = null;
    // A manual district is the new anchor. Keep radius/dietary preferences, not stale GPS/city/route anchors.
    const { city, area, locationDiscovery, ...remaining } = filters.value;
    if (typeof locationDiscovery === "string" && /^within-(1|3|5|10)-km$/.test(locationDiscovery)) remaining.locationDiscovery = locationDiscovery;
    filters.value = remaining;
    locationQuery.value = "";
    routeOrigin.value = "";
    routeDestination.value = "";
    const match = districts.value.find((d) => d.id === districtId);
    if (match) {
      locationLabel.value = match.nameKm;
    }
  }

  function currentCriteria(): Record<string, unknown> {
    return {
      mode: mode.value,
      mealTime: mealTime.value,
      occasion: occasion.value,
      peopleCount: peopleCount.value,
      totalBudget: totalBudget.value,
      cuisine: searchKeyword.value.trim() || undefined,
      ...(Object.keys(filters.value).length
        ? { filters: JSON.parse(JSON.stringify(filters.value)) }
        : {}),
      ...(locationQuery.value.trim()
        ? { locationQuery: locationQuery.value.trim() }
        : {}),
      ...(routeOrigin.value.trim()
        ? { routeOrigin: routeOrigin.value.trim() }
        : {}),
      ...(routeDestination.value.trim()
        ? { routeDestination: routeDestination.value.trim() }
        : {}),
      ...(allergies.value.trim() ? { allergies: allergies.value.trim() } : {}),
      ...(minimumRating.value ? { minimumRating: minimumRating.value } : {}),
      ...(userCoords.value
        ? userCoords.value
        : selectedDistrictId.value
          ? { district: selectedDistrictId.value }
          : {}),
    };
  }

  async function sharePlace(place: RankedPlace) {
    const text = `🍲 រកឃើញកន្លែងញ៉ាំបាយឆ្ងាញ់តាម ChlatWork Food:\n«${place.name}»\nទីតាំង: ${place.street || place.city}\nទិសដៅ: https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: place.name,
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      copyNotification.value = "បានចម្លងព័ត៌មានរួចរាល់!";
      setTimeout(() => {
        copyNotification.value = null;
      }, 3000);
    }
  }

  function getDirectionsUrl(place: RankedPlace): string {
    return foodDirectionsUrl(place);
  }

  function selectPlaceForMap(place: RankedPlace) {
    selectedPlace.value = place;
  }

  function openRecipeDetail(recipe: KhmerRecipe) {
    sharedRecipeRequest++;
    isSharedRecipeLoading.value = false;
    recipeDetailError.value = null;
    selectedRecipe.value = recipe;
  }

  async function openSharedRecipe(id: string) {
    const request = ++sharedRecipeRequest;
    const accountRevision = discoveryAccountRevision;
    isSharedRecipeLoading.value = true;
    recipeDetailError.value = null;
    try {
      const recipe = await $fetch<KhmerRecipe>(
        `/api/food/shared-recipes/${encodeURIComponent(id)}`,
        { retry: 0 },
      );
      // A late response must not replace a newer selection or reopen a closed dialog.
      if (request === sharedRecipeRequest && accountRevision === discoveryAccountRevision)
        selectedRecipe.value = recipe;
    } catch {
      if (request === sharedRecipeRequest && accountRevision === discoveryAccountRevision)
        recipeDetailError.value = "មិនអាចផ្ទុករូបមន្តបានទេ។ សូមចុចមើលម្ដងទៀត។";
    } finally {
      if (request === sharedRecipeRequest) isSharedRecipeLoading.value = false;
    }
  }

  function openPickedRecipe() {
    const recipe = randomSuggestion.value?.recipe;
    if (recipe) {
      randomSuggestion.value = null;
      openRecipeDetail(recipe);
    }
  }

  function closeRecipeDetail() {
    sharedRecipeRequest++;
    isSharedRecipeLoading.value = false;
    recipeDetailError.value = null;
    selectedRecipe.value = null;
  }

  function closeRandomModal() {
    randomSuggestion.value = null;
  }

  return {
    ...results,
    activeQuickPreset,
    selectQuickPreset,
    selectCatalogFood,
    setDiscoveryAccount,
    filters,
    locationQuery,
    routeOrigin,
    routeDestination,
    allergies,
    minimumRating,
    mode,
    mealTime,
    occasion,
    peopleCount,
    totalBudget,
    selectedDistrictId,
    searchKeyword,
    userCoords,
    isLocating,
    locationError,
    locationLabel,
    districts,
    selectedRecipe,
    copyNotification,
    budgetPerPerson,
    fetchDistricts,
    requestGeolocation,
    onDistrictChange,
    sharePlace,
    getDirectionsUrl,
    selectPlaceForMap,
    openRecipeDetail,
    openSharedRecipe,
    isSharedRecipeLoading,
    recipeDetailError,
    openPickedRecipe,
    closeRecipeDetail,
    closeRandomModal,
  };
}
