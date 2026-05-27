import { IsIn, IsString, MaxLength } from "class-validator";

export class ExpenseBudgetDto {
  @IsIn(["monthly", "weekly"])
  period!: "monthly" | "weekly";

  @IsString()
  @MaxLength(32)
  amount!: string;
}
