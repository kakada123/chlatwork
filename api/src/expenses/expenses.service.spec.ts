import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from './expenses.service';

describe('filtered expense entries', () => {
  const entry = {
    id: '00000000-0000-4000-8000-000000000001',
    userId: 'owner',
    position: 0,
    type: 'EXPENSE',
    entryDate: new Date('2026-10-01T00:00:00Z'),
    category: 'Food',
    customCategory: null,
    note: '',
    showNote: false,
    amountInput: '5',
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };
  const tx = {
    $executeRaw: jest.fn(),
    expenseProfile: { upsert: jest.fn() },
    expenseEntry: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const prisma = { ...tx, $transaction: jest.fn() };
  let service: ExpensesService;
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (work) => work(tx));
    tx.expenseEntry.findMany.mockResolvedValue([entry]);
    tx.expenseEntry.aggregate.mockResolvedValue({ _max: { position: 0 } });
    service = new ExpensesService(prisma as unknown as PrismaService);
  });

  it('queries only the authenticated account and selected calendar month', async () => {
    const rows = await service.getEntries('owner', '2026-10-01', '2026-10-31');
    expect(prisma.expenseEntry.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'owner',
        entryDate: {
          gte: new Date('2026-10-01T00:00:00Z'),
          lte: new Date('2026-10-31T00:00:00Z'),
        },
      },
      orderBy: { position: 'asc' },
    });
    expect(rows[0]).toMatchObject({
      id: entry.id,
      updatedAt: '2026-10-01T00:00:00.000Z',
      date: '2026-10-01',
    });
  });

  it.each(['', '2026-00-01', '2026-13-01', '2026-02-30', '0000-01-01'])(
    'rejects an invalid or missing date: %s',
    async (month) => {
      await expect(
        service.getEntries('owner', month, '2026-12-31'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.expenseEntry.findMany).not.toHaveBeenCalled();
    },
  );

  it('accepts ranges across calendar years', async () => {
    await service.getEntries('owner', '2026-12-01', '2027-01-31');
    expect(
      prisma.expenseEntry.findMany.mock.calls[0][0].where.entryDate.lte,
    ).toEqual(new Date('2027-01-31T00:00:00Z'));
  });

  it('rejects an edit when its version changed or it belongs to another account', async () => {
    tx.expenseEntry.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.saveEntries('owner', {
        upserts: [
          {
            id: entry.id,
            updatedAt: entry.updatedAt.toISOString(),
            type: 'expense',
            date: '2026-10-01',
            category: 'Food',
            note: '',
            showNote: false,
            amount: '6',
          },
        ],
        deleted: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.expenseEntry.updateMany.mock.calls[0][0].where).toEqual({
      id: entry.id,
      userId: 'owner',
      updatedAt: entry.updatedAt,
    });
    expect(tx.expenseEntry.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes only the requested owned entry at its expected version', async () => {
    tx.expenseEntry.deleteMany.mockResolvedValue({ count: 1 });
    await service.saveEntries('owner', {
      upserts: [],
      deleted: [{ id: entry.id, updatedAt: entry.updatedAt.toISOString() }],
    });
    expect(tx.expenseEntry.deleteMany).toHaveBeenCalledWith({
      where: { id: entry.id, userId: 'owner', updatedAt: entry.updatedAt },
    });
  });

  it('does no database work for an empty change set', async () => {
    await expect(
      service.saveEntries('owner', { upserts: [], deleted: [] }),
    ).resolves.toEqual({ rows: [] });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('builds decimal-safe category totals without fetching individual entries', async () => {
    tx.expenseEntry.groupBy.mockResolvedValue([
      {
        type: 'EXPENSE',
        category: 'Food',
        customCategory: null,
        _sum: { amount: new Prisma.Decimal('0.10') },
        _count: { _all: 1 },
      },
      {
        type: 'EXPENSE',
        category: '__custom__',
        customCategory: 'Food',
        _sum: { amount: new Prisma.Decimal('0.20') },
        _count: { _all: 1 },
      },
      {
        type: 'INCOME',
        category: 'Salary',
        customCategory: null,
        _sum: { amount: new Prisma.Decimal('100') },
        _count: { _all: 1 },
      },
    ]);
    await expect(
      service.getSummary('owner', '2026-10-01', '2026-10-21'),
    ).resolves.toEqual({
      itemsCount: 3,
      totalSpent: 0.3,
      totalIncome: 100,
      categoryBreakdown: [{ category: 'Food', total: 0.3, percent: 100 }],
    });
    expect(tx.expenseEntry.findMany).not.toHaveBeenCalled();
    expect(tx.expenseEntry.groupBy.mock.calls[0][0].where).toMatchObject({
      userId: 'owner',
      amount: { gt: 0 },
    });
  });

  it('rejects a reversed date range', async () => {
    await expect(
      service.getSummary('owner', '2026-10-21', '2026-10-01'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.expenseEntry.groupBy).not.toHaveBeenCalled();
  });

  it('does not create or modify an entry with another account’s ID', async () => {
    tx.expenseEntry.findUnique.mockResolvedValue({
      ...entry,
      userId: 'another-user',
    });
    await expect(
      service.saveEntries('owner', {
        upserts: [
          {
            id: entry.id,
            type: 'expense',
            date: '2026-10-01',
            category: 'Food',
            note: '',
            showNote: false,
            amount: '5',
          },
        ],
        deleted: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.expenseEntry.create).not.toHaveBeenCalled();
    expect(tx.expenseEntry.updateMany).not.toHaveBeenCalled();
  });

  it('retries a new entry with the same ID without duplicating it', async () => {
    tx.expenseEntry.findUnique.mockResolvedValue(entry);
    await expect(
      service.saveEntries('owner', {
        upserts: [
          {
            id: entry.id,
            type: 'expense',
            date: '2026-10-01',
            category: 'Food',
            note: '',
            showNote: false,
            amount: '5',
          },
        ],
        deleted: [],
      }),
    ).resolves.toMatchObject({ rows: [{ id: entry.id }] });
    expect(tx.expenseEntry.create).not.toHaveBeenCalled();
  });

  it('appends a new entry after existing positions without touching history', async () => {
    tx.expenseEntry.findUnique.mockResolvedValue(null);
    tx.expenseEntry.aggregate.mockResolvedValue({ _max: { position: 800 } });
    tx.expenseEntry.create.mockResolvedValue(entry);
    await service.saveEntries('owner', {
      upserts: [
        {
          id: entry.id,
          type: 'expense',
          date: '2026-10-01',
          category: 'Food',
          note: '',
          showNote: false,
          amount: '5',
        },
      ],
      deleted: [],
    });
    expect(tx.expenseEntry.create.mock.calls[0][0].data).toMatchObject({
      id: entry.id,
      userId: 'owner',
      position: 801,
    });
    expect(tx.expenseEntry.deleteMany).not.toHaveBeenCalled();
  });

  it('accepts an already-applied edit after a lost response without overwriting newer data', async () => {
    tx.expenseEntry.updateMany.mockResolvedValue({ count: 0 });
    tx.expenseEntry.findFirst.mockResolvedValue({
      ...entry,
      amountInput: '6',
      updatedAt: new Date('2026-10-21T00:00:00Z'),
    });
    await expect(
      service.saveEntries('owner', {
        upserts: [
          {
            id: entry.id,
            updatedAt: entry.updatedAt.toISOString(),
            type: 'expense',
            date: '2026-10-01',
            category: 'Food',
            note: '',
            showNote: false,
            amount: '6',
          },
        ],
        deleted: [],
      }),
    ).resolves.toMatchObject({
      rows: [{ amount: '6', updatedAt: '2026-10-21T00:00:00.000Z' }],
    });
  });

  it('retries an already-deleted entry without failing or touching other accounts', async () => {
    tx.expenseEntry.deleteMany.mockResolvedValue({ count: 0 });
    tx.expenseEntry.findFirst.mockResolvedValue(null);
    await expect(
      service.saveEntries('owner', {
        upserts: [],
        deleted: [{ id: entry.id, updatedAt: entry.updatedAt.toISOString() }],
      }),
    ).resolves.toEqual({ rows: [] });
    expect(tx.expenseEntry.findFirst).toHaveBeenCalledWith({
      where: { userId: 'owner', id: entry.id },
    });
  });
});
