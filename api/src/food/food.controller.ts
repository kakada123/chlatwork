import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Header,
} from "@nestjs/common";
import { FoodService } from "./food.service";
import { FoodSearchQueryDto } from "./dto/food-search.dto";
import { FoodRecommendationDto } from "./dto/food-recommendation.dto";
import { FoodRandomQueryDto } from "./dto/food-random-query.dto";

@Controller("food")
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get("search")
  @Header("Cache-Control", "no-store")
  search(@Query() query: FoodSearchQueryDto) {
    return this.foodService.searchPlaces(query);
  }

  @Post("recommend")
  @Header("Cache-Control", "no-store")
  recommend(@Body() dto: FoodRecommendationDto) {
    return this.foodService.recommend(dto);
  }

  @Get("recipes")
  getRecipes(
    @Query("category") category?: string,
    @Query("mealTime") mealTime?: string,
  ) {
    return this.foodService.getRecipes(category, mealTime);
  }

  @Get("recipes/:id")
  getRecipeById(@Param("id") id: string) {
    return this.foodService.getRecipeById(id);
  }

  @Get("random")
  @Header("Cache-Control", "no-store")
  getRandomFood(@Query() query: FoodRandomQueryDto) {
    return this.foodService.getRandomFood(query);
  }

  @Post("pick")
  @Header("Cache-Control", "no-store")
  pick(@Body() dto: FoodRecommendationDto) {
    return this.foodService.pick(dto);
  }

  @Get("districts")
  getDistricts() {
    return this.foodService.getDistricts();
  }
}
