import { ref, computed } from "vue";

export type DiscoveryMode = "dine-out" | "cook-at-home";
export type MealTime = "breakfast" | "lunch" | "snack" | "dinner" | "any";
export type Occasion = "solo" | "friends" | "first-date" | "couple" | "family" | "elderly" | "any";

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
  osmId?: string;
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
  source: "osm" | "curated";
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
  occasions: Array<"solo" | "friends" | "first-date" | "couple" | "family" | "elderly">;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  estimatedCostUsd: number;
  category: "soup" | "stir-fry" | "curry" | "rice" | "noodle" | "salad" | "dessert";
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips?: string;
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
  messageKm: string;
}

export function useFoodDiscovery() {
  const mode = ref<DiscoveryMode>("dine-out");
  const mealTime = ref<MealTime>("lunch");
  const occasion = ref<Occasion>("friends");
  const peopleCount = ref<number>(3);
  const totalBudget = ref<number>(10);
  const selectedDistrictId = ref<string>("bkk");
  const searchKeyword = ref<string>("");

  const userCoords = ref<{ lat: number; lng: number } | null>(null);
  const isLocating = ref<boolean>(false);
  const locationLabel = ref<string>("បឹងកេងកង (Boeng Keng Kang)");

  const districts = ref<FoodDistrict[]>([]);
  const places = ref<RankedPlace[]>([]);
  const recipes = ref<KhmerRecipe[]>([]);
  const selectedPlace = ref<RankedPlace | null>(null);
  const selectedRecipe = ref<KhmerRecipe | null>(null);
  const randomSuggestion = ref<RandomFoodSuggestion | null>(null);

  const isLoading = ref<boolean>(false);
  const isRandomLoading = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const dataSource = ref<"osm" | "curated" | "hybrid">("osm");
  const hasSearched = ref<boolean>(false);
  const copyNotification = ref<string | null>(null);

  const budgetPerPerson = computed(() => {
    if (!totalBudget.value || peopleCount.value <= 0) return 0;
    return Number((totalBudget.value / peopleCount.value).toFixed(2));
  });

  async function fetchDistricts() {
    try {
      const data = await $fetch<FoodDistrict[]>("/api/food/districts");
      districts.value = data;
    } catch {
      // Fallback districts if API is slow
      districts.value = [
        { id: "daun-penh", nameKm: "ដូនពេញ (Daun Penh)", nameEn: "Daun Penh", lat: 11.5721, lng: 104.9255, radiusMeters: 2500 },
        { id: "bkk", nameKm: "បឹងកេងកង (Boeng Keng Kang)", nameEn: "Boeng Keng Kang", lat: 11.5516, lng: 104.9247, radiusMeters: 2000 },
        { id: "chamkarmon", nameKm: "ចំការមន (Chamkarmon)", nameEn: "Chamkarmon", lat: 11.5414, lng: 104.9282, radiusMeters: 2500 },
        { id: "tuol-kork", nameKm: "ទួលគោក (Tuol Kork)", nameEn: "Tuol Kork", lat: 11.5714, lng: 104.8973, radiusMeters: 3000 },
        { id: "7-makara", nameKm: "៧មករា (Prampir Makara)", nameEn: "Prampir Makara", lat: 11.5627, lng: 104.9142, radiusMeters: 2000 },
      ];
    }
  }

  function requestGeolocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      errorMessage.value = "ឧបករណ៍របស់អ្នកមិនគាំទ្រ Geolocation ទេ។ សូមជ្រើសរើសខណ្ឌខាងក្រោម។";
      return;
    }

    isLocating.value = true;
    errorMessage.value = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userCoords.value = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        locationLabel.value = "ទីតាំងបច្ចុប្បន្នរបស់អ្នក (GPS)";
        selectedDistrictId.value = "";
        isLocating.value = false;
        // Auto-refresh recommendations with user's actual GPS location
        getRecommendations();
      },
      (err) => {
        isLocating.value = false;
        if (err.code === err.PERMISSION_DENIED) {
          errorMessage.value = "ការអនុញ្ញាតទីតាំងត្រូវបានបដិសេធ។ ប្រព័ន្ធបានប្ដូរមកប្រើប្រាស់ខណ្ឌដែលបានជ្រើសរើស។";
        } else {
          errorMessage.value = "មិនអាចកំណត់ទីតាំង GPS បានទេ។ សូមជ្រើសរើសខណ្ឌខាងក្រោម។";
        }
      },
      { timeout: 8000, enableHighAccuracy: false },
    );
  }

  function onDistrictChange(districtId: string) {
    selectedDistrictId.value = districtId;
    userCoords.value = null;
    const match = districts.value.find((d) => d.id === districtId);
    if (match) {
      locationLabel.value = match.nameKm;
    }
  }

  async function getRecommendations() {
    isLoading.value = true;
    errorMessage.value = null;
    hasSearched.value = true;

    try {
      const payload: Record<string, any> = {
        mode: mode.value,
        mealTime: mealTime.value,
        occasion: occasion.value,
        peopleCount: peopleCount.value,
        totalBudget: totalBudget.value,
        cuisine: searchKeyword.value.trim() || undefined,
        limit: 5,
      };

      if (userCoords.value) {
        payload.lat = userCoords.value.lat;
        payload.lng = userCoords.value.lng;
      } else if (selectedDistrictId.value) {
        payload.district = selectedDistrictId.value;
      }

      const res = await $fetch<{
        mode: DiscoveryMode;
        places: RankedPlace[];
        recipes?: KhmerRecipe[];
        dataSource: "osm" | "curated" | "hybrid";
      }>("/api/food/recommend", {
        method: "POST",
        body: payload,
      });

      places.value = res.places || [];
      recipes.value = res.recipes || [];
      dataSource.value = res.dataSource;

      if (places.value.length > 0) {
        selectedPlace.value = places.value[0];
      } else {
        selectedPlace.value = null;
      }
    } catch (err: any) {
      errorMessage.value = "មិនអាចទាញយកទិន្នន័យបាននៅពេលនេះទេ។ សូមព្យាយាមម្តងទៀត។";
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchRandomPick() {
    isRandomLoading.value = true;
    try {
      const res = await $fetch<RandomFoodSuggestion>("/api/food/random", {
        query: { mealTime: mealTime.value },
      });
      randomSuggestion.value = res;
    } catch {
      randomSuggestion.value = {
        type: "dish",
        dish: {
          nameKm: "ឡុកឡាក់សាច់គោ",
          nameEn: "Beef Lok Lak",
          descriptionKm: "សាច់គោផុយឆាម្រេចកំពត ជាមួយបាយស និងពងមាន់ចៀន",
          mealTime: "lunch",
          suggestedCuisine: "Khmer",
          recipeId: "lok-lak-sach-ko",
        },
        messageKm: "ថ្ងៃនេះសាកញ៉ាំ «ឡុកឡាក់សាច់គោ» ម្តងមើល៍ ធានាថាឆ្ងាញ់ពេញចិត្ត!",
      };
    } finally {
      isRandomLoading.value = false;
    }
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

  function getDirectionsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  function selectPlaceForMap(place: RankedPlace) {
    selectedPlace.value = place;
  }

  function openRecipeDetail(recipe: KhmerRecipe) {
    selectedRecipe.value = recipe;
  }

  function closeRecipeDetail() {
    selectedRecipe.value = null;
  }

  function closeRandomModal() {
    randomSuggestion.value = null;
  }

  return {
    mode,
    mealTime,
    occasion,
    peopleCount,
    totalBudget,
    selectedDistrictId,
    searchKeyword,
    userCoords,
    isLocating,
    locationLabel,
    districts,
    places,
    recipes,
    selectedPlace,
    selectedRecipe,
    randomSuggestion,
    isLoading,
    isRandomLoading,
    errorMessage,
    dataSource,
    hasSearched,
    copyNotification,
    budgetPerPerson,
    fetchDistricts,
    requestGeolocation,
    onDistrictChange,
    getRecommendations,
    fetchRandomPick,
    sharePlace,
    getDirectionsUrl,
    selectPlaceForMap,
    openRecipeDetail,
    closeRecipeDetail,
    closeRandomModal,
  };
}
