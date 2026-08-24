import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseCurrency, PaybackRemainderMode, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PaybackRowDto, SavePaybackStateDto } from './dto/save-payback-state.dto';
import type { CreatePaybackHistoryDto } from './dto/create-payback-history.dto';

@Injectable()
export class PaybackService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(userId: string) {
    const [profile, entries] = await Promise.all([
      this.prisma.paybackProfile.findUnique({ where: { userId } }),
      this.prisma.paybackEntry.findMany({ where: { userId }, orderBy: { position: 'asc' } }),
    ]);
    if (!profile) return null;
    return {
      currency: profile.currency,
      remainderMode: profile.remainderMode,
      remainderPayer: profile.remainderPayer,
      raw: profile.rawInput,
      rows: entries.map((entry) => ({ name: entry.name, amount: entry.amountInput })),
    };
  }

  async saveState(userId: string, dto: SavePaybackStateDto) {
    const rows = dto.rows.map((row, position) => this.mapRow(userId, row, position));
    await this.prisma.$transaction(async (tx) => {
      await tx.paybackProfile.upsert({
        where: { userId },
        create: {
          userId,
          currency: dto.currency as ExpenseCurrency,
          remainderMode: dto.remainderMode as PaybackRemainderMode,
          remainderPayer: dto.remainderPayer,
          rawInput: dto.raw,
        },
        update: {
          currency: dto.currency as ExpenseCurrency,
          remainderMode: dto.remainderMode as PaybackRemainderMode,
          remainderPayer: dto.remainderPayer,
          rawInput: dto.raw,
        },
      });
      await tx.paybackEntry.deleteMany({ where: { userId } });
      if (rows.length) await tx.paybackEntry.createMany({ data: rows });
    });
    return { saved: true };
  }

  async getHistory(userId: string, requestedLimit?: string) {
    const parsedLimit = Number.parseInt(requestedLimit ?? '20', 10);
    const take = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
    const calculations = await this.prisma.paybackCalculation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { entries: { orderBy: { position: 'asc' } } },
    });

    return calculations.map((calculation) => ({
      id: calculation.id,
      currency: calculation.currency,
      remainderMode: calculation.remainderMode,
      remainderPayer: calculation.remainderPayer,
      total: calculation.total.toString(),
      participantCount: calculation.participantCount,
      createdAt: calculation.createdAt,
      rows: calculation.entries.map((entry) => ({
        name: entry.name,
        amount: entry.amountInput,
      })),
    }));
  }

  async getHistoryCount(userId: string) {
    return {
      count: await this.prisma.paybackCalculation.count({ where: { userId } }),
    };
  }

  async createHistory(userId: string, dto: CreatePaybackHistoryDto) {
    const rows = dto.rows.filter((row) => row.name.trim() && row.amount);
    if (rows.length < 2) {
      throw new BadRequestException('At least two people with amounts are required');
    }

    const names = new Set(rows.map((row) => row.name.trim().toLocaleLowerCase()));
    if (names.size < 2) {
      throw new BadRequestException('At least two different people are required');
    }

    const total = rows.reduce((sum, row) => sum.plus(new Prisma.Decimal(row.amount)), new Prisma.Decimal(0));
    if (total.lte(0)) {
      throw new BadRequestException('The calculation total must be greater than zero');
    }

    const calculation = await this.prisma.paybackCalculation.create({
      data: {
        userId,
        currency: dto.currency as ExpenseCurrency,
        remainderMode: dto.remainderMode as PaybackRemainderMode,
        remainderPayer: dto.remainderPayer,
        total,
        participantCount: names.size,
        entries: {
          create: rows.map((row, position) => ({
            position,
            name: row.name.trim(),
            amount: new Prisma.Decimal(row.amount),
            amountInput: row.amount,
          })),
        },
      },
    });

    return { id: calculation.id, saved: true };
  }

  async deleteHistory(userId: string, id: string) {
    const result = await this.prisma.paybackCalculation.deleteMany({ where: { id, userId } });
    if (!result.count) throw new NotFoundException('PayBack history item not found');
    return { deleted: true };
  }

  private mapRow(userId: string, row: PaybackRowDto, position: number) {
    return {
      userId,
      position,
      name: row.name,
      amount: row.amount ? new Prisma.Decimal(row.amount) : null,
      amountInput: row.amount,
    };
  }
}
