import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PaybackRowDto } from './save-payback-state.dto';

export class CreatePaybackHistoryDto {
  @IsIn(['USD', 'KHR'])
  currency!: 'USD' | 'KHR';

  @IsIn(['LEFTOVER_ONLY', 'ASSIGN_TO_PERSON'])
  remainderMode!: 'LEFTOVER_ONLY' | 'ASSIGN_TO_PERSON';

  @IsString()
  @MaxLength(120)
  remainderPayer!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PaybackRowDto)
  rows!: PaybackRowDto[];
}
