import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { foodNumber } from "../dto/food-number";
import {
  FOOD_MENU_CATEGORIES,
  FOOD_MENU_CUISINES,
  FOOD_MENU_MEALS,
  FOOD_MENU_TAGS,
} from "./food-menu.contract";

export class FoodMenuQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
  @IsOptional()
  @IsIn(FOOD_MENU_CATEGORIES.map((entry) => entry.value))
  category?: string;
  @IsOptional()
  @IsIn(FOOD_MENU_CUISINES.map((entry) => entry.value))
  cuisine?: string;
  @IsOptional()
  @IsIn(FOOD_MENU_MEALS)
  mealTime?: string;
  @IsOptional()
  @IsIn(FOOD_MENU_TAGS)
  tag?: string;
  @IsOptional()
  @IsString()
  @MaxLength(96)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  after?: string;
  @IsOptional()
  @Transform(({ value }) => foodNumber(value))
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number = 24;
}
