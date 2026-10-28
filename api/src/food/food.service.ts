import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { GooglePlacesProviderAdapter } from "./google-places-provider.adapter";
import { FoodAiPickerService } from "./food-ai-picker.service";
import {
  FoodRecommendationEngine,
  RecommendationCriteria,
} from "./food-recommendation.engine";
import {
  RecommendationResponse,
  RandomFoodSuggestion,
  KhmerRecipe,
  FoodDistrict,
  Place,
  MealTime,
  FoodAttribution,
} from "./food.types";
import { FoodSearchQueryDto } from "./dto/food-search.dto";
import { FoodRecommendationDto } from "./dto/food-recommendation.dto";
import {
  PHNOM_PENH_CENTER,
  PHNOM_PENH_DISTRICTS,
  findDistrictById,
} from "./data/districts";
import { KHMER_RECIPES } from "./data/khmer-recipes";
import { FOOD_FILTERS } from "./food-filters";
import { discoveryRadius, resolvedFoodCriteria } from "./food-search-preferences";

const GOOGLE_ATTRIBUTION: FoodAttribution = {
  provider: "Google Maps",
  url: "https://maps.google.com",
};
const RECIPE_ATTRIBUTION: FoodAttribution = {
  provider: "ChlatWork Food",
  url: "https://chlatwork.com/food",
};

@Injectable()
export class FoodService {
  constructor(
    private readonly placesProvider: GooglePlacesProviderAdapter,
    private readonly recommendationEngine: FoodRecommendationEngine,
    private readonly aiPicker: FoodAiPickerService,
  ) {}

  getFilters() {
    const routes = this.placesProvider.routeSearchAvailable();
    return FOOD_FILTERS.map((field) => ({ ...field, groups: field.groups.map((group) => ({ ...group, options: group.options.map((option) => ({ ...option, ...(option.value === "along-my-route" ? { disabled: !routes } : {}) })) })) }));
  }

  /**
   * Use Google's live restaurant records; unavailable providers never become fabricated results.
   */
  async searchPlaces(query: FoodSearchQueryDto): Promise<{
    places: Place[];
    total: number;
    dataSource: "google";
    attribution: FoodAttribution;
  }> {
    const coords = this.resolveCoordinates(
      query.lat,
      query.lng,
      query.district,
    );
    const radius = discoveryRadius(query, query.radius || 2500);

    const result = await this.placesProvider.searchNearby(
      coords.lat,
      coords.lng,
      radius,
      query.cuisine,
      query,
    );

    return {
      places: result.places,
      total: result.places.length,
      dataSource: result.dataSource,
      attribution: GOOGLE_ATTRIBUTION,
    };
  }

  /**
   * Preserve normal ranking while keeping restaurant price claims unverified.
   */
  async recommend(dto: FoodRecommendationDto): Promise<RecommendationResponse> {
    const mode = dto.mode || "dine-out";
    const { mealTime, occasion, peopleCount, totalBudget } = resolvedFoodCriteria(dto);
    const budgetPerPerson = totalBudget ? totalBudget / peopleCount : undefined;
    const coords = this.resolveCoordinates(dto.lat, dto.lng, dto.district);

    const querySummary = {
      mealTime,
      occasion,
      peopleCount,
      totalBudget,
      budgetPerPerson,
      district: dto.district,
      lat: coords.lat,
      lng: coords.lng,
    };

    if (mode === "cook-at-home") {
      const recipes = await this.aiPicker.generateRecipes({ ...dto, mode, mealTime, occasion, peopleCount, totalBudget });
      return {
        mode: "cook-at-home",
        querySummary,
        places: [],
        recipes,
        totalFound: recipes.length,
        dataSource: "gemini",
        attribution: RECIPE_ATTRIBUTION,
      };
    }

    // Dine out recommendation
    const radius = discoveryRadius(dto, 3000);
    const searchResult = await this.placesProvider.searchNearby(
      coords.lat,
      coords.lng,
      radius,
      dto.cuisine,
      dto,
    );
    querySummary.lat = searchResult.searchCenter?.lat ?? coords.lat;
    querySummary.lng = searchResult.searchCenter?.lng ?? coords.lng;

    const criteria: RecommendationCriteria = {
      mealTime,
      occasion,
      peopleCount,
      totalBudget,
      // Google text search already matches free-text dishes; a keyword is not necessarily a cuisine tag.
      cuisine: undefined,
      userLat: coords.lat,
      userLng: coords.lng,
    };

    const excluded = new Set(dto.excludePlaceIds || []);
    const rankedPlaces = this.recommendationEngine.rankPlaces(
      searchResult.places.filter((place) => !excluded.has(place.id)),
      criteria,
      dto.limit || 5,
    );

    return {
      mode: "dine-out",
      querySummary,
      places: rankedPlaces,
      totalFound: rankedPlaces.length,
      dataSource: searchResult.dataSource,
      attribution: GOOGLE_ATTRIBUTION,
      nextPageToken: searchResult.nextPageToken,
      searchCenter: searchResult.searchCenter,
      routePolyline: searchResult.routePolyline,
    };
  }

