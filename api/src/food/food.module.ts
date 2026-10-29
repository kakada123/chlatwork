import { Module } from "@nestjs/common";
import { FoodController } from "./food.controller";
import { FoodService } from "./food.service";
import { GooglePlacesProviderAdapter } from "./google-places-provider.adapter";
import { FoodAiPickerService } from "./food-ai-picker.service";
import { FoodRecommendationEngine } from "./food-recommendation.engine";
import { FoodRecipeStore } from "./food-recipe-store.service";
import { FoodOptionalAuthGuard } from "./food-optional-auth.guard";
import { FoodMenuCatalogController } from "./catalog/food-menu-catalog.controller";
import { FoodMenuCatalogService } from "./catalog/food-menu-catalog.service";

@Module({
  controllers: [FoodController, FoodMenuCatalogController],
  providers: [
    FoodService,
    GooglePlacesProviderAdapter,
    FoodRecommendationEngine,
    FoodAiPickerService,
    FoodRecipeStore,
    FoodOptionalAuthGuard,
    FoodMenuCatalogService,
  ],
  exports: [FoodService],
})
export class FoodModule {}
