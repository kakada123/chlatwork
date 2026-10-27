import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DiscoveryMode, MealTime, Occasion } from '../food.types';

const validModes: DiscoveryMode[] = ['dine-out', 'cook-at-home'];
const validMealTimes: MealTime[] = ['breakfast', 'lunch', 'snack', 'dinner', 'any'];
const validOccasions: Occasion[] = ['solo', 'friends', 'first-date', 'couple', 'family', 'elderly', 'any'];

export class FoodRecommendationDto {
  @IsOptional()
  @IsIn(validModes)
  mode?: DiscoveryMode = 'dine-out';

  @IsOptional()
  @IsIn(validMealTimes)
  mealTime?: MealTime = 'lunch';

  @IsOptional()
  @IsIn(validOccasions)
  occasion?: Occasion = 'friends';

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  @IsInt()
  @Min(1)
  @Max(50)
  peopleCount?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined))
  @IsNumber()
  @Min(0)
  @Max(10000)
  totalBudget?: number;

  @IsOptional()
  @IsString()
  cuisine?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseFloat(value) : undefined))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 5))
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
