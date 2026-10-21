import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const quickExpenseCategories = [
  'Food',
  'Coffee',
  'Beer',
  'Transport',
  'Gasoline',
  'Rent',
  'Bills',
  'Internet',
  'Phone Topup',
  'Subscription',
  'Shopping',
  'Health',
  'Entertainment',
  'Go on a date',
  'Loan',
  'Braces',
  'Other',
  '__custom__',
] as const;

export class CreateQuickExpenseDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
  amount!: string;

  @IsIn(quickExpenseCategories)
  category!: (typeof quickExpenseCategories)[number];

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf(
    (dto: CreateQuickExpenseDto) =>
      dto.category === '__custom__' || dto.customCategory !== undefined,
  )
  @IsString()
  @MaxLength(120)
  @Matches(/\S/, { message: 'A custom category name is required' })
  customCategory?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @MaxLength(500)
  note!: string;
}
