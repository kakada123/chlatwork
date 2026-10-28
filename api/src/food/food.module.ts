import { Module } from "@nestjs/common";
import { FoodController } from "./food.controller";
import { FoodService } from "./food.service";
import { GooglePlacesProviderAdapter } from "./google-places-provider.adapter";
import { FoodAiPickerService } from "./food-ai-picker.service";
import { FoodRecommendationEngine } from "./food-recommendation.engine";

@Module({
  controllers: [FoodController],
  providers: [
    FoodService,
    GooglePlacesProviderAdapter,
    FoodRecommendationEngine,
    FoodAiPickerService,
  ],
  exports: [FoodService],
})
export class FoodModule {}
