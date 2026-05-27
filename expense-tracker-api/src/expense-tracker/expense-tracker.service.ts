import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { CreateExpenseTrackerDto } from "./dto/create-expense-tracker.dto";
import {
  ExpenseRowSnapshot,
  ExpenseTrackerRecord,
  ExpenseTrackerSummary,
} from "./entities/expense-tracker-record.entity";
import { ExpenseTrackerRepository } from "./expense-tracker.repository";

@Injectable()
export class ExpenseTrackerService {
  constructor(private readonly repository: ExpenseTrackerRepository) {}

  async confirmSave(dto: CreateExpenseTrackerDto, userId: string) {
    const rows = dto.rows.map((row) => ({
      type: row.type,
      date: row.date,
      category: row.category.trim(),
      customCategory: row.customCategory?.trim() || undefined,
      note: row.note?.trim() || "",
      amount: row.amount.trim(),
    }));

    this.assertRowsHaveBusinessValue(rows);

    const record = new ExpenseTrackerRecord();
    record.id = randomUUID();
    record.userId = userId;
    record.currency = dto.currency;
    record.rangeMode = dto.rangeMode;
    record.budget = {
      period: dto.budget.period,
      amount: dto.budget.amount.trim(),
    };
    record.rows = rows;
    record.rawText = dto.rawText?.trim() || null;
    record.summary = this.buildSummary(rows, record.budget.amount);
    record.status = "CONFIRMED";

    return this.repository.save(record);
  }

  async findOne(id: string, userId: string) {
    const record = await this.repository.findByIdAndUserId(id, userId);

    if (!record) {
      throw new NotFoundException("Expense Tracker record was not found.");
    }

    return record;
  }

  async listByCreatedMonth(userId: string, monthRaw: string | undefined) {
    const { start, end } = this.parseCreatedMonth(monthRaw);
    const records = await this.repository.findByUserIdAndCreatedMonth(
      userId,
      start,
      end,
    );

    return records.map((record) => ({
      id: record.id,
      currency: record.currency,
      rangeMode: record.rangeMode,
      budget: record.budget,
      summary: record.summary,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  private assertRowsHaveBusinessValue(rows: ExpenseRowSnapshot[]) {
    const hasSavedValue = rows.some((row) => {
      return row.date && this.resolveCategory(row) && row.amount;
    });

    if (!hasSavedValue) {
      throw new BadRequestException("At least one completed expense row is required.");
    }

    for (const row of rows) {
      if (row.category === "__custom__" && !row.customCategory) {
        throw new BadRequestException("Custom category rows require a category name.");
      }
    }
  }

  private buildSummary(
    rows: ExpenseRowSnapshot[],
    budgetAmountRaw: string,
  ): ExpenseTrackerSummary {
    let totalIncome = 0;
    let totalSpent = 0;
    const categoryTotals = new Map<string, number>();

    for (const row of rows) {
      const amount = this.parseMoney(row.amount);

      if (row.type === "income") {
        totalIncome += amount;
        continue;
      }

      totalSpent += amount;
      const category = this.resolveCategory(row);
      categoryTotals.set(
        category,
        this.roundMoney((categoryTotals.get(category) ?? 0) + amount),
      );
    }

    const budgetAmount = this.parseOptionalMoney(budgetAmountRaw);
    const sortedCategoryTotals = [...categoryTotals.entries()]
      .map(([category, total]) => ({
        category,
        total,
      }))
      .sort((left, right) => right.total - left.total);

    return {
      itemsCount: rows.length,
      totalIncome: this.roundMoney(totalIncome),
      totalSpent: this.roundMoney(totalSpent),
      netBalance: this.roundMoney(totalIncome - totalSpent),
      budgetAmount,
      budgetRemaining: this.roundMoney(budgetAmount - totalSpent),
      categoryTotals: sortedCategoryTotals,
    };
  }

  private parseOptionalMoney(value: string) {
    if (!value.trim()) {
      return 0;
    }

    return this.parseMoney(value);
  }

  private resolveCategory(row: ExpenseRowSnapshot) {
    if (row.category === "__custom__") {
      return row.customCategory?.trim() ?? "";
    }

    return row.category.trim();
  }

  private parseMoney(value: string) {
    const parsed = Number(value.trim());

    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`Invalid amount: ${value}`);
    }

    return this.roundMoney(parsed);
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private parseCreatedMonth(monthRaw: string | undefined) {
    const month = monthRaw?.trim() || this.getCurrentMonthKey();
    const match = /^(\d{4})-(\d{2})$/.exec(month);

    if (!match) {
      throw new BadRequestException("Month must use YYYY-MM format.");
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;

    if (monthIndex < 0 || monthIndex > 11) {
      throw new BadRequestException("Month must use YYYY-MM format.");
    }

    return {
      start: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
      end: new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0)),
    };
  }

  private getCurrentMonthKey() {
    return new Date().toISOString().slice(0, 7);
  }
}