  /**
   * Get authentic Khmer recipe list with optional filters.
   */
  getRecipes(category?: string, mealTime?: string): KhmerRecipe[] {
    return KHMER_RECIPES.filter((recipe) => {
      if (category && recipe.category !== category) return false;
      if (mealTime && !recipe.mealTimes.includes(mealTime as any)) return false;
      return true;
    });
  }

  /**
   * Get single recipe details by ID.
   */
  getRecipeById(id: string): KhmerRecipe {
    const recipe = KHMER_RECIPES.find((r) => r.id === id);
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID '${id}' not found`);
    }
    return recipe;
  }

  /**
   * Keep legacy GET clients working without an implicit paid restaurant lookup.
   */
  getRandomFood(dto: FoodRecommendationDto): Promise<RandomFoodSuggestion> {
    return this.pick({ ...dto, mode: dto.mode || "cook-at-home" });
  }

  async pick(dto: FoodRecommendationDto): Promise<RandomFoodSuggestion> {
    // Avoid a paid Places lookup when the requested AI selection cannot run.
    this.aiPicker.assertAvailable();
    // Always build the candidate set on the server; callers cannot inject their own restaurant facts.
    let recommendation = await this.recommend({ ...dto, limit: dto.mode === "cook-at-home" ? 1 : 20 });
    const seenTokens = new Set<string>();
    // A pick may advance through real Google pages to find unseen choices; this never retries a failed request.
    for (let page = 1; recommendation.mode === "dine-out" && !recommendation.places.length && recommendation.nextPageToken && page < 3; page++) {
      const token = recommendation.nextPageToken;
      if (seenTokens.has(token)) break;
      seenTokens.add(token);
      recommendation = await this.recommend({ ...dto, limit: 20, pageToken: token, searchLat: recommendation.searchCenter?.lat, searchLng: recommendation.searchCenter?.lng, routePolyline: recommendation.routePolyline });
    }
    const criteria: FoodRecommendationDto = {
      ...recommendation.querySummary,
      mode: recommendation.mode,
      cuisine: dto.cuisine,
    };
    if (recommendation.mode === "cook-at-home") {
      const recipe = recommendation.recipes?.[0];
      if (!recipe?.recommendationKm || recipe.source !== "gemini") throw new ServiceUnavailableException("No generated recipe is available.");
      return {
        type: "dish",
        selectionSource: "gemini",
        messageKm: recipe.recommendationKm,
        recipe,
        dish: {
          nameKm: recipe.nameKm,
          nameEn: recipe.nameEn,
          descriptionKm: recipe.descriptionKm,
          mealTime:
            dto.mealTime && dto.mealTime !== "any"
              ? dto.mealTime
              : recipe.mealTimes[0],
          suggestedCuisine: "Khmer",
          recipeId: recipe.id,
        },
      };
    }
    if (!recommendation.places.length)
      throw new NotFoundException("No restaurants match these filters.");
    const selection = await this.aiPicker.choose(
      recommendation.places.map((place) => ({
        id: place.id,
        name: place.name,
        cuisine: place.cuisine,
        amenity: place.amenity,
        distanceMeters: place.distanceMeters,
        isPriceVerified: place.isPriceVerified,
        budgetFit: place.budgetFit,
        matchedFactors: place.matchedFactors,
      })),
      criteria,
    );
    const place = recommendation.places.find(
      (candidate) => candidate.id === selection.id,
    );
    if (!place)
      throw new ServiceUnavailableException(
        "AI selected an unavailable restaurant.",
      );
    return {
      type: "place",
      place,
      messageKm: selection.messageKm,
      selectionSource: "gemini",
    };
  }

  /**
   * Get list of Phnom Penh districts.
   */
  getDistricts(): FoodDistrict[] {
    return PHNOM_PENH_DISTRICTS;
  }

  private resolveCoordinates(
    lat?: number,
    lng?: number,
    districtId?: string,
  ): { lat: number; lng: number } {
    if ((lat === undefined) !== (lng === undefined))
      throw new BadRequestException(
        "Latitude and longitude must be supplied together.",
      );
    if (
      lat !== undefined &&
      lng !== undefined &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    ) {
      return { lat, lng };
    }
    if (lat !== undefined || lng !== undefined)
      throw new BadRequestException("Invalid coordinates.");

    if (districtId) {
      const district = findDistrictById(districtId);
      if (district) {
        return { lat: district.lat, lng: district.lng };
      }
      throw new BadRequestException("Unknown Food district.");
    }

    return PHNOM_PENH_CENTER;
  }
}
