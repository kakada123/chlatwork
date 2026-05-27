import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ExpenseBudgetDto } from "./expense-budget.dto";
import { ExpenseRowDto } from "./expense-row.dto";

export class CreateExpenseTrackerDto {
  @IsIn(["USD", "KHR"])
  currency!: "USD" | "KHR";

  @IsIn(["all", "month", "week", "today"])
  rangeMode!: "all" | "month" | "week" | "today";

  @ValidateNested()
  @Type(() => ExpenseBudgetDto)
  budget!: ExpenseBudgetDto;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  rawText?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExpenseRowDto)
  rows!: ExpenseRowDto[];
}
