import type {
  LeaveBalance,
  LeaveCode,
  MonthlyRosterSummary,
  RosterDay,
  RosterEntryStatus,
  RosterGeneratePreview,
  RosterPreferences,
  RosterShift,
} from "../types/roster";

export const DEFAULT_SHIFTS: RosterShift[] = [
  {
    id: "shift-k122",
    code: "K122",
    startTime: "08:30",
    endTime: "18:00",
    isOvernight: false,
    isDefault: false,
    isActive: true,
  },
  {
    id: "shift-k123",
    code: "K123",
    startTime: "09:00",
    endTime: "18:30",
    isOvernight: false,
    isDefault: true,
    isActive: true,
  },
  {
    id: "shift-k124",
    code: "K124",
    startTime: "09:30",
    endTime: "19:00",
    isOvernight: false,
    isDefault: false,
    isActive: true,
  },
  {
    id: "shift-k234",
    code: "K234",
    startTime: "20:00",
    endTime: "05:30",
    isOvernight: true,
    isDefault: false,
    isActive: true,
  },
];

export const DEFAULT_PREFERENCES: RosterPreferences = {
  saturdayOff: true,
  sundayOff: true,
  publicHolidaysOff: true,
  defaultShiftCode: "K123",
  monthlyPrdAllowance: 7,
  timezone: "Asia/Phnom_Penh",
  displayName: null,
  leavePriority: ["PRD", "PHL", "AL"],
};

/**
 * Parses "HH:MM" string to minutes from midnight.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calculates working hours for a shift, properly handling overnight shifts.
 */
export function calculateShiftHours(
  startTime: string,
  endTime: string,
  isOvernight?: boolean,
): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);

  if (isOvernight || end <= start) {
    end += 24 * 60;
  }
  const diffMinutes = Math.max(0, end - start);
  return Number((diffMinutes / 60).toFixed(1));
}

/**
 * Calculates effective working hours for a day entry, factoring in half-day leaves (H1/H2).
 */
export function calculateDayWorkingHours(
  shift: RosterShift | null | undefined,
  leaveCode: LeaveCode | null | undefined,
): number {
  if (!shift || !shift.startTime || !shift.endTime) return 0;
  if (leaveCode === "PRD" || leaveCode === "PHL" || leaveCode === "AL") return 0;

  const fullHours = calculateShiftHours(
    shift.startTime,
    shift.endTime,
    shift.isOvernight,
  );
  if (leaveCode === "H1" || leaveCode === "H2") {
    return Number((fullHours / 2).toFixed(2));
  }
  return fullHours;
}

/**
 * Identifies which balance bucket (AL or PHL) is affected by a given leave code.
 * AL, H1, H2 -> AL.
 * PHL -> PHL.
 * PRD -> null (monthly allowance).
 */
export function balanceBucketForLeave(
  code: LeaveCode | null | undefined,
): "AL" | "PHL" | null {
  if (!code) return null;
  if (code === "AL" || code === "H1" || code === "H2") return "AL";
  if (code === "PHL") return "PHL";
  return null;
}

/**
 * Returns cost in integer half-days (2 half-days = 1 full day, 1 half-day = 0.5 day).
 */
export function leaveHalfDayCost(code: LeaveCode | null | undefined): number {
  if (!code) return 0;
  if (code === "H1" || code === "H2") return 1;
  return 2;
}

/**
 * Computes leave balance totals and availability safely with integer arithmetic.
 */
export function computeLeaveBalance(b: {
  openingBalanceHalfDays: number;
  earnedHalfDays: number;
  adjustmentHalfDays: number;
  confirmedUsedHalfDays: number;
  pendingHalfDays: number;
}): {
  totalHalfDays: number;
  totalDays: number;
  availableHalfDays: number;
  availableDays: number;
  officialBalanceHalfDays: number;
  officialBalanceDays: number;
} {
  const totalHalfDays =
    (b.openingBalanceHalfDays || 0) +
    (b.earnedHalfDays || 0) +
    (b.adjustmentHalfDays || 0);
  const confirmedUsed = b.confirmedUsedHalfDays || 0;
  const pending = b.pendingHalfDays || 0;

  const availableHalfDays = totalHalfDays - confirmedUsed - pending;
  const officialBalanceHalfDays = totalHalfDays - confirmedUsed;

  return {
    totalHalfDays,
    totalDays: totalHalfDays / 2,
    availableHalfDays,
    availableDays: availableHalfDays / 2,
    officialBalanceHalfDays,
    officialBalanceDays: officialBalanceHalfDays / 2,
  };
}

/**
 * Computes monthly summary for a given month's roster days.
 */
