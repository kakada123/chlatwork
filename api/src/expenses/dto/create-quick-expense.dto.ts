import { IsIn, IsString, Matches, MaxLength } from 'class-validator';

const quickExpenseCategories = [
  'Food',
  'Coffee',
  'Transport',
  'Rent',
  'Bills',
  'Internet',
  'Shopping',
  'Health',
  'Entertainment',
  'Loan',
  'Braces',
  'Other',
] as const;

export class CreateQuickExpenseDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
  amount!: string;

  @IsIn(quickExpenseCategories)
  category!: (typeof quickExpenseCategories)[number];

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @MaxLength(500)
  note!: string;
}
