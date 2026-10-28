import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { FOOD_FILTERS, describeFoodFilters, validFoodFilters } from "./food-filters";
import { FoodRecommendationDto } from "./dto/food-recommendation.dto";

describe("Food discovery filters", () => {
  it("accepts the requested who, occasion, roadside and extra preferences through the API DTO", async () => {
    const filters = { who: "parents-with-baby", eventOccasion: "khmer-new-year", restaurantTypes: ["street-food-stall", "all-you-can-eat-restaurant"], payments: ["khqr"], accessibility: ["wheelchair-access"], foodTypes: ["kuy-teav"] };
    expect(await validate(plainToInstance(FoodRecommendationDto, { filters }))).toEqual([]);
    expect(describeFoodFilters(filters)).toMatchObject({ who: ["Parents with Baby"], foodTypes: ["គុយទាវ"], payments: ["KHQR"] });
    expect(FOOD_FILTERS.find((field) => field.key === "who")!.groups[0].options).toHaveLength(25);
  });
  it.each([{ unknown: "value" }, { who: ["friends"] }, { payments: "khqr" }, { payments: ["unsafe"] }, { foodTypes: Array(9).fill("kuy-teav") }, { vibes: [false] }, []])("rejects invalid or unbounded filter input %j", async (filters) => {
    expect(validFoodFilters(filters)).toBe(false);
    expect((await validate(plainToInstance(FoodRecommendationDto, { filters }))).length).toBeGreaterThan(0);
  });
});
