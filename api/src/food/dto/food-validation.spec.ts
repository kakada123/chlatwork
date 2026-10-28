import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { FoodRecommendationDto } from "./food-recommendation.dto";
import { FoodSearchQueryDto } from "./food-search.dto";
import { FoodSavedRecipesDto } from "./food-saved-recipes.dto";

describe("Food request validation", () => {
  it.each([
    { limit: 0 },
    { limit: 21 },
    { limit: "20abc" },
    { cursor: "x".repeat(257) },
  ])("rejects malformed saved history query %j", async (input) => {
    expect(
      (await validate(plainToInstance(FoodSavedRecipesDto, input))).length,
    ).toBeGreaterThan(0);
  });
  it("rejects client-supplied recipe ownership", async () => {
    expect(
      (
        await validate(
          plainToInstance(FoodRecommendationDto, { ownerId: "forged" }),
          { whitelist: true, forbidNonWhitelisted: true },
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it.each([
    { peopleCount: "3people" },
    { peopleCount: "1.5" },
    { totalBudget: "10usd" },
    { lat: "11.5invalid", lng: "104.9" },
    { limit: "5results" },
    { cuisine: "x".repeat(121) },
    { district: "x".repeat(65) },
    { mode: "invented" },
    { peopleCount: true },
    { totalBudget: [] },
    { excludePlaceIds: "google:one" },
    { excludePlaceIds: [42] },
    { excludePlaceIds: Array(101).fill("google:one") },
    { excludePlaceIds: ["x".repeat(301)] },
    { recentRecipeNames: [false] },
    { recentRecipeNames: ["x".repeat(161)] },
    { recentRecipeNames: Array(41).fill("Recipe") },
  ])("rejects malformed picker criteria %j", async (input) => {
    expect(
      (await validate(plainToInstance(FoodRecommendationDto, input))).length,
    ).toBeGreaterThan(0);
  });

  it.each([
    { radius: "2000m" },
    { radius: "500.5" },
    { lat: "11.5junk" },
    { lng: true },
  ])("rejects malformed search criteria %j", async (input) => {
    expect(
      (await validate(plainToInstance(FoodSearchQueryDto, input))).length,
    ).toBeGreaterThan(0);
  });

  it("accepts valid string query numbers while preserving zero-valued coordinates", async () => {
    const dto = plainToInstance(FoodRecommendationDto, {
      lat: "0",
      lng: "0",
      peopleCount: "4",
      totalBudget: "12.50",
      limit: "5",
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({
      lat: 0,
      lng: 0,
      peopleCount: 4,
      totalBudget: 12.5,
      limit: 5,
    });
  });
});
