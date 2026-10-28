import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Header,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { FoodService } from "./food.service";
import { FoodSearchQueryDto } from "./dto/food-search.dto";
import { FoodRecommendationDto } from "./dto/food-recommendation.dto";
import { FoodRandomQueryDto } from "./dto/food-random-query.dto";
import { FoodSavedRecipesDto } from "./dto/food-saved-recipes.dto";
import { FoodOptionalAuthGuard } from "./food-optional-auth.guard";
import {
  CurrentAuthUser,
  OptionalCurrentAuthUser,
} from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { CurrentUser } from "../auth/types";

@Controller("food")
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Get("filters")
  @Header("Cache-Control", "public, max-age=3600")
  getFilters() {
    return this.foodService.getFilters();
  }

  @Get("search")
  @Header("Cache-Control", "no-store")
  search(@Query() query: FoodSearchQueryDto) {
    return this.foodService.searchPlaces(query);
  }

  @Post("recommend")
  @UseGuards(FoodOptionalAuthGuard)
  @Header("Cache-Control", "no-store")
  recommend(
    @Body() dto: FoodRecommendationDto,
    @OptionalCurrentAuthUser() user: CurrentUser | null = null,
  ) {
    return this.foodService.recommend(dto, user?.id ?? null);
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
  @UseGuards(FoodOptionalAuthGuard)
  @Header("Cache-Control", "no-store")
  getRandomFood(
    @Query() query: FoodRandomQueryDto,
    @OptionalCurrentAuthUser() user: CurrentUser | null = null,
  ) {
    return this.foodService.getRandomFood(query, user?.id ?? null);
  }

  @Post("pick")
  @UseGuards(FoodOptionalAuthGuard)
  @Header("Cache-Control", "no-store")
  pick(
    @Body() dto: FoodRecommendationDto,
    @OptionalCurrentAuthUser() user: CurrentUser | null = null,
  ) {
    return this.foodService.pick(dto, user?.id ?? null);
  }

  @Get("saved-recipes")
  @UseGuards(JwtAuthGuard)
  @Header("Cache-Control", "no-store")
  savedRecipes(
    @CurrentAuthUser() user: CurrentUser,
    @Query() query: FoodSavedRecipesDto,
  ) {
    return this.foodService.getSavedRecipes(user.id, query);
  }

  @Get("saved-recipes/:id")
  @UseGuards(JwtAuthGuard)
  @Header("Cache-Control", "no-store")
  savedRecipe(
    @CurrentAuthUser() user: CurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.foodService.getSavedRecipe(user.id, id);
  }

  @Get("districts")
  getDistricts() {
    return this.foodService.getDistricts();
  }
}
