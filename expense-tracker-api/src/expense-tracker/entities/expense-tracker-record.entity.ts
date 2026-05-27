import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type ExpenseCurrency = "USD" | "KHR";
export type ExpenseRangeMode = "all" | "month" | "week" | "today";
export type ExpenseMoneyType = "expense" | "income";

export type ExpenseBudgetSnapshot = {
  period: "monthly" | "weekly";
  amount: string;
};

export type ExpenseRowSnapshot = {
  type: ExpenseMoneyType;
  date: string;
  category: string;
  customCategory?: string;
  note?: string;
  amount: string;
};

export type ExpenseTrackerSummary = {
  itemsCount: number;
  totalIncome: number;
  totalSpent: number;
  netBalance: number;
  budgetAmount: number;
  budgetRemaining: number;
  categoryTotals: Array<{
    category: string;
    total: number;
  }>;
};

@Entity({ name: "expense_tracker_records" })
export class ExpenseTrackerRecord {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ name: "user_id", type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 3 })
  currency!: ExpenseCurrency;

  @Column({ name: "range_mode", type: "varchar", length: 16 })
  rangeMode!: ExpenseRangeMode;

  // Keep the submitted shape so Nuxt can restore the exact confirmed state later.
  @Column({ type: "simple-json" })
  budget!: ExpenseBudgetSnapshot;

  // Avoid a physical `rows` column because MariaDB treats ROWS as syntax-sensitive.
  @Column({ name: "expense_rows", type: "simple-json" })
  rows!: ExpenseRowSnapshot[];

  @Column({ name: "raw_text", type: "text", nullable: true })
  rawText!: string | null;

  @Column({ type: "simple-json" })
  summary!: ExpenseTrackerSummary;

  @Column({ type: "varchar", length: 20, default: "CONFIRMED" })
  status!: "CONFIRMED";

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
