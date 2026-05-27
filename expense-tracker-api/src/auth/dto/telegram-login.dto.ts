import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class TelegramLoginDto {
  @IsInt()
  @Min(1)
  id!: number;

  @IsString()
  @MaxLength(120)
  first_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo_url?: string;

  @IsInt()
  @Min(1)
  auth_date!: number;

  @IsString()
  @MaxLength(128)
  hash!: string;
}
