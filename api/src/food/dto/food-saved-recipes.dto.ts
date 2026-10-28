import { Transform } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { foodNumber } from "./food-number";

export class FoodSavedRecipesDto {
  @IsOptional()
  @Transform(({ value }) => foodNumber(value))
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  cursor?: string;
}
