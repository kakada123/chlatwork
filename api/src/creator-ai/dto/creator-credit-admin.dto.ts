import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';

export class CreatorCreditUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search = '';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
}

export class AdjustCreatorCreditsDto {
  @IsUUID('4')
  userId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(-100000)
  @Max(100000)
  @NotEquals(0)
  amount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedBalance!: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  reason!: string;
}