export function computeMonthlyRosterSummary(
  year: number,
  month: number,
  days: RosterDay[],
  preferences: RosterPreferences,
  shiftsByCode: Map<string, RosterShift>,
  alBalance?: LeaveBalance | null,
  phlBalance?: LeaveBalance | null,
): MonthlyRosterSummary {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dateMap = new Map<string, RosterDay>();
  for (const d of days) {
    dateMap.set(d.entryDate, d);
  }

  let workingDays = 0;
  let prdUsed = 0;
  let phlConfirmedUsed = 0;
  let alConfirmedUsed = 0; // in full days
  let halfDaysCount = 0;
  let pendingRequests = 0;
  let unassignedDays = 0;

  for (let d = 1; d <= lastDay; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const entry = dateMap.get(key);

    if (!entry) {
      unassignedDays++;
      continue;
    }

    if (entry.status === "REQUESTED") {
      pendingRequests++;
    }

    if (entry.leaveCode) {
      if (entry.leaveCode === "PRD" && entry.status !== "CANCELLED") {
        prdUsed++;
      } else if (entry.leaveCode === "PHL") {
        if (entry.status === "CONFIRMED") phlConfirmedUsed++;
      } else if (entry.leaveCode === "AL") {
        if (entry.status === "CONFIRMED") alConfirmedUsed++;
      } else if (entry.leaveCode === "H1" || entry.leaveCode === "H2") {
        halfDaysCount++;
        if (entry.status === "CONFIRMED") alConfirmedUsed += 0.5;
      }
    }

    // Working day count
    if (entry.shiftCode && entry.status !== "CANCELLED") {
      const shift = shiftsByCode.get(entry.shiftCode);
      if (shift && shift.isActive) {
        if (!entry.leaveCode || entry.leaveCode === "H1" || entry.leaveCode === "H2") {
          workingDays++;
        }
      }
    }
  }

  const prdAllowance = preferences.monthlyPrdAllowance ?? 7;
  const prdRemaining = prdAllowance - prdUsed;

  const alComputed = alBalance
    ? computeLeaveBalance(alBalance)
    : { availableDays: 0, officialBalanceDays: 0 };
  const phlComputed = phlBalance
    ? computeLeaveBalance(phlBalance)
    : { availableDays: 0, officialBalanceDays: 0 };

  return {
    totalDays: lastDay,
    workingDays,
    prdUsed,
    prdAllowance,
    prdRemaining,
    phlUsed: phlConfirmedUsed,
    phlRemaining: phlComputed.availableDays,
    alUsed: alConfirmedUsed,
    alRemaining: alComputed.availableDays,
    halfDaysCount,
    pendingRequests,
    unassignedDays,
  };
}

/**
 * Pure deterministic smart roster generator.
 */
export function generateSmartRoster(options: {
  year: number;
  month: number;
  preferences: RosterPreferences;
  shifts: RosterShift[];
  existingDays?: RosterDay[];
  holidayDates?: Set<string> | Iterable<string>;
  alAvailableHalfDays?: number;
  phlAvailableHalfDays?: number;
}): RosterGeneratePreview {
  const {
    year,
    month,
    preferences,
    shifts,
    alAvailableHalfDays = 0,
    phlAvailableHalfDays = 0,
  } = options;

  const existingDays = options.existingDays ?? [];
  const holidayDates =
    options.holidayDates instanceof Set
      ? options.holidayDates
      : new Set(options.holidayDates ?? []);

  const existingMap = new Map(existingDays.map((d) => [d.entryDate, d]));
  const defaultShift =
    shifts.find((s) => s.code === preferences.defaultShiftCode) ||
    shifts.find((s) => s.isDefault) ||
    shifts[0];
  const defaultShiftCode = defaultShift ? defaultShift.code : "K123";

  // Count PRD already assigned
  let prdUsed = 0;
  for (const d of existingDays) {
    if (d.leaveCode === "PRD" && d.status !== "CANCELLED") {
      prdUsed++;
    }
  }
  let remainingPrd = Math.max(0, (preferences.monthlyPrdAllowance ?? 7) - prdUsed);

  let availablePhl = Math.max(0, phlAvailableHalfDays);
  let availableAl = Math.max(0, alAvailableHalfDays);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const suggestions: RosterGeneratePreview["suggestions"] = [];
  const warnings: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const existing = existingMap.get(dateStr);

    // Strictly preserve locked, confirmed, or requested entries
    if (
      existing &&
      (existing.isLocked ||
        existing.status === "CONFIRMED" ||
        existing.status === "REQUESTED")
    ) {
      continue;
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const dow = date.getUTCDay(); // 0 = Sunday, 6 = Saturday

    const isSaturday = dow === 6;
    const isSunday = dow === 0;
    const isHoliday = holidayDates.has(dateStr);

    const isPreferredOff =
      (isSaturday && preferences.saturdayOff) ||
      (isSunday && preferences.sundayOff) ||
      (isHoliday && preferences.publicHolidaysOff);

    let leaveCode: LeaveCode | null = null;
    let shiftCode: string | null = defaultShiftCode;
    let reason = "Scheduled working shift";

    if (isPreferredOff) {
      // Allocate according to priority: PRD -> PHL -> AL
      if (remainingPrd > 0) {
        leaveCode = "PRD";
        shiftCode = null;
        reason = "PRD monthly allowance";
        remainingPrd--;
      } else if (availablePhl >= 2) {
        leaveCode = "PHL";
        shiftCode = null;
        reason = "PHL leave credit";
        availablePhl -= 2;
      } else if (availableAl >= 2) {
        leaveCode = "AL";
        shiftCode = null;
        reason = "AL annual leave (pending confirmation)";
        availableAl -= 2;
        warnings.push(`AL suggested for ${dateStr} due to exhausted PRD/PHL.`);
      } else {
        shiftCode = null;
        leaveCode = null;
        reason = "Preferred day off (insufficient leave balance)";
        warnings.push(`Insufficient leave balance for preferred day off on ${dateStr}.`);
      }
    }

    suggestions.push({
      entryDate: dateStr,
      shiftCode,
      leaveCode,
      reason,
    });
  }

  return { suggestions, warnings };
}
