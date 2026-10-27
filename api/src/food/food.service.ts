import { Injectable, NotFoundException } from '@nestjs/common';
import { OsmProviderAdapter } from './osm-provider.adapter';
import { FoodRecommendationEngine, RecommendationCriteria } from './food-recommendation.engine';
import {
  RecommendationResponse,
  RandomFoodSuggestion,
  KhmerRecipe,
  FoodDistrict,
  Place,
  MealTime,
} from './food.types';
import { FoodSearchQueryDto } from './dto/food-search.dto';
import { FoodRecommendationDto } from './dto/food-recommendation.dto';
import {
  PHNOM_PENH_CENTER,
  PHNOM_PENH_DISTRICTS,
  findDistrictById,
} from './data/districts';
import { KHMER_RECIPES } from './data/khmer-recipes';

const OSM_ATTRIBUTION = {
  osm: 'Data © OpenStreetMap contributors, ODbL 1.0',
  odbl: 'Open Database License (ODbL)',
  licenseUrl: 'https://www.openstreetmap.org/copyright',
};

@Injectable()
export class FoodService {
  constructor(
    private readonly osmProvider: OsmProviderAdapter,
    private readonly recommendationEngine: FoodRecommendationEngine,
  ) {}

  /**
   * Search places with OSM and curated fallback.
   */
  async searchPlaces(query: FoodSearchQueryDto): Promise<{
    places: Place[];
    total: number;
    dataSource: 'osm' | 'curated' | 'hybrid';
    attribution: typeof OSM_ATTRIBUTION;
  }> {
    const coords = this.resolveCoordinates(query.lat, query.lng, query.district);
    const radius = query.radius || 2500;

    const result = await this.osmProvider.searchNearby(
      coords.lat,
      coords.lng,
      radius,
      query.cuisine,
    );

    return {
      places: result.places,
      total: result.places.length,
      dataSource: result.dataSource,
      attribution: OSM_ATTRIBUTION,
    };
  }

  /**
   * Smart recommendation engine (Deterministic, free-first, honest pricing).
   */
  async recommend(dto: FoodRecommendationDto): Promise<RecommendationResponse> {
    const mode = dto.mode || 'dine-out';
    const mealTime = dto.mealTime || 'lunch';
    const occasion = dto.occasion || 'friends';
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

    if (mode === 'cook-at-home') {
      const recipes = this.rankRecipes(mealTime, occasion, budgetPerPerson);
      return {
        mode: 'cook-at-home',
        querySummary,
        places: [],
        recipes: recipes.slice(0, dto.limit || 5),
        totalFound: recipes.length,
        dataSource: 'curated',
        attribution: OSM_ATTRIBUTION,
      };
    }

    // Dine out recommendation
    const radius = 3000;
    const searchResult = await this.osmProvider.searchNearby(
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
      cuisine: dto.cuisine,
      userLat: coords.lat,
      userLng: coords.lng,
    };

    const rankedPlaces = this.recommendationEngine.rankPlaces(
      searchResult.places,
      criteria,
      dto.limit || 5,
    );

    return {
      mode: 'dine-out',
      querySummary,
      places: rankedPlaces,
      totalFound: rankedPlaces.length,
      dataSource: searchResult.dataSource,
      attribution: OSM_ATTRIBUTION,
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
   * "រើសឱ្យខ្ញុំមួយ!" Random food picker with fun message.
   */
  getRandomFood(preferredMealTime?: MealTime): RandomFoodSuggestion {
    const isRecipe = Math.random() > 0.4;

    if (isRecipe && KHMER_RECIPES.length > 0) {
      const filtered = preferredMealTime && preferredMealTime !== 'any'
        ? KHMER_RECIPES.filter((r) => r.mealTimes.includes(preferredMealTime as any))
        : KHMER_RECIPES;

      const candidates = filtered.length > 0 ? filtered : KHMER_RECIPES;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      const messages = [
        `ថ្ងៃនេះសាកធ្វើម្ហូប «${chosen.nameKm}» ញ៉ាំម្តងមើល៍ ឈ្ងុយឆ្ងាញ់ហើយសន្សំសំចៃ!`,
        `តោះចុងភៅដៃឯក! ថ្ងៃនេះម្ហូប «${chosen.nameKm}» ពិតជាត្រូវម៉ាច់!`,
        `«${chosen.nameKm}» ក្តៅៗជាមួយបាយស មិនដឹងឆ្ងាញ់យ៉ាងណាទេ!`,
      ];

      return {
        type: 'dish',
        dish: {
          nameKm: chosen.nameKm,
          nameEn: chosen.nameEn,
          descriptionKm: chosen.descriptionKm,
          mealTime: chosen.mealTimes[0] || 'lunch',
          suggestedCuisine: 'Khmer',
          recipeId: chosen.id,
        },
        messageKm: messages[Math.floor(Math.random() * messages.length)],
      };
    }

    // Pick from curated places
    const curated = this.osmProvider.getCuratedPlacesNearby(
      PHNOM_PENH_CENTER.lat,
      PHNOM_PENH_CENTER.lng,
      10000,
    );
    const chosenPlace = curated[Math.floor(Math.random() * curated.length)];

    return {
      type: 'place',
      place: chosenPlace,
      messageKm: `ថ្ងៃនេះសាកទៅញ៉ាំនៅ «${chosenPlace.name}» ម្តងមើល៍ មិនបាច់ពិបាកគិតច្រើនទេ!`,
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
  ): KhmerRecipe[] {
    return [...KHMER_RECIPES].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (mealTime !== 'any') {
        if (a.mealTimes.includes(mealTime as any)) scoreA += 20;
        if (b.mealTimes.includes(mealTime as any)) scoreB += 20;
      }

      if (occasion !== 'any') {
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
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }

    if (districtId) {
      const district = findDistrictById(districtId);
      if (district) {
        return { lat: district.lat, lng: district.lng };
      }
    }

    return PHNOM_PENH_CENTER;
  }
}
