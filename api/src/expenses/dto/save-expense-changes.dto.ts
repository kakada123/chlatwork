import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ExpenseRowDto } from './save-expense-state.dto';

export class ExpenseEntryChangeDto extends ExpenseRowDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  updatedAt?: string;
}

export class ExpenseEntryRemovalDto {
  @IsUUID()
  id!: string;

  @IsISO8601({ strict: true })
  updatedAt!: string;
}

export class SaveExpenseChangesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExpenseEntryChangeDto)
  upserts!: ExpenseEntryChangeDto[];

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExpenseEntryRemovalDto)
  deleted!: ExpenseEntryRemovalDto[];
}

export class SaveExpenseProfileDto {
  @IsIn(['USD', 'KHR'])
  currency!: 'USD' | 'KHR';

  @IsIn(['monthly', 'weekly'])
  budgetPeriod!: 'monthly' | 'weekly';

  @IsString()
  @MaxLength(64)
  @Matches(/^(?:|(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?)$/)
  budgetAmount!: string;
}
