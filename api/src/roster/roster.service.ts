import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaveCode,
  LeaveTransactionKind,
  Prisma,
  RosterEntryStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  type ApplyRosterEntryDto,
  type CreateShiftDto,
  type GenerateRosterDto,
  type LeaveAdjustmentDto,
  type UpdatePreferencesDto,
  type UpdateShiftDto,
  type UpsertRosterDayDto,
} from './roster.dto';
import { getCambodiaPublicHolidays } from './cambodia-holidays.util';

/**
 * Returns the balance bucket in `LeaveBalance` for a given leave code.
 * AL, H1, and H2 all draw from the AL balance.
 * PHL draws from the PHL balance.
 * PRD is tracked against monthly allowance, not annual leave balance.
 */
function balanceCodeForLeave(code: LeaveCode | null | undefined): LeaveCode | null {
  if (!code) return null;
  if (code === LeaveCode.AL || code === LeaveCode.H1 || code === LeaveCode.H2) {
    return LeaveCode.AL;
  }
  if (code === LeaveCode.PHL) {
    return LeaveCode.PHL;
  }
  return null;
}

/**
 * Returns the half-day cost of a leave code.
 * Full-day leaves (AL, PHL, PRD) = 2 half-days.
 * Half-day leaves (H1, H2) = 1 half-day.
 */
function halfDayCostForLeave(code: LeaveCode | null | undefined): number {
  if (!code) return 0;
  if (code === LeaveCode.H1 || code === LeaveCode.H2) return 1;
  return 2;
}

