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
  type UpdateRosterStatusesDto,
} from './roster.dto';
import { getCambodiaPublicHolidays } from './cambodia-holidays.util';
import { rosterGenerationPreserves, rosterDayViolation, rosterPrdAllowance, rosterMonthPrdCount, rosterMonthWeekRange, rosterOverLimitWeeks, rosterWeekWorkdays, rosterWorkdayWeight, type WeeklyWorkEntry } from './roster-week.util';

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
    return this.prisma.$transaction((tx) => this.upsertRosterDayInTransaction(tx, userId, date, dto), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  }

  // Both individual edits and bulk changes must use the same reversal and debit rules.
  private async upsertRosterDayInTransaction(tx: Prisma.TransactionClient, userId: string, date: string, dto: UpsertRosterDayDto, preferences?: { statusFlowEnabled: boolean; monthlyPrdAllowance: number }) {
    const entryDate = this.parseDate(date);
    const prefs = preferences ?? await tx.rosterPreferences.findUnique({ where: { userId }, select: { statusFlowEnabled: true, monthlyPrdAllowance: true } });
    const flowEnabled = prefs?.statusFlowEnabled ?? false;
    const newLeaveCode = dto.leaveCode ? (dto.leaveCode as LeaveCode) : null;
    const newStatus = !flowEnabled ? RosterEntryStatus.CONFIRMED : dto.status
      ? (dto.status as RosterEntryStatus)
      : undefined;

    const existing = await tx.rosterDay.findUnique({
      where: { userId_entryDate: { userId, entryDate } },
    });

    const year = entryDate.getUTCFullYear();
    const candidateLeave = dto.leaveCode !== undefined ? newLeaveCode : existing?.leaveCode ?? null;
    const isFlexibleHalfDay = candidateLeave === LeaveCode.H1 || candidateLeave === LeaveCode.H2;
    const effective = { shiftCode: isFlexibleHalfDay ? null : dto.shiftCode !== undefined ? dto.shiftCode : existing?.shiftCode ?? null, leaveCode: candidateLeave, status: newStatus ?? existing?.status ?? RosterEntryStatus.DRAFT };
    const range = rosterMonthWeekRange(year, entryDate.getUTCMonth() + 1);
    const relatedDays = await tx.rosterDay.findMany({ where: { userId, entryDate: { gte: range.start, lte: range.end } } });
    const available = { AL: 0, PHL: 0 };
    const bucket = balanceCodeForLeave(candidateLeave);
    if (bucket === LeaveCode.AL || bucket === LeaveCode.PHL) {
      const balance = await tx.leaveBalance.findUnique({ where: { userId_leaveCode_leaveYear: { userId, leaveCode: bucket, leaveYear: year } } });
      available[bucket] = balance ? balance.openingBalanceHalfDays + balance.earnedHalfDays + balance.adjustmentHalfDays - balance.confirmedUsedHalfDays - balance.pendingHalfDays : 0;
    }
    const violation = rosterDayViolation(date, effective, new Map(relatedDays.map((day) => [this.dateToString(day.entryDate), day])), available, prefs?.monthlyPrdAllowance);
    if (violation) throw new BadRequestException(violation);

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
        shiftCode: effective.shiftCode,
        leaveCode: newLeaveCode,
        status: newStatus ?? RosterEntryStatus.DRAFT,
        note: dto.note ?? null,
        isLocked: dto.isLocked ?? false,
      },
      update: {
        ...((dto.shiftCode !== undefined || isFlexibleHalfDay) && { shiftCode: effective.shiftCode }),
        ...(dto.leaveCode !== undefined && { leaveCode: newLeaveCode }),
        ...(newStatus !== undefined && { status: newStatus }),
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
  }

  async updateStatuses(userId: string, dto: UpdateRosterStatusesDto) {
    this.validateYearMonth(dto.year, dto.month);
    const prefix = `${dto.year}-${String(dto.month).padStart(2, '0')}-`;
    const dates = [...new Set(dto.dates)];
    if (!dates.length || dates.length > 31 || !['DRAFT', 'REQUESTED', 'CONFIRMED', 'CANCELLED'].includes(dto.status)) throw new BadRequestException('Invalid bulk status update');
    const parsed = dates.map((date) => {
      const value = this.parseDate(date);
      if (!date.startsWith(prefix)) throw new BadRequestException('All dates must belong to the selected month');
      return value;
    });
    return this.prisma.$transaction(async (tx) => {
      const days = await tx.rosterDay.findMany({ where: { userId, entryDate: { in: parsed } } });
      const preferences = await tx.rosterPreferences.findUnique({ where: { userId }, select: { statusFlowEnabled: true, monthlyPrdAllowance: true } });
      const status = preferences?.statusFlowEnabled ? dto.status : RosterEntryStatus.CONFIRMED;
      const editable = days.filter((day) => !day.isLocked && day.status !== status);
      for (const day of editable) {
        await this.upsertRosterDayInTransaction(tx, userId, this.dateToString(day.entryDate), { status }, preferences ?? undefined);
      }
      return { updated: editable.length, skippedLocked: days.filter((day) => day.isLocked).length, skippedMissing: dates.length - days.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  }

  // ─── Delete draft roster day ──────────────────────────────────────────────

  async deleteRosterDay(userId: string, date: string) {
    const entryDate = this.parseDate(date);
    const year = entryDate.getUTCFullYear();

    return this.prisma.$transaction(async (tx) => {
      // Read and reverse the same version, so a concurrent edit cannot credit the wrong leave bucket.
      const existing = await tx.rosterDay.findUnique({ where: { userId_entryDate: { userId, entryDate } } });
      if (!existing) throw new NotFoundException('Roster day not found');
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  async getSettings(userId: string, year = new Date().getUTCFullYear()) {
    this.validateYearMonth(year, 1);
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

    const yearBalances = await this.prisma.leaveBalance.findMany({
      where: { userId, leaveYear: year },
    });

    return {
      preferences: this.serializePreferences(preferences),
      shifts: shifts.map((s) => this.serializeShift(s)),
      leaveBalances: yearBalances.map((b) =>
        this.serializeLeaveBalance(b),
      ),
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    if (dto.monthlyPrdAllowance !== undefined && (!Number.isInteger(dto.monthlyPrdAllowance) || dto.monthlyPrdAllowance < 0 || dto.monthlyPrdAllowance > 7)) throw new BadRequestException('PRD allowance must be between 0 and 7 days.');
    const prefs = await this.prisma.rosterPreferences.upsert({
      where: { userId },
      create: {
        userId,
        saturdayOff: dto.saturdayOff ?? true,
        sundayOff: dto.sundayOff ?? true,
        publicHolidaysOff: dto.publicHolidaysOff ?? true,
        defaultShiftCode: dto.defaultShiftCode ?? 'K123',
        monthlyPrdAllowance: dto.monthlyPrdAllowance ?? 7,
        statusFlowEnabled: dto.statusFlowEnabled ?? false,
        displayName: dto.displayName ?? null,
        timezone: dto.timezone ?? 'Asia/Phnom_Penh',
      },
      update: {
        ...(dto.statusFlowEnabled !== undefined && { statusFlowEnabled: dto.statusFlowEnabled }),
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

  async getLeaveBalances(userId: string, year = new Date().getUTCFullYear()) {
    this.validateYearMonth(year, 1);
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

    const weekRange = rosterMonthWeekRange(year, month);
    const [existingDays, preferences, alBalance, phlBalance] = await Promise.all([
      this.prisma.rosterDay.findMany({
        where: {
          userId,
          entryDate: {
            gte: weekRange.start,
            lte: weekRange.end,
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
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
    const preserves = (date: string, day?: WeeklyWorkEntry & { isLocked?: boolean }) => rosterGenerationPreserves(date, day, prefs, holidays);
    const planned = new Map<string, WeeklyWorkEntry>([...existingMap]
      .filter(([date, day]) => !date.startsWith(monthPrefix) || preserves(date, day)));

    // Calculate existing PRD used this month
    let prdUsedThisMonth = 0;
    for (const d of existingDays) {
      if (this.dateToString(d.entryDate).startsWith(monthPrefix) && d.leaveCode === LeaveCode.PRD && d.status !== 'CANCELLED' && preserves(this.dateToString(d.entryDate), d)) prdUsedThisMonth++;
    }
    let remainingPrd = Math.max(0, rosterPrdAllowance(prefs.monthlyPrdAllowance) - prdUsedThisMonth);

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
    let reservedSundays = prefs.sundayOff ? Array.from({ length: daysInMonth }, (_, index) => index + 1).filter((day) => {
      const key = `${monthPrefix}${String(day).padStart(2, '0')}`;
      const existing = existingMap.get(key);
      return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0 && !preserves(key, existing);
    }).length : 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const existing = existingMap.get(dateStr);

      if (preserves(dateStr, existing)) {
        continue;
      }

      const date = new Date(`${dateStr}T00:00:00.000Z`);
      const dowUtc = date.getUTCDay(); // 0=Sun, 6=Sat

      const isSunday = dowUtc === 0;
      const isSaturday = dowUtc === 6;
      const isPublicHoliday = holidays.has(dateStr);
      if (isSunday && prefs.sundayOff) reservedSundays--;

      const isPreferredOff =
        (isSunday && prefs.sundayOff) ||
        isSaturday ||
        (isPublicHoliday && prefs.publicHolidaysOff);

      let leaveCode: string | null = null;
      const workingShift = existing?.status === 'CONFIRMED' ? existing.shiftCode : prefs.defaultShiftCode ?? 'K123';
      let shiftCode: string | null = workingShift;
      let reason = 'Scheduled working shift';

      if (isPreferredOff) {
        // Preferred off day: Allocate according to priority PRD -> PHL -> AL
        if (remainingPrd > 0 && (isSunday || remainingPrd > reservedSundays)) {
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
          // Reserve Sundays first; other preferred off days need an available leave credit.
          shiftCode = isSaturday || isPublicHoliday ? workingShift : null;
          leaveCode = null;
          reason = isSaturday || isPublicHoliday
            ? 'Normal shift (no leave credit available)'
            : 'Preferred day off (insufficient balance)';
          warnings.push(`Insufficient leave balance for preferred day off on ${dateStr}.`);
        }
      }

      if (shiftCode && rosterWeekWorkdays(dateStr, planned) + rosterWorkdayWeight({ shiftCode, leaveCode }) > 6) {
        shiftCode = null;
        leaveCode = remainingPrd > 0 ? 'PRD' : null;
        if (leaveCode) remainingPrd--;
        reason = 'Weekly rest (maximum 6 workdays, Monday-Sunday)';
        warnings.push(`Weekly rest required on ${dateStr}; no unavailable AL or PHL was used.`);
      }
      planned.set(dateStr, { shiftCode, leaveCode, status: 'DRAFT' });
      if (existing?.status === 'CONFIRMED' && existing.shiftCode === shiftCode && existing.leaveCode === leaveCode) continue;
      suggestions.push({
        date: dateStr,
        shiftCode,
        leaveCode,
        status: 'DRAFT',
        reason,
      });
    }

    const overLimit = rosterOverLimitWeeks(year, month, planned);
    for (const week of overLimit) warnings.push(`Existing protected entries exceed 6 workdays in the week of ${week}. Review them before applying.`);
    return { year, month, suggestions, warnings, blocked: overLimit.length > 0 };
  }

  // ─── Apply roster suggestions ─────────────────────────────────────────────

  async applyRosterSuggestions(
    userId: string,
    dto: { year: number; month: number; entries: ApplyRosterEntryDto[] },
  ) {
    this.validateYearMonth(dto.year, dto.month);
    const prefix = `${dto.year}-${String(dto.month).padStart(2, '0')}-`;
    if (dto.entries.length > 31 || new Set(dto.entries.map((entry) => entry.date)).size !== dto.entries.length) {
      throw new BadRequestException('Generated dates must be unique and limited to one month');
    }
    for (const entry of dto.entries) {
      this.parseDate(entry.date);
      if (!entry.date.startsWith(prefix)) throw new BadRequestException('Generated dates must belong to the selected month');
    }
    // Recheck credits and weekly limits in the same transaction that confirms assignments.
    return this.prisma.$transaction(async (tx) => {
      const range = rosterMonthWeekRange(dto.year, dto.month);
      const [currentDays, preferences, balances] = await Promise.all([
        tx.rosterDay.findMany({ where: { userId, entryDate: { gte: range.start, lte: range.end } } }),
        tx.rosterPreferences.findUnique({ where: { userId } }),
        tx.leaveBalance.findMany({ where: { userId, leaveYear: dto.year } }),
      ]);
      const currentMap = new Map(currentDays.map((day) => [this.dateToString(day.entryDate), day]));
      const planned = new Map<string, WeeklyWorkEntry>(currentMap);
      const editable: ApplyRosterEntryDto[] = [];
      const required = { AL: 0, PHL: 0 };
      const holidays = getCambodiaPublicHolidays(dto.year);
      for (const entry of dto.entries) {
        const current = currentMap.get(entry.date);
        if (rosterGenerationPreserves(entry.date, current, preferences ?? this.defaultPreferencesModel(), holidays)) continue;
        planned.set(entry.date, entry);
        editable.push(entry);
        const code = balanceCodeForLeave(entry.leaveCode as LeaveCode);
        if (code === LeaveCode.AL || code === LeaveCode.PHL) required[code] += halfDayCostForLeave(entry.leaveCode as LeaveCode);
      }
      if (rosterOverLimitWeeks(dto.year, dto.month, planned).length) {
        throw new BadRequestException('Roster exceeds 6 working days in a Monday-Sunday week. Review existing entries first.');
      }
      if (rosterMonthPrdCount(`${prefix}01`, planned) > rosterPrdAllowance(preferences?.monthlyPrdAllowance)) throw new BadRequestException('PRD cannot exceed the monthly allowance (maximum 7 days).');
      for (const code of [LeaveCode.AL, LeaveCode.PHL] as const) {
        const balance = balances.find((item) => item.leaveCode === code);
        const available = balance ? balance.openingBalanceHalfDays + balance.earnedHalfDays + balance.adjustmentHalfDays - balance.confirmedUsedHalfDays - balance.pendingHalfDays : 0;
        if (required[code] > Math.max(0, available)) throw new BadRequestException('Leave credits changed. Regenerate the roster before applying.');
      }
      for (const entry of editable) {
        await this.upsertRosterDayInTransaction(tx, userId, entry.date, { shiftCode: entry.shiftCode, leaveCode: entry.leaveCode, status: entry.status ?? 'DRAFT', note: entry.note }, preferences ?? undefined);
      }
      return { applied: editable.length, skipped: dto.entries.length - editable.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
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
    statusFlowEnabled?: boolean;
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
      statusFlowEnabled: p.statusFlowEnabled ?? false,
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
      statusFlowEnabled: false,
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
