import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BudgetPeriod,
  ExpenseCurrency,
  ExpenseEntryType,
  ExpenseRangeMode,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ExpenseRowDto, SaveExpenseStateDto } from './dto/save-expense-state.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(userId: string) {
    const [profile, entries] = await Promise.all([
      this.prisma.expenseProfile.findUnique({ where: { userId } }),
      this.prisma.expenseEntry.findMany({ where: { userId }, orderBy: { position: 'asc' } }),
    ]);
    if (!profile) return null;

    return {
      currency: profile.currency,
      rangeMode: profile.rangeMode.toLowerCase(),
      budget: { period: profile.budgetPeriod.toLowerCase(), amount: profile.budgetInput },
      raw: profile.rawInput,
      rows: entries.map((entry) => ({
        type: entry.type.toLowerCase(),
        date: entry.entryDate?.toISOString().slice(0, 10) ?? '',
        category: entry.category,
        customCategory: entry.customCategory ?? undefined,
        note: entry.note,
        showNote: entry.showNote,
        amount: entry.amountInput,
      })),
    };
  }

  async saveState(userId: string, dto: SaveExpenseStateDto) {
    const rows = dto.rows.map((row, position) => this.mapRow(userId, row, position));
    await this.prisma.$transaction(async (tx) => {
      await tx.expenseProfile.upsert({
        where: { userId },
        create: {
          userId,
          currency: dto.currency as ExpenseCurrency,
          rangeMode: dto.rangeMode.toUpperCase() as ExpenseRangeMode,
          budgetPeriod: dto.budgetPeriod.toUpperCase() as BudgetPeriod,
          budgetInput: dto.budgetAmount,
          rawInput: dto.raw,
        },
        update: {
          currency: dto.currency as ExpenseCurrency,
          rangeMode: dto.rangeMode.toUpperCase() as ExpenseRangeMode,
          budgetPeriod: dto.budgetPeriod.toUpperCase() as BudgetPeriod,
          budgetInput: dto.budgetAmount,
          rawInput: dto.raw,
        },
      });
      await tx.expenseEntry.deleteMany({ where: { userId } });
      if (rows.length) await tx.expenseEntry.createMany({ data: rows });
    });
    return { saved: true };
  }

  private mapRow(userId: string, row: ExpenseRowDto, position: number) {
    const entryDate = row.date ? new Date(`${row.date}T00:00:00.000Z`) : null;
    if (row.date && (Number.isNaN(entryDate?.getTime()) || entryDate?.toISOString().slice(0, 10) !== row.date)) {
      throw new BadRequestException('Expense row contains an invalid date');
    }
    return {
      userId,
      position,
      type: row.type.toUpperCase() as ExpenseEntryType,
      entryDate,
      category: row.category,
      customCategory: row.customCategory || null,
      note: row.note,
      showNote: row.showNote,
      amount: row.amount ? new Prisma.Decimal(row.amount) : null,
      amountInput: row.amount,
    };
  }
}
