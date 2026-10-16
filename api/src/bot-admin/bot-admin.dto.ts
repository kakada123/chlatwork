import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { BotKind, BotStatus } from './bot-access.service';

export class BotUsersQuery {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search = '';

  @IsOptional()
  @IsIn(['CREATOR', 'CHLATWORK'])
  bot?: BotKind;

  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'])
  status?: BotStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
}

export class ReviewBotUser {
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'])
  status!: BotStatus;

  @IsBoolean()
  creatorEnabled!: boolean;

  @IsBoolean()
  chlatworkEnabled!: boolean;

  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  startingCredits = 0;

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