@Injectable()
export class RosterService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Monthly roster ───────────────────────────────────────────────────────

  async getMonthlyRoster(userId: string, year: number, month: number) {
    this.validateYearMonth(year, month);
    const { start, end } = this.monthRange(year, month);
    const days = await this.prisma.rosterDay.findMany({
      where: { userId, entryDate: { gte: start, lte: end } },
      orderBy: { entryDate: 'asc' },
    });
    return days.map((d) => this.serializeRosterDay(d));
  }

  // ─── Upsert roster day ────────────────────────────────────────────────────

  async upsertRosterDay(userId: string, date: string, dto: UpsertRosterDayDto) {
    const entryDate = this.parseDate(date);
    const newLeaveCode = dto.leaveCode ? (dto.leaveCode as LeaveCode) : null;
    const newStatus = dto.status
      ? (dto.status as RosterEntryStatus)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.rosterDay.findUnique({
        where: { userId_entryDate: { userId, entryDate } },
      });

      const year = entryDate.getUTCFullYear();

      // 1. Reverse previous commitment if existing entry had a leave code
      if (existing && existing.leaveCode) {
        const oldBalanceCode = balanceCodeForLeave(existing.leaveCode);
        const oldCost = halfDayCostForLeave(existing.leaveCode);

        if (oldBalanceCode && oldCost > 0) {
          if (existing.status === RosterEntryStatus.CONFIRMED) {
            await tx.leaveTransaction.create({
              data: {
                userId,
                leaveCode: oldBalanceCode,
                kind: LeaveTransactionKind.REVERSAL,
                halfDays: oldCost, // positive = credit back
                rosterDayId: existing.id,
                note: `Reversal for ${existing.leaveCode} on ${date}`,
              },
            });
            await this.ensureLeaveBalance(tx, userId, oldBalanceCode, year);
            await tx.leaveBalance.update({
              where: {
                userId_leaveCode_leaveYear: {
                  userId,
                  leaveCode: oldBalanceCode,
                  leaveYear: year,
                },
              },
              data: { confirmedUsedHalfDays: { decrement: oldCost } },
            });
          } else if (existing.status === RosterEntryStatus.REQUESTED) {
            await this.ensureLeaveBalance(tx, userId, oldBalanceCode, year);
            await tx.leaveBalance.update({
              where: {
                userId_leaveCode_leaveYear: {
                  userId,
                  leaveCode: oldBalanceCode,
                  leaveYear: year,
                },
              },
              data: { pendingHalfDays: { decrement: oldCost } },
            });
          }
        }
      }

      // 2. Upsert the roster day
      const rosterDay = await tx.rosterDay.upsert({
        where: { userId_entryDate: { userId, entryDate } },
        create: {
          userId,
          entryDate,
          shiftCode: dto.shiftCode ?? null,
          leaveCode: newLeaveCode,
          status: newStatus ?? RosterEntryStatus.DRAFT,
          note: dto.note ?? null,
          isLocked: dto.isLocked ?? false,
        },
        update: {
          ...(dto.shiftCode !== undefined && { shiftCode: dto.shiftCode }),
          ...(dto.leaveCode !== undefined && { leaveCode: newLeaveCode }),
          ...(dto.status !== undefined && { status: newStatus }),
          ...(dto.note !== undefined && { note: dto.note }),
          ...(dto.isLocked !== undefined && { isLocked: dto.isLocked }),
        },
      });

      // 3. Apply new commitment
      const effectiveStatus = rosterDay.status;
      const effectiveLeave = rosterDay.leaveCode;
      const newBalanceCode = balanceCodeForLeave(effectiveLeave);
      const newCost = halfDayCostForLeave(effectiveLeave);

      if (newBalanceCode && newCost > 0) {
        await this.ensureLeaveBalance(tx, userId, newBalanceCode, year);

        if (effectiveStatus === RosterEntryStatus.CONFIRMED) {
          await tx.leaveTransaction.create({
            data: {
              userId,
              leaveCode: newBalanceCode,
              kind: LeaveTransactionKind.DEDUCTION,
              halfDays: -newCost, // negative = debit
              rosterDayId: rosterDay.id,
              note: `Deduction for ${effectiveLeave} on ${date}`,
            },
          });
          await tx.leaveBalance.update({
            where: {
              userId_leaveCode_leaveYear: {
                userId,
                leaveCode: newBalanceCode,
                leaveYear: year,
              },
            },
            data: { confirmedUsedHalfDays: { increment: newCost } },
          });
        } else if (effectiveStatus === RosterEntryStatus.REQUESTED) {
          await tx.leaveBalance.update({
            where: {
              userId_leaveCode_leaveYear: {
                userId,
                leaveCode: newBalanceCode,
                leaveYear: year,
              },
            },
            data: { pendingHalfDays: { increment: newCost } },
          });
        }
      }

      return this.serializeRosterDay(rosterDay);
    });
  }

  // ─── Delete draft roster day ──────────────────────────────────────────────

  async deleteRosterDay(userId: string, date: string) {
    const entryDate = this.parseDate(date);
    const existing = await this.prisma.rosterDay.findUnique({
      where: { userId_entryDate: { userId, entryDate } },
    });
    if (!existing) throw new NotFoundException('Roster day not found');

    const year = entryDate.getUTCFullYear();

    return this.prisma.$transaction(async (tx) => {
      // Revert any commitment
      if (existing.leaveCode) {
        const balCode = balanceCodeForLeave(existing.leaveCode);
        const cost = halfDayCostForLeave(existing.leaveCode);
        if (balCode && cost > 0) {
          if (existing.status === RosterEntryStatus.CONFIRMED) {
            await tx.leaveTransaction.create({
              data: {
                userId,
                leaveCode: balCode,
                kind: LeaveTransactionKind.REVERSAL,
                halfDays: cost,
                rosterDayId: existing.id,
                note: `Reversal on deletion for ${existing.leaveCode} on ${date}`,
              },
            });
            await this.ensureLeaveBalance(tx, userId, balCode, year);
            await tx.leaveBalance.update({
              where: {
                userId_leaveCode_leaveYear: {
                  userId,
                  leaveCode: balCode,
                  leaveYear: year,
                },
              },
              data: { confirmedUsedHalfDays: { decrement: cost } },
            });
          } else if (existing.status === RosterEntryStatus.REQUESTED) {
            await this.ensureLeaveBalance(tx, userId, balCode, year);
            await tx.leaveBalance.update({
              where: {
                userId_leaveCode_leaveYear: {
                  userId,
                  leaveCode: balCode,
                  leaveYear: year,
                },
              },
              data: { pendingHalfDays: { decrement: cost } },
            });
          }
        }
      }

      await tx.rosterDay.delete({
        where: { userId_entryDate: { userId, entryDate } },
      });

      return { deleted: true };
    });
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  async getSettings(userId: string) {
    let [preferences, shifts] = await Promise.all([
      this.prisma.rosterPreferences.findUnique({ where: { userId } }),
      this.prisma.rosterShift.findMany({
        where: { userId, isActive: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    if (shifts.length === 0) {
      await this.seedDefaultShifts(userId);
      shifts = await this.prisma.rosterShift.findMany({
        where: { userId, isActive: true },
        orderBy: { code: 'asc' },
      });
    }

    if (!preferences) {
      preferences = await this.prisma.rosterPreferences.create({
        data: {
          userId,
          saturdayOff: true,
          sundayOff: true,
          publicHolidaysOff: true,
          defaultShiftCode: 'K123',
          monthlyPrdAllowance: 7,
          timezone: 'Asia/Phnom_Penh',
        },
      });
    }

    const currentYear = new Date().getUTCFullYear();
    const currentYearBalances = await this.prisma.leaveBalance.findMany({
      where: { userId, leaveYear: currentYear },
    });

    return {
      preferences: this.serializePreferences(preferences),
      shifts: shifts.map((s) => this.serializeShift(s)),
      leaveBalances: currentYearBalances.map((b) =>
        this.serializeLeaveBalance(b),
      ),
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const prefs = await this.prisma.rosterPreferences.upsert({
      where: { userId },
      create: {
        userId,
        saturdayOff: dto.saturdayOff ?? true,
        sundayOff: dto.sundayOff ?? true,
        publicHolidaysOff: dto.publicHolidaysOff ?? true,
        defaultShiftCode: dto.defaultShiftCode ?? 'K123',
        monthlyPrdAllowance: dto.monthlyPrdAllowance ?? 7,
        displayName: dto.displayName ?? null,
        timezone: dto.timezone ?? 'Asia/Phnom_Penh',
      },
      update: {
        ...(dto.saturdayOff !== undefined && { saturdayOff: dto.saturdayOff }),
        ...(dto.sundayOff !== undefined && { sundayOff: dto.sundayOff }),
        ...(dto.publicHolidaysOff !== undefined && {
          publicHolidaysOff: dto.publicHolidaysOff,
        }),
        ...(dto.defaultShiftCode !== undefined && {
          defaultShiftCode: dto.defaultShiftCode,
        }),
        ...(dto.monthlyPrdAllowance !== undefined && {
          monthlyPrdAllowance: dto.monthlyPrdAllowance,
        }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
    });
    return this.serializePreferences(prefs);
  }

  // ─── Shifts ───────────────────────────────────────────────────────

  async listShifts(userId: string) {
    let shifts = await this.prisma.rosterShift.findMany({
      where: { userId, isActive: true },
      orderBy: { code: 'asc' },
    });
    if (shifts.length === 0) {
      await this.seedDefaultShifts(userId);
      shifts = await this.prisma.rosterShift.findMany({
        where: { userId, isActive: true },
        orderBy: { code: 'asc' },
      });
    }
    return shifts.map((s) => this.serializeShift(s));
  }

  async createShift(userId: string, dto: CreateShiftDto) {
    const code = dto.code.toUpperCase();
    const existing = await this.prisma.rosterShift.findUnique({
      where: { userId_code: { userId, code } },
    });
    if (existing && existing.isActive) {
      throw new ConflictException(`A shift with code "${dto.code}" already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.rosterShift.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const shift = await tx.rosterShift.upsert({
        where: { userId_code: { userId, code } },
        create: {
          userId,
          code,
          startTime: dto.startTime,
          endTime: dto.endTime,
          isOvernight: dto.isOvernight ?? false,
          isDefault: dto.isDefault ?? false,
          isActive: true,
        },
        update: {
          startTime: dto.startTime,
          endTime: dto.endTime,
          isOvernight: dto.isOvernight ?? false,
          isDefault: dto.isDefault ?? false,
          isActive: true,
        },
      });
      return this.serializeShift(shift);
    });
  }

  async updateShift(userId: string, shiftId: string, dto: UpdateShiftDto) {
    const shift = await this.prisma.rosterShift.findFirst({
      where: { id: shiftId, userId },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.rosterShift.updateMany({
          where: { userId, isDefault: true, id: { not: shiftId } },
          data: { isDefault: false },
        });
      }
      const updated = await tx.rosterShift.update({
        where: { id: shiftId },
        data: {
          ...(dto.code !== undefined && { code: dto.code.toUpperCase() }),
          ...(dto.startTime !== undefined && { startTime: dto.startTime }),
          ...(dto.endTime !== undefined && { endTime: dto.endTime }),
          ...(dto.isOvernight !== undefined && { isOvernight: dto.isOvernight }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
      return this.serializeShift(updated);
    });
  }

  private async seedDefaultShifts(userId: string) {
    const defaults = [
      { code: 'K122', startTime: '08:30', endTime: '18:00', isOvernight: false, isDefault: false },
      { code: 'K123', startTime: '09:00', endTime: '18:30', isOvernight: false, isDefault: true },
      { code: 'K124', startTime: '09:30', endTime: '19:00', isOvernight: false, isDefault: false },
      { code: 'K234', startTime: '20:00', endTime: '05:30', isOvernight: true, isDefault: false },
    ];
    for (const s of defaults) {
      await this.prisma.rosterShift.upsert({
        where: { userId_code: { userId, code: s.code } },
        create: { userId, ...s, isActive: true },
        update: {},
      });
    }
  }

  // ─── Leave balances ───────────────────────────────────────────────────────

  async getLeaveBalances(userId: string) {
    const year = new Date().getUTCFullYear();
    await Promise.all([
      this.ensureLeaveBalance(this.prisma, userId, LeaveCode.AL, year),
      this.ensureLeaveBalance(this.prisma, userId, LeaveCode.PHL, year),
    ]);
    const balances = await this.prisma.leaveBalance.findMany({
      where: { userId, leaveYear: year },
    });
    return balances.map((b) => this.serializeLeaveBalance(b));
  }

  async recordLeaveAdjustment(userId: string, dto: LeaveAdjustmentDto) {
    const targetCode = balanceCodeForLeave(dto.leaveCode as LeaveCode) ?? (dto.leaveCode as LeaveCode);
    const kind = dto.kind as LeaveTransactionKind;

    return this.prisma.$transaction(async (tx) => {
      await this.ensureLeaveBalance(tx, userId, targetCode, dto.year);

      const transaction = await tx.leaveTransaction.create({
        data: {
          userId,
          leaveCode: targetCode,
          kind,
          halfDays: dto.halfDays,
          note: dto.note ?? null,
        },
      });

      const balanceField = this.balanceFieldForKind(kind);
      await tx.leaveBalance.update({
        where: {
          userId_leaveCode_leaveYear: {
            userId,
            leaveCode: targetCode,
            leaveYear: dto.year,
          },
        },
        data: { [balanceField]: { increment: dto.halfDays } },
      });

      return { id: transaction.id, recorded: true };
    });
  }

  async listLeaveTransactions(userId: string) {
    const transactions = await this.prisma.leaveTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return transactions.map((t) => ({
      id: t.id,
      leaveCode: t.leaveCode,
      kind: t.kind,
      halfDays: t.halfDays,
      rosterDayId: t.rosterDayId,
      note: t.note,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  // ─── Generate preview ─────────────────────────────────────────────────────

  async generatePreview(userId: string, dto: GenerateRosterDto) {
    const { year, month } = dto;
    this.validateYearMonth(year, month);

    const [existingDays, preferences, alBalance, phlBalance] = await Promise.all([
      this.prisma.rosterDay.findMany({
        where: {
          userId,
          entryDate: {
            gte: this.monthRange(year, month).start,
            lte: this.monthRange(year, month).end,
          },
        },
      }),
      this.prisma.rosterPreferences.findUnique({ where: { userId } }),
      this.prisma.leaveBalance.findUnique({
        where: {
          userId_leaveCode_leaveYear: { userId, leaveCode: LeaveCode.AL, leaveYear: year },
        },
      }),
      this.prisma.leaveBalance.findUnique({
        where: {
          userId_leaveCode_leaveYear: { userId, leaveCode: LeaveCode.PHL, leaveYear: year },
        },
      }),
    ]);

    const prefs = preferences ?? this.defaultPreferencesModel();
    const holidays = getCambodiaPublicHolidays(year);

    const existingMap = new Map(
      existingDays.map((d) => [this.dateToString(d.entryDate), d]),
    );

    // Calculate existing PRD used this month
    let prdUsedThisMonth = 0;
    for (const d of existingDays) {
      if (d.leaveCode === LeaveCode.PRD) prdUsedThisMonth++;
    }
    let remainingPrd = Math.max(0, prefs.monthlyPrdAllowance - prdUsedThisMonth);

    // Calculate available PHL and AL half-days
    let availablePhl = phlBalance
      ? phlBalance.openingBalanceHalfDays +
        phlBalance.earnedHalfDays +
        phlBalance.adjustmentHalfDays -
        phlBalance.confirmedUsedHalfDays -
        phlBalance.pendingHalfDays
      : 0;
    let availableAl = alBalance
      ? alBalance.openingBalanceHalfDays +
        alBalance.earnedHalfDays +
        alBalance.adjustmentHalfDays -
        alBalance.confirmedUsedHalfDays -
        alBalance.pendingHalfDays
      : 0;

    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const suggestions: Array<{
      date: string;
      shiftCode: string | null;
      leaveCode: string | null;
      status: string;
      reason: string;
    }> = [];
    const warnings: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const existing = existingMap.get(dateStr);

      // Preserve locked or confirmed or requested entries as-is
      if (
        existing &&
        (existing.isLocked ||
          existing.status === RosterEntryStatus.CONFIRMED ||
          existing.status === RosterEntryStatus.REQUESTED)
      ) {
        continue;
      }

      const date = new Date(`${dateStr}T00:00:00.000Z`);
      const dowUtc = date.getUTCDay(); // 0=Sun, 6=Sat

      const isSunday = dowUtc === 0;
      const isSaturday = dowUtc === 6;
      const isPublicHoliday = holidays.has(dateStr);

      const isPreferredOff =
        (isSunday && prefs.sundayOff) ||
        (isSaturday && prefs.saturdayOff) ||
        (isPublicHoliday && prefs.publicHolidaysOff);

      let leaveCode: string | null = null;
      let shiftCode: string | null = prefs.defaultShiftCode ?? 'K123';
      let reason = 'Scheduled working shift';

      if (isPreferredOff) {
        // Preferred off day: Allocate according to priority PRD -> PHL -> AL
        if (remainingPrd > 0) {
          leaveCode = 'PRD';
          shiftCode = null;
          reason = 'PRD monthly allowance';
          remainingPrd--;
        } else if (availablePhl >= 2) {
          leaveCode = 'PHL';
          shiftCode = null;
          reason = 'PHL leave credit';
          availablePhl -= 2;
        } else if (availableAl >= 2) {
          leaveCode = 'AL';
          shiftCode = null;
          reason = 'AL annual leave (requires confirmation)';
          availableAl -= 2;
          warnings.push(`AL suggested for ${dateStr} due to exhausted PRD/PHL balance.`);
        } else {
          shiftCode = null;
          leaveCode = null;
          reason = 'Preferred day off (insufficient balance)';
          warnings.push(`Insufficient leave balance for preferred day off on ${dateStr}.`);
        }
      }

      suggestions.push({
        date: dateStr,
        shiftCode,
        leaveCode,
        status: 'DRAFT',
        reason,
      });
    }

    return { year, month, suggestions, warnings };
  }

  // ─── Apply roster suggestions ─────────────────────────────────────────────

  async applyRosterSuggestions(
    userId: string,
    dto: { year: number; month: number; entries: ApplyRosterEntryDto[] },
  ) {
    this.validateYearMonth(dto.year, dto.month);
    let applied = 0;
    let skipped = 0;

    for (const entry of dto.entries) {
      const entryDate = this.parseDate(entry.date);
      const existing = await this.prisma.rosterDay.findUnique({
        where: { userId_entryDate: { userId, entryDate } },
      });

      if (
        existing &&
        (existing.isLocked ||
          existing.status === RosterEntryStatus.CONFIRMED ||
          existing.status === RosterEntryStatus.REQUESTED)
      ) {
        skipped++;
        continue;
      }

      const upsertDto: UpsertRosterDayDto = {
        shiftCode: entry.shiftCode,
        leaveCode: entry.leaveCode,
        status: entry.status ?? 'DRAFT',
        note: entry.note,
      };
      await this.upsertRosterDay(userId, entry.date, upsertDto);
      applied++;
    }

    return { applied, skipped };
  }

  // ─── Reset month roster ───────────────────────────────────────────────────

  async resetMonth(userId: string, year: number, month: number) {
    this.validateYearMonth(year, month);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const days = await this.prisma.rosterDay.findMany({
      where: {
        userId,
        entryDate: { gte: start, lte: end },
      },
    });

    for (const d of days) {
      const dateStr = d.entryDate.toISOString().slice(0, 10);
      await this.deleteRosterDay(userId, dateStr);
    }

    return { resetCount: days.length };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private validateYearMonth(year: number, month: number) {
    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      throw new BadRequestException('Invalid year or month');
    }
  }

  private parseDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`"${value}" is not a valid calendar date`);
    }
    return date;
  }

  private monthRange(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    return { start, end };
  }

  private dateToString(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private async ensureLeaveBalance(
    tx: Prisma.TransactionClient | PrismaService,
    userId: string,
    leaveCode: LeaveCode,
    year: number,
  ) {
    await tx.leaveBalance.upsert({
      where: {
        userId_leaveCode_leaveYear: { userId, leaveCode, leaveYear: year },
      },
      create: {
        userId,
        leaveCode,
        leaveYear: year,
        openingBalanceHalfDays: 0,
        earnedHalfDays: 0,
        adjustmentHalfDays: 0,
        confirmedUsedHalfDays: 0,
        pendingHalfDays: 0,
      },
      update: {},
    });
  }

  private balanceFieldForKind(
    kind: LeaveTransactionKind,
  ): keyof Prisma.LeaveBalanceUpdateInput {
    switch (kind) {
      case LeaveTransactionKind.OPENING_BALANCE:
        return 'openingBalanceHalfDays';
      case LeaveTransactionKind.EARNED:
        return 'earnedHalfDays';
      case LeaveTransactionKind.ADJUSTMENT:
        return 'adjustmentHalfDays';
      default:
        return 'adjustmentHalfDays';
    }
  }

  private serializeRosterDay(d: {
    id: string;
    entryDate: Date;
    shiftCode: string | null;
    leaveCode: LeaveCode | null;
    status: RosterEntryStatus;
    note: string | null;
    isLocked: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: d.id,
      date: this.dateToString(d.entryDate),
      shiftCode: d.shiftCode,
      leaveCode: d.leaveCode,
      status: d.status,
      note: d.note,
      isLocked: d.isLocked,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }

  private serializeShift(s: {
    id: string;
    code: string;
    startTime: string;
    endTime: string;
    isOvernight: boolean;
    isDefault: boolean;
    isActive: boolean;
  }) {
    return {
      id: s.id,
      code: s.code,
      startTime: s.startTime,
      endTime: s.endTime,
      isOvernight: s.isOvernight,
      isDefault: s.isDefault,
      isActive: s.isActive,
    };
  }

  private serializePreferences(p: {
    saturdayOff: boolean;
    sundayOff: boolean;
    publicHolidaysOff: boolean;
    defaultShiftCode: string | null;
    monthlyPrdAllowance: number;
    timezone: string;
    displayName: string | null;
    updatedAt: Date | null;
  }) {
    return {
      saturdayOff: p.saturdayOff,
      sundayOff: p.sundayOff,
      publicHolidaysOff: p.publicHolidaysOff,
      defaultShiftCode: p.defaultShiftCode,
      monthlyPrdAllowance: p.monthlyPrdAllowance,
      timezone: p.timezone,
      displayName: p.displayName,
      updatedAt: p.updatedAt?.toISOString() ?? null,
    };
  }

  private defaultPreferencesModel() {
    return {
      saturdayOff: true,
      sundayOff: true,
      publicHolidaysOff: true,
      defaultShiftCode: 'K123' as string | null,
      monthlyPrdAllowance: 7,
      timezone: 'Asia/Phnom_Penh',
      displayName: null as string | null,
      updatedAt: null as Date | null,
    };
  }

  private serializeLeaveBalance(b: {
    leaveCode: LeaveCode;
    leaveYear: number;
    openingBalanceHalfDays: number;
    earnedHalfDays: number;
    adjustmentHalfDays: number;
    confirmedUsedHalfDays: number;
    pendingHalfDays: number;
  }) {
    const totalHalfDays =
      b.openingBalanceHalfDays +
      b.earnedHalfDays +
      b.adjustmentHalfDays;
    const remainingHalfDays =
      totalHalfDays - b.confirmedUsedHalfDays - b.pendingHalfDays;
    return {
      leaveCode: b.leaveCode,
      year: b.leaveYear,
      openingBalanceDays: b.openingBalanceHalfDays / 2,
      earnedDays: b.earnedHalfDays / 2,
      adjustmentDays: b.adjustmentHalfDays / 2,
      confirmedUsedDays: b.confirmedUsedHalfDays / 2,
      pendingDays: b.pendingHalfDays / 2,
      totalDays: totalHalfDays / 2,
      remainingDays: remainingHalfDays / 2,
      _halfDays: {
        opening: b.openingBalanceHalfDays,
        earned: b.earnedHalfDays,
        adjustment: b.adjustmentHalfDays,
        confirmedUsed: b.confirmedUsedHalfDays,
        pending: b.pendingHalfDays,
        total: totalHalfDays,
        remaining: remainingHalfDays,
      },
    };
  }
}
