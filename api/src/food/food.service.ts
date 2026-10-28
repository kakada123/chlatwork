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
    const radius = query.radius || 2500;

    const result = await this.placesProvider.searchNearby(
      coords.lat,
      coords.lng,
      radius,
      query.cuisine,
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
    const mealTime = dto.mealTime || "lunch";
    const occasion = dto.occasion || "friends";
    const peopleCount = Math.max(1, dto.peopleCount || 1);
    const totalBudget = dto.totalBudget;
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
      const recipes = this.rankRecipes(
        mealTime,
        occasion,
        budgetPerPerson,
        dto.cuisine,
      );
      return {
        mode: "cook-at-home",
        querySummary,
        places: [],
        recipes: recipes.slice(0, dto.limit || 5),
        totalFound: recipes.length,
        dataSource: "curated",
        attribution: RECIPE_ATTRIBUTION,
      };
    }

    // Dine out recommendation
    const radius = 3000;
    const searchResult = await this.placesProvider.searchNearby(
      coords.lat,
      coords.lng,
      radius,
      dto.cuisine,
    );

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

    const rankedPlaces = this.recommendationEngine.rankPlaces(
      searchResult.places,
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
    const recommendation = await this.recommend({ ...dto, limit: 20 });
    const criteria: FoodRecommendationDto = {
      ...recommendation.querySummary,
      mode: recommendation.mode,
      cuisine: dto.cuisine,
    };
    if (recommendation.mode === "cook-at-home") {
      const recipes = (recommendation.recipes || []).filter(
        (recipe) =>
          !dto.mealTime ||
          dto.mealTime === "any" ||
          recipe.mealTimes.some((time) => time === dto.mealTime),
      );
      if (!recipes.length)
        throw new NotFoundException("No recipes match these filters.");
      const selection = await this.aiPicker.choose(
        recipes.map((recipe) => ({
          id: recipe.id,
          nameKm: recipe.nameKm,
          nameEn: recipe.nameEn,
          mealTimes: recipe.mealTimes,
          occasions: recipe.occasions,
          estimatedCostUsd: recipe.estimatedCostUsd,
          servings: recipe.servings,
        })),
        criteria,
      );
      const recipe = recipes.find((candidate) => candidate.id === selection.id);
      if (!recipe)
        throw new ServiceUnavailableException(
          "AI selected an unavailable recipe.",
        );
      return {
        type: "dish",
        selectionSource: "gemini",
        messageKm: selection.messageKm,
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

  private rankRecipes(
    mealTime: MealTime,
    occasion: string,
    budgetPerPerson?: number,
    keyword?: string,
  ): KhmerRecipe[] {
    const query = keyword?.trim().toLowerCase();
    const recipes = KHMER_RECIPES.filter(
      (recipe) =>
        !query ||
        query === "all" ||
        `${recipe.nameKm} ${recipe.nameEn} ${recipe.category} ${recipe.ingredients.map((ingredient) => `${ingredient.nameKm} ${ingredient.nameEn}`).join(" ")}`
          .toLowerCase()
          .includes(query),
    );
    return [...recipes].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (mealTime !== "any") {
        if (a.mealTimes.includes(mealTime as any)) scoreA += 20;
        if (b.mealTimes.includes(mealTime as any)) scoreB += 20;
      }

      if (occasion !== "any") {
        if (a.occasions.includes(occasion as any)) scoreA += 15;
        if (b.occasions.includes(occasion as any)) scoreB += 15;
      }

      if (budgetPerPerson && budgetPerPerson > 0) {
        const costA = a.estimatedCostUsd / a.servings;
        const costB = b.estimatedCostUsd / b.servings;
        if (costA <= budgetPerPerson) scoreA += 15;
        if (costB <= budgetPerPerson) scoreB += 15;
      }

      return scoreB - scoreA;
    });
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
