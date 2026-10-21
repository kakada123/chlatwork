import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  BudgetPeriod,
  ExpenseCurrency,
  ExpenseEntryType,
  type ExpenseEntry,
  ExpenseRangeMode,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateQuickExpenseDto } from './dto/create-quick-expense.dto';
import type {
  ExpenseRowDto,
  SaveExpenseStateDto,
} from './dto/save-expense-state.dto';
import type { UpdateQuickExpenseSettingsDto } from './dto/update-quick-expense-settings.dto';
import type {
  SaveExpenseChangesDto,
  SaveExpenseProfileDto,
} from './dto/save-expense-changes.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.expenseProfile.findUnique({
      where: { userId },
    });
    return {
      currency: profile?.currency ?? 'USD',
      budget: {
        period: profile?.budgetPeriod.toLowerCase() ?? 'monthly',
        amount: profile?.budgetInput ?? '',
      },
      quickExpenseEnabled: profile?.quickExpenseEnabled ?? false,
      rows: [],
    };
  }

  async saveProfile(userId: string, dto: SaveExpenseProfileDto) {
    const data = {
      currency: dto.currency as ExpenseCurrency,
      budgetPeriod: dto.budgetPeriod.toUpperCase() as BudgetPeriod,
      budgetInput: dto.budgetAmount,
    };
    await this.prisma.expenseProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return { saved: true };
  }

  private dateRange(from: string, to: string) {
    if (
      !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(from ?? '') ||
      !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(to ?? '')
    ) {
      throw new BadRequestException('Choose a valid start and end date');
    }
    const start = this.parseEntryDate(from);
    const end = this.parseEntryDate(to);
    if (start > end)
      throw new BadRequestException('Start date must be before end date');
    return { gte: start, lte: end };
  }

  async getEntries(userId: string, from: string, to: string) {
    const entries = await this.prisma.expenseEntry.findMany({
      where: { userId, entryDate: this.dateRange(from, to) },
      orderBy: { position: 'asc' },
    });
    return entries.map((entry) => this.serializeEntry(entry));
  }

  async getSummary(userId: string, from: string, to: string) {
    // Aggregate in PostgreSQL so opening the dashboard never downloads the entry history.
    const groups = await this.prisma.expenseEntry.groupBy({
      by: ['type', 'category', 'customCategory'],
      where: { userId, entryDate: this.dateRange(from, to), amount: { gt: 0 } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    let spent = new Prisma.Decimal(0);
    let income = new Prisma.Decimal(0);
    let itemsCount = 0;
    const categories = new Map<string, Prisma.Decimal>();
    for (const group of groups) {
      const amount = group._sum.amount ?? new Prisma.Decimal(0);
      itemsCount += group._count._all;
      if (group.type === ExpenseEntryType.INCOME) income = income.add(amount);
      else {
        spent = spent.add(amount);
        const category =
          group.category === '__custom__'
            ? group.customCategory || 'Other'
            : group.category;
        categories.set(
          category,
          (categories.get(category) ?? new Prisma.Decimal(0)).add(amount),
        );
      }
    }
    return {
      itemsCount,
      totalSpent: spent.toNumber(),
      totalIncome: income.toNumber(),
      categoryBreakdown: [...categories]
        .map(([category, total]) => ({
          category,
          total: total.toNumber(),
          percent: spent.isZero()
            ? 0
            : total.div(spent).mul(100).toDecimalPlaces(1).toNumber(),
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  async saveEntries(userId: string, dto: SaveExpenseChangesDto) {
    if (!dto.upserts.length && !dto.deleted.length) return { rows: [] };
    const ids = [...dto.upserts, ...dto.deleted].map((row) => row.id);
    if (ids.length > 500 || new Set(ids).size !== ids.length)
      throw new BadRequestException('Invalid expense change set');

    return await this.prisma.$transaction(async (tx) => {
      await this.lockExpenseState(tx, userId);
      await tx.expenseProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      const result: ReturnType<ExpensesService['serializeEntry']>[] = [];
      const max = await tx.expenseEntry.aggregate({
        where: { userId },
        _max: { position: true },
      });
      let position = (max._max.position ?? -1) + 1;
      for (const row of dto.upserts) {
        const {
          userId: owner,
          position: unused,
          ...data
        } = this.mapRow(userId, row, position);
        let entry: ExpenseEntry;
        if (row.updatedAt) {
          const changed = await tx.expenseEntry.updateMany({
            where: { userId, id: row.id, updatedAt: new Date(row.updatedAt) },
            data,
          });
          const current = await tx.expenseEntry.findFirst({
            where: { userId, id: row.id },
          });
          // A lost response can leave the client with an older version of an already-applied edit.
          if (
            !current ||
            (changed.count !== 1 && !this.sameEntryData(current, data))
          ) {
            throw new ConflictException(
              'Expense changed elsewhere. Reload the filter before editing again.',
            );
          }
          entry = current;
        } else {
          const existing = await tx.expenseEntry.findUnique({
            where: { id: row.id },
          });
          if (existing) {
            // A retry after a lost response may reuse a client ID, but must never modify another entry.
            const same =
              existing.userId === userId && this.sameEntryData(existing, data);
            if (!same)
              throw new ConflictException(
                'Expense could not be saved. Reload the filter.',
              );
            entry = existing;
          } else {
            entry = await tx.expenseEntry.create({
              data: { id: row.id, userId, position: position++, ...data },
            });
          }
        }
        result.push(this.serializeEntry(entry));
      }
      for (const row of dto.deleted) {
        const removed = await tx.expenseEntry.deleteMany({
          where: { userId, id: row.id, updatedAt: new Date(row.updatedAt) },
        });
        if (
          removed.count !== 1 &&
          (await tx.expenseEntry.findFirst({ where: { userId, id: row.id } }))
        ) {
          throw new ConflictException(
            'Expense changed elsewhere. Reload the filter before removing it.',
          );
        }
      }
      return { rows: result };
    });
  }

  private sameEntryData(
    entry: ExpenseEntry,
    data: Omit<ReturnType<ExpensesService['mapRow']>, 'userId' | 'position'>,
  ) {
    return (
      entry.type === data.type &&
      entry.entryDate?.getTime() === data.entryDate?.getTime() &&
      entry.category === data.category &&
      entry.customCategory === data.customCategory &&
      entry.note === data.note &&
      entry.showNote === data.showNote &&
      entry.amountInput === data.amountInput
    );
  }

  private serializeEntry(entry: ExpenseEntry) {
    return {
      id: entry.id,
      updatedAt: entry.updatedAt.toISOString(),
      type: entry.type.toLowerCase() as 'expense' | 'income',
      date: entry.entryDate?.toISOString().slice(0, 10) ?? '',
      category: entry.category,
      customCategory: entry.customCategory ?? undefined,
      note: entry.note,
      showNote: entry.showNote,
      amount: entry.amountInput,
    };
  }

  async getState(userId: string) {
    const [profile, entries] = await Promise.all([
      this.prisma.expenseProfile.findUnique({ where: { userId } }),
      this.prisma.expenseEntry.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
      }),
    ]);
    if (!profile) return null;

    return {
      currency: profile.currency,
      rangeMode: profile.rangeMode.toLowerCase(),
      budget: {
        period: profile.budgetPeriod.toLowerCase(),
        amount: profile.budgetInput,
      },
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
    const rows = dto.rows.map((row, position) =>
      this.mapRow(userId, row, position),
    );
    await this.prisma.$transaction(async (tx) => {
      await this.lockExpenseState(tx, userId);
      if (dto.expectedRowCount !== undefined) {
        const currentRowCount = await tx.expenseEntry.count({
          where: { userId },
        });
        if (currentRowCount !== dto.expectedRowCount) {
          throw new ConflictException(
            'Expense entries changed; reload before saving',
          );
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

  async updateQuickEntrySettings(
    userId: string,
    dto: UpdateQuickExpenseSettingsDto,
  ) {
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
    const customCategory =
      dto.category === '__custom__' ? dto.customCategory?.trim() : null;
    if (
      dto.category === '__custom__' &&
      (!customCategory || customCategory.length > 120)
    ) {
      throw new BadRequestException(
        'Enter a custom category name of up to 120 characters',
      );
    }
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
        throw new BadRequestException(
          'Expense amount must be greater than zero',
        );
      }

      const entry = await tx.expenseEntry.create({
        data: {
          userId,
          position: (positionResult._max.position ?? -1) + 1,
          type: ExpenseEntryType.EXPENSE,
          entryDate: this.parseEntryDate(dto.date),
          category: dto.category,
          customCategory: customCategory ?? null,
          note: dto.note.trim(),
          showNote: Boolean(dto.note.trim()),
          amount,
          amountInput: dto.amount,
        },
      });

      return {
        currency: profile.currency,
        row: this.serializeEntry(entry),
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
    if (
      Number.isNaN(entryDate.getTime()) ||
      entryDate.toISOString().slice(0, 10) !== value
    ) {
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
