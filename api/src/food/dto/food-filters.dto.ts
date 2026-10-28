import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateBy } from "class-validator";
import { validFoodFilters, type FoodFilters } from "../food-filters";
import { foodNumber } from "./food-number";

export class FoodFiltersDto {
  @IsOptional()
  @ValidateBy({ name: "foodFilters", validator: { validate: validFoodFilters, defaultMessage: () => "Unknown food filter or invalid filter selection (maximum 8 per group)." } })
  filters?: FoodFilters;

  @IsOptional() @IsString() @MaxLength(300)
  locationQuery?: string;
  @IsOptional() @IsString() @MaxLength(300)
  routeOrigin?: string;
  @IsOptional() @IsString() @MaxLength(300)
  routeDestination?: string;
  @IsOptional() @IsString() @MaxLength(120)
  allergies?: string;
  @IsOptional() @IsString() @MaxLength(4096)
  pageToken?: string;
  @IsOptional() @IsString() @MaxLength(20000)
  routePolyline?: string;
  @IsOptional() @Transform(({ value }) => foodNumber(value)) @IsNumber() @Min(-90) @Max(90)
  searchLat?: number;
  @IsOptional() @Transform(({ value }) => foodNumber(value)) @IsNumber() @Min(-180) @Max(180)
  searchLng?: number;
  @IsOptional() @Transform(({ value }) => foodNumber(value)) @IsNumber() @Min(0) @Max(5)
  minimumRating?: number;
}
