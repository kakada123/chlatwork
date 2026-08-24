import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

export class PaybackRowDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(64)
  @Matches(/^(?:|(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?)$/)
  amount!: string;
}

export class SavePaybackStateDto {
  @IsIn(['USD', 'KHR'])
  currency!: 'USD' | 'KHR';

  @IsIn(['LEFTOVER_ONLY', 'ASSIGN_TO_PERSON'])
  remainderMode!: 'LEFTOVER_ONLY' | 'ASSIGN_TO_PERSON';

  @IsString()
  @MaxLength(120)
  remainderPayer!: string;

  @IsString()
  @MaxLength(50_000)
  raw!: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PaybackRowDto)
  rows!: PaybackRowDto[];
}
