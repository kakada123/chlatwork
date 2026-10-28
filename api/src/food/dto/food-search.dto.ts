import { Transform } from "class-transformer";
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  IsInt,
} from "class-validator";
import { foodNumber } from "./food-number";
import { FoodFiltersDto } from "./food-filters.dto";

export class FoodSearchQueryDto extends FoodFiltersDto {
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
  @Min(100)
  @Max(25000)
  radius?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cuisine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  district?: string;
}
