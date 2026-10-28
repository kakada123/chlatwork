export type MealTime = "breakfast" | "lunch" | "snack" | "dinner" | "any";
export type Occasion =
  "solo" | "friends" | "first-date" | "couple" | "family" | "elderly" | "any";
export type DiscoveryMode = "dine-out" | "cook-at-home";
export type AmenityType =
  "restaurant" | "cafe" | "fast_food" | "food_court" | "bar";

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

export interface Place {
  id: string;
  googlePlaceId?: string;
  googleMapsUri?: string;
  attributions?: Array<{ provider: string; providerUri?: string }>;
  name: string;
  nameKm?: string;
  nameEn?: string;
  amenity: AmenityType;
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
  priceTier?: "$" | "$$" | "$$$" | "$$$$";
  estimatedPricePerPersonUsd?: number;
  isPriceVerified: boolean;
  recommendedDishes?: string[];
  features?: PlaceFeatures;
  source: "google" | "curated";
}

export interface RankedPlace extends Place {
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
}

export interface FoodDistrict {
  id: string;
  nameKm: string;
  nameEn: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface RecommendationResponse {
  mode: DiscoveryMode;
  querySummary: {
    mealTime: MealTime;
    occasion: Occasion;
    peopleCount: number;
    totalBudget?: number;
    budgetPerPerson?: number;
    district?: string;
    lat: number;
    lng: number;
  };
  places: RankedPlace[];
  recipes?: KhmerRecipe[];
  totalFound: number;
  dataSource: "google" | "curated";
  attribution: FoodAttribution;
}

export interface FoodAttribution {
  provider: "Google Maps" | "ChlatWork Food";
  url: string;
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
  place?: Place;
  messageKm: string;
}
