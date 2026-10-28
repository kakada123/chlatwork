import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from "class-validator";
import { DiscoveryMode, MealTime, Occasion } from "../food.types";
import { foodNumber } from "./food-number";

const validModes: DiscoveryMode[] = ["dine-out", "cook-at-home"];
const validMealTimes: MealTime[] = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
  "any",
];
const validOccasions: Occasion[] = [
  "solo",
  "friends",
  "first-date",
  "couple",
  "family",
  "elderly",
  "any",
];

export class FoodRecommendationDto {
  @IsOptional()
  @IsIn(validModes)
  mode?: DiscoveryMode = "dine-out";

  @IsOptional()
  @IsIn(validMealTimes)
  mealTime?: MealTime = "lunch";

  @IsOptional()
  @IsIn(validOccasions)
  occasion?: Occasion = "friends";

  @IsOptional()
  @Transform(({ value }) => foodNumber(value))
  @IsInt()
  @Min(1)
  @Max(50)
  peopleCount?: number = 1;

  @IsOptional()
  @Transform(({ value }) => foodNumber(value))
  @IsNumber()
  @Min(0)
  @Max(10000)
  totalBudget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cuisine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  district?: string;

  @IsOptional()
  @Transform(({ value }) => foodNumber(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Transform(({ value }) => foodNumber(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Transform(({ value }) => foodNumber(value))
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
