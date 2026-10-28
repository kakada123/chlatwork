import type { DiscoveryMode } from "../food.types";
import { FoodRecommendationDto } from "./food-recommendation.dto";

export class FoodRandomQueryDto extends FoodRecommendationDto {
  // Legacy meal-only requests must not implicitly add a paid restaurant search.
  override mode: DiscoveryMode | undefined = undefined;
}
