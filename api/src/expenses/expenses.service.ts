import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  BudgetPeriod,
  ExpenseCurrency,
  ExpenseEntryType,
  ExpenseRangeMode,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateQuickExpenseDto } from './dto/create-quick-expense.dto';
import type { ExpenseRowDto, SaveExpenseStateDto } from './dto/save-expense-state.dto';
import type { UpdateQuickExpenseSettingsDto } from './dto/update-quick-expense-settings.dto';

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
      quickExpenseEnabled: profile.quickExpenseEnabled,
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
      await this.lockExpenseState(tx, userId);
      if (dto.expectedRowCount !== undefined) {
        const currentRowCount = await tx.expenseEntry.count({ where: { userId } });
        if (currentRowCount !== dto.expectedRowCount) {
          throw new ConflictException('Expense entries changed; reload before saving');
        }
      }
      await tx.expenseProfile.upsert({
        where: { userId },
        create: {
          userId,
          currency: dto.currency as ExpenseCurrency,
          rangeMode: dto.rangeMode.toUpperCase() as ExpenseRangeMode,
          budgetPeriod: dto.budgetPeriod.toUpperCase() as BudgetPeriod,
          budgetInput: dto.budgetAmount,
          rawInput: dto.raw,
          quickExpenseEnabled: dto.quickExpenseEnabled,
        },
        update: {
          currency: dto.currency as ExpenseCurrency,
          rangeMode: dto.rangeMode.toUpperCase() as ExpenseRangeMode,
          budgetPeriod: dto.budgetPeriod.toUpperCase() as BudgetPeriod,
          budgetInput: dto.budgetAmount,
          rawInput: dto.raw,
          quickExpenseEnabled: dto.quickExpenseEnabled,
        },
      });
      await tx.expenseEntry.deleteMany({ where: { userId } });
      if (rows.length) await tx.expenseEntry.createMany({ data: rows });
    });
    return { saved: true };
  }

  async getQuickEntrySettings(userId: string) {
    const profile = await this.prisma.expenseProfile.findUnique({
      where: { userId },
      select: { currency: true, quickExpenseEnabled: true },
    });

    return {
      enabled: profile?.quickExpenseEnabled ?? false,
      currency: profile?.currency ?? ExpenseCurrency.USD,
    };
  }

  async updateQuickEntrySettings(userId: string, dto: UpdateQuickExpenseSettingsDto) {
    const profile = await this.prisma.expenseProfile.upsert({
      where: { userId },
      create: { userId, quickExpenseEnabled: dto.enabled },
      update: { quickExpenseEnabled: dto.enabled },
      select: { currency: true, quickExpenseEnabled: true },
    });

    return {
      enabled: profile.quickExpenseEnabled,
      currency: profile.currency,
    };
  }

  async createQuickExpense(userId: string, dto: CreateQuickExpenseDto) {
    return await this.prisma.$transaction(async (tx) => {
      await this.lockExpenseState(tx, userId);
      const profile = await tx.expenseProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
        select: { currency: true },
      });
      const positionResult = await tx.expenseEntry.aggregate({
        where: { userId },
        _max: { position: true },
      });
      const amount = new Prisma.Decimal(dto.amount);
      if (amount.lessThanOrEqualTo(0)) {
        throw new BadRequestException('Expense amount must be greater than zero');
      }

      const entry = await tx.expenseEntry.create({
        data: {
          userId,
          position: (positionResult._max.position ?? -1) + 1,
          type: ExpenseEntryType.EXPENSE,
          entryDate: this.parseEntryDate(dto.date),
          category: dto.category,
          customCategory: null,
          note: dto.note.trim(),
          showNote: Boolean(dto.note.trim()),
          amount,
          amountInput: dto.amount,
        },
      });

      return {
        currency: profile.currency,
        row: {
          type: 'expense',
          date: entry.entryDate?.toISOString().slice(0, 10) ?? dto.date,
          category: entry.category,
          note: entry.note,
          showNote: entry.showNote,
          amount: entry.amountInput,
        },
      };
    });
  }

  private async lockExpenseState(tx: Prisma.TransactionClient, userId: string) {
    // Full-state saves and floating quick adds must serialize so neither can discard the other.
    // executeRaw avoids asking Prisma to deserialize PostgreSQL's void lock result.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  }

  private parseEntryDate(value: string) {
    const entryDate = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(entryDate.getTime()) || entryDate.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('Expense row contains an invalid date');
    }
    return entryDate;
  }

  private mapRow(userId: string, row: ExpenseRowDto, position: number) {
    const entryDate = row.date ? this.parseEntryDate(row.date) : null;
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
