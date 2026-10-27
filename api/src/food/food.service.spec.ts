import { NotFoundException } from '@nestjs/common';
import { FoodService } from './food.service';
import { OsmProviderAdapter } from './osm-provider.adapter';
import { FoodRecommendationEngine } from './food-recommendation.engine';

describe('FoodService', () => {
  let service: FoodService;
  let osmAdapter: OsmProviderAdapter;
  let engine: FoodRecommendationEngine;

  beforeEach(() => {
    osmAdapter = new OsmProviderAdapter();
    engine = new FoodRecommendationEngine();
    service = new FoodService(osmAdapter, engine);
  });

  describe('searchPlaces', () => {
    it('returns places with attribution and fallback to curated data when offline or in test', async () => {
      const result = await service.searchPlaces({
        lat: 11.5564,
        lng: 104.9282,
        radius: 2000,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.places)).toBe(true);
      expect(result.places.length).toBeGreaterThan(0);
      expect(result.attribution.osm).toContain('OpenStreetMap');
    });
  });

  describe('recommend', () => {
    it('handles dine-out recommendation mode with budget explanation', async () => {
      const response = await service.recommend({
        mode: 'dine-out',
        mealTime: 'lunch',
        occasion: 'friends',
        peopleCount: 3,
        totalBudget: 10,
        district: 'bkk',
      });

      expect(response.mode).toBe('dine-out');
      expect(response.querySummary.peopleCount).toBe(3);
      expect(response.querySummary.totalBudget).toBe(10);
      expect(response.querySummary.budgetPerPerson).toBeCloseTo(3.33, 1);
      expect(response.places.length).toBeGreaterThan(0);
      expect(response.places[0].budgetFit).toBeDefined();
    });

    it('handles cook-at-home mode returning ranked Khmer recipes', async () => {
      const response = await service.recommend({
        mode: 'cook-at-home',
        mealTime: 'lunch',
        occasion: 'family',
        peopleCount: 4,
        totalBudget: 15,
      });

      expect(response.mode).toBe('cook-at-home');
      expect(response.recipes).toBeDefined();
      expect(response.recipes!.length).toBeGreaterThan(0);
      expect(response.recipes![0].steps.length).toBeGreaterThan(0);
      expect(response.recipes![0].ingredients.length).toBeGreaterThan(0);
    });
  });

  describe('recipes', () => {
    it('retrieves recipe list and allows filtering by category', () => {
      const allRecipes = service.getRecipes();
      expect(allRecipes.length).toBeGreaterThanOrEqual(10);

      const soups = service.getRecipes('soup');
      expect(soups.length).toBeGreaterThan(0);
      expect(soups.every((r) => r.category === 'soup')).toBe(true);
    });

    it('retrieves single recipe by id or throws NotFoundException', () => {
      const recipe = service.getRecipeById('samlor-korko');
      expect(recipe).toBeDefined();
      expect(recipe.nameKm).toContain('កកូរ');

      expect(() => service.getRecipeById('non-existent-dish')).toThrow(NotFoundException);
    });
  });

  describe('getRandomFood', () => {
    it('returns a random food suggestion with a Khmer recommendation message', () => {
      const suggestion = service.getRandomFood('lunch');
      expect(suggestion).toBeDefined();
      expect(suggestion.messageKm).toBeDefined();
      expect(suggestion.type === 'dish' || suggestion.type === 'place').toBe(true);
    });
  });

  describe('getDistricts', () => {
    it('returns list of Phnom Penh districts', () => {
      const districts = service.getDistricts();
      expect(districts.length).toBeGreaterThanOrEqual(8);
      expect(districts.some((d) => d.id === 'daun-penh')).toBe(true);
      expect(districts.some((d) => d.id === 'bkk')).toBe(true);
    });
  });
});
