import { IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class ExpenseRowDto {
  @IsIn(["expense", "income"])
  type!: "expense" | "income";

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @MaxLength(80)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  customCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @IsString()
  @MaxLength(32)
  @Matches(/^-?\d+(\.\d{1,2})?$/)
  amount!: string;
}
