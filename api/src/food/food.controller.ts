import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { FoodService } from './food.service';
import { FoodSearchQueryDto } from './dto/food-search.dto';
import { FoodRecommendationDto } from './dto/food-recommendation.dto';
import { MealTime } from './food.types';

@Controller('food')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get('search')
  search(@Query() query: FoodSearchQueryDto) {
    return this.foodService.searchPlaces(query);
  }

  @Post('recommend')
  recommend(@Body() dto: FoodRecommendationDto) {
    return this.foodService.recommend(dto);
  }

  @Get('recipes')
  getRecipes(
    @Query('category') category?: string,
    @Query('mealTime') mealTime?: string,
  ) {
    return this.foodService.getRecipes(category, mealTime);
  }

  @Get('recipes/:id')
  getRecipeById(@Param('id') id: string) {
    return this.foodService.getRecipeById(id);
  }

  @Get('random')
  getRandomFood(@Query('mealTime') mealTime?: MealTime) {
    return this.foodService.getRandomFood(mealTime);
  }

  @Get('districts')
  getDistricts() {
    return this.foodService.getDistricts();
  }
}
