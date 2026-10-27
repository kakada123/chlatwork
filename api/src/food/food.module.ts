import { Module } from '@nestjs/common';
import { FoodController } from './food.controller';
import { FoodService } from './food.service';
import { OsmProviderAdapter } from './osm-provider.adapter';
import { FoodRecommendationEngine } from './food-recommendation.engine';

@Module({
  controllers: [FoodController],
  providers: [FoodService, OsmProviderAdapter, FoodRecommendationEngine],
  exports: [FoodService],
})
export class FoodModule {}
