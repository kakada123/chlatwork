import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { FoodRecommendationDto } from "./food-recommendation.dto";
import { FoodSearchQueryDto } from "./food-search.dto";

describe("Food request validation", () => {
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
