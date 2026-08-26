import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ExpenseRowDto {
  @IsIn(['expense', 'income'])
  type!: 'expense' | 'income';

  @IsString()
  @Matches(/^(?:|\d{4}-\d{2}-\d{2})$/)
  date!: string;

  @IsString()
  @MaxLength(120)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customCategory?: string;

  @IsString()
  @MaxLength(500)
  note!: string;

  @IsBoolean()
  showNote!: boolean;

  @IsString()
  @MaxLength(64)
  @Matches(/^(?:|(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?)$/)
  amount!: string;
}

export class SaveExpenseStateDto {
  @IsIn(['USD', 'KHR'])
  currency!: 'USD' | 'KHR';

  @IsIn(['all', 'month', 'week', 'today'])
  rangeMode!: 'all' | 'month' | 'week' | 'today';

  @IsIn(['monthly', 'weekly'])
  budgetPeriod!: 'monthly' | 'weekly';

  @IsString()
  @MaxLength(64)
  @Matches(/^(?:|(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?)$/)
  budgetAmount!: string;

  @IsString()
  @MaxLength(50_000)
  raw!: string;

  @IsBoolean()
  quickExpenseEnabled!: boolean;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExpenseRowDto)
  rows!: ExpenseRowDto[];
}
