import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { FoodService } from "./food.service";
import { GooglePlacesProviderAdapter } from "./google-places-provider.adapter";
import { FoodAiPickerService } from "./food-ai-picker.service";
import { FoodRecommendationEngine } from "./food-recommendation.engine";
import type { Place } from "./food.types";
import { plainToInstance } from "class-transformer";
import { FoodController } from "./food.controller";

describe("FoodService", () => {
  let service: FoodService;
  let placesProvider: { searchNearby: jest.Mock };
  let aiPicker: { choose: jest.Mock; assertAvailable: jest.Mock };
  let engine: FoodRecommendationEngine;
  const fixture: Place = {
    id: "google:fixture",
    googlePlaceId: "fixture",
    name: "Fixture Restaurant",
    amenity: "restaurant",
    cuisine: ["khmer"],
    lat: 11.5517,
    lng: 104.9248,
    city: "Phnom Penh",
    source: "google",
    isPriceVerified: false,
  };

  beforeEach(() => {
    placesProvider = {
      searchNearby: jest
        .fn()
        .mockResolvedValue({ places: [fixture], dataSource: "google" }),
    };
    aiPicker = {
      choose: jest
        .fn()
        .mockResolvedValue({
          id: fixture.id,
          messageKm: "សាកញ៉ាំនៅទីនេះថ្ងៃនេះ។",
        }),
      assertAvailable: jest.fn(),
    };
    engine = new FoodRecommendationEngine();
    service = new FoodService(
      placesProvider as unknown as GooglePlacesProviderAdapter,
      engine,
      aiPicker as unknown as FoodAiPickerService,
    );
  });

  describe("searchPlaces", () => {
    it("returns Google places with correct source attribution", async () => {
      const result = await service.searchPlaces({
        lat: 11.5564,
        lng: 104.9282,
        radius: 2000,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.places)).toBe(true);
      expect(result.places.length).toBeGreaterThan(0);
      expect(result.dataSource).toBe("google");
      expect(result.attribution.provider).toBe("Google Maps");
    });
  });

  describe("recommend", () => {
    it("handles dine-out recommendation mode with budget explanation", async () => {
      const response = await service.recommend({
        mode: "dine-out",
        mealTime: "lunch",
        occasion: "friends",
        peopleCount: 3,
        totalBudget: 10,
        district: "bkk",
      });

      expect(response.mode).toBe("dine-out");
      expect(response.querySummary.peopleCount).toBe(3);
      expect(response.querySummary.totalBudget).toBe(10);
      expect(response.querySummary.budgetPerPerson).toBeCloseTo(3.33, 1);
      expect(response.places.length).toBeGreaterThan(0);
      expect(response.places[0].budgetFit).toBeDefined();
    });

    it("handles cook-at-home mode returning ranked Khmer recipes", async () => {
      const response = await service.recommend({
        mode: "cook-at-home",
        mealTime: "lunch",
        occasion: "family",
        peopleCount: 4,
        totalBudget: 15,
      });

      expect(response.mode).toBe("cook-at-home");
      expect(response.recipes).toBeDefined();
      expect(response.recipes!.length).toBeGreaterThan(0);
      expect(response.recipes![0].steps.length).toBeGreaterThan(0);
      expect(response.recipes![0].ingredients.length).toBeGreaterThan(0);
      expect(placesProvider.searchNearby).not.toHaveBeenCalled();
    });
  });

  describe("recipes", () => {
    it("retrieves recipe list and allows filtering by category", () => {
      const allRecipes = service.getRecipes();
      expect(allRecipes.length).toBeGreaterThanOrEqual(10);

      const soups = service.getRecipes("soup");
      expect(soups.length).toBeGreaterThan(0);
      expect(soups.every((r) => r.category === "soup")).toBe(true);
    });

    it("retrieves single recipe by id or throws NotFoundException", () => {
      const recipe = service.getRecipeById("samlor-korko");
      expect(recipe).toBeDefined();
      expect(recipe.nameKm).toContain("កកូរ");

      expect(() => service.getRecipeById("non-existent-dish")).toThrow(
        NotFoundException,
      );
    });
  });

  describe("getRandomFood", () => {
    it("keeps the legacy route available and obtains its recipe choice from Gemini", async () => {
      aiPicker.choose.mockResolvedValue({
        id: "samlor-korko",
        messageKm: "សាកធ្វើសម្លកកូរម្តង។",
      });
      const [QueryDto] = Reflect.getMetadata(
        "design:paramtypes",
        FoodController.prototype,
        "getRandomFood",
      );
      const query = plainToInstance(QueryDto, { mealTime: "lunch" });
      const suggestion = await new FoodController(service).getRandomFood(
        query as never,
      );
      expect(suggestion).toBeDefined();
      expect(suggestion.messageKm).toBeDefined();
      expect(suggestion.selectionSource).toBe("gemini");
      expect(suggestion.dish?.recipeId).toBe("samlor-korko");
    });
  });

  describe("pick", () => {
    it("does not charge Google when AI is disabled or unconfigured", async () => {
      aiPicker.assertAvailable.mockImplementation(() => {
        throw new ServiceUnavailableException("AI unavailable");
      });
      await expect(service.pick({ mode: "dine-out" })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(placesProvider.searchNearby).not.toHaveBeenCalled();
    });
    it("uses current location and cuisine filters and returns the real candidate selected by Gemini", async () => {
      const result = await service.pick({
        mode: "dine-out",
        district: "bkk",
        mealTime: "dinner",
        occasion: "family",
        peopleCount: 4,
        totalBudget: 20,
        cuisine: "គុយទាវ",
      });
      expect(result).toMatchObject({
        type: "place",
        selectionSource: "gemini",
        place: { id: fixture.id, googlePlaceId: "fixture" },
      });
      expect(placesProvider.searchNearby).toHaveBeenCalledWith(
        11.5516,
        104.9247,
        3000,
        "គុយទាវ",
      );
      const [candidates, criteria] = aiPicker.choose.mock.calls[0];
      expect(candidates[0]).toMatchObject({
        id: fixture.id,
        isPriceVerified: false,
      });
      expect(criteria).toMatchObject({
        mode: "dine-out",
        mealTime: "dinner",
        occasion: "family",
        peopleCount: 4,
        totalBudget: 20,
        lat: 11.5516,
        lng: 104.9247,
      });
    });

    it("chooses only a recipe from the existing catalog in cook-at-home mode", async () => {
      aiPicker.choose.mockImplementation(async (candidates) => ({
        id: candidates[0].id,
        messageKm: "សាកធ្វើម្ហូបខ្មែរនេះនៅផ្ទះ។",
      }));
      const result = await service.pick({
        mode: "cook-at-home",
        mealTime: "breakfast",
        cuisine: "noodle",
      });
      expect(result.type).toBe("dish");
      expect(result.dish?.recipeId).toBeDefined();
      expect(service.getRecipeById(result.dish!.recipeId!)).toBeDefined();
      expect(placesProvider.searchNearby).not.toHaveBeenCalled();
    });

    it("does not invent an alternative when there are no Google candidates", async () => {
      placesProvider.searchNearby.mockResolvedValue({
        places: [],
        dataSource: "google",
      });
      await expect(service.pick({ mode: "dine-out" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(aiPicker.choose).not.toHaveBeenCalled();
    });

    it("fails safely when the AI returns an unknown candidate or is unavailable", async () => {
      aiPicker.choose.mockResolvedValue({
        id: "not-in-results",
        messageKm: "មិនត្រឹមត្រូវ",
      });
      await expect(service.pick({ mode: "dine-out" })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      aiPicker.choose.mockRejectedValue(
        new ServiceUnavailableException("AI unavailable"),
      );
      await expect(service.pick({ mode: "dine-out" })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it("rejects partial coordinates and unknown districts instead of silently using central Phnom Penh", async () => {
      await expect(service.searchPlaces({ lat: 11.5 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.searchPlaces({ district: "unknown" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(placesProvider.searchNearby).not.toHaveBeenCalled();
    });
  });

  describe("getDistricts", () => {
    it("returns list of Phnom Penh districts", () => {
      const districts = service.getDistricts();
      expect(districts.length).toBeGreaterThanOrEqual(8);
      expect(districts.some((d) => d.id === "daun-penh")).toBe(true);
      expect(districts.some((d) => d.id === "bkk")).toBe(true);
    });
  });
});
