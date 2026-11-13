import { rosterGenerationPreserves, rosterPrdAllowance, rosterOverLimitWeeks, rosterWeekWorkdays, rosterWorkdayWeight } from "../../api/src/roster/roster-week.util.ts";
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

const ROSTER_DAY_COLORS = {
  PRD: { light: "#fff1f2", dark: "#3b2029" },
  PHL: { light: "#fffbeb", dark: "#352c1c" },
  AL: { light: "#faf5ff", dark: "#30233d" },
  H1: { light: "#f5f3ff", dark: "#29223f" },
  H2: { light: "#f5f3ff", dark: "#29223f" },
  shift: { light: "#ecfdf5", dark: "#18332d" },
};

/** Export uses the light palette; the calendar also supplies a matching dark palette. */
export function getRosterDayColors(day?: Pick<RosterDay, "shiftCode" | "leaveCode" | "status"> | null) {
  if (!day || day.status === "CANCELLED") return null;
  if (day.leaveCode) return ROSTER_DAY_COLORS[day.leaveCode];
  return day.shiftCode ? ROSTER_DAY_COLORS.shift : null;
}

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
  statusFlowEnabled: false,
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
 * PRD and work metrics are monthly; PHL and AL use the selected year's balance.
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
  let halfDaysCount = 0;
  let pendingRequests = 0;
  let unassignedDays = 0;

  for (let d = 1; d <= lastDay; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const entry = dateMap.get(key);

    if (!entry || entry.status === "CANCELLED" || (!entry.shiftCode && !entry.leaveCode)) {
      unassignedDays++;
      continue;
    }

    if (entry.status === "REQUESTED") {
      pendingRequests++;
    }

    if (entry.leaveCode) {
      if (entry.leaveCode === "PRD" && entry.status !== "CANCELLED") {
        prdUsed++;
      } else if (entry.leaveCode === "H1" || entry.leaveCode === "H2") {
        halfDaysCount++;
      }
    }

    // Working day count
    if (entry.leaveCode === "H1" || entry.leaveCode === "H2") {
      workingDays++;
    } else if (entry.shiftCode && entry.status !== "CANCELLED") {
      const shift = shiftsByCode.get(entry.shiftCode);
      if (shift && shift.isActive) {
        if (!entry.leaveCode) {
          workingDays++;
        }
      }
    }
  }

  const prdAllowance = rosterPrdAllowance(preferences.monthlyPrdAllowance);
  const prdRemaining = prdAllowance - prdUsed;

  const annualAl = alBalance?.leaveYear === year ? alBalance : null;
  const annualPhl = phlBalance?.leaveYear === year ? phlBalance : null;
  // The annual ledger includes confirmed leave in every month, including half-days.
  const yearDays = days.filter(
    (day) => day.entryDate.startsWith(`${year}-`) && day.status === "CONFIRMED",
  );
  const alConfirmedUsed = yearDays.reduce(
    (total, day) =>
      total +
      (balanceBucketForLeave(day.leaveCode) === "AL"
        ? leaveHalfDayCost(day.leaveCode) / 2
        : 0),
    0,
  );
  const phlConfirmedUsed = yearDays.filter(
    (day) => day.leaveCode === "PHL",
  ).length;
  const alComputed = annualAl
    ? computeLeaveBalance(annualAl)
    : { availableDays: 0, officialBalanceDays: 0 };
  const phlComputed = annualPhl
    ? computeLeaveBalance(annualPhl)
    : { availableDays: 0, officialBalanceDays: 0 };

  return {
    totalDays: lastDay,
    workingDays,
    prdUsed,
    prdAllowance,
    prdRemaining,
    phlUsed: annualPhl ? annualPhl.confirmedUsedHalfDays / 2 : phlConfirmedUsed,
    phlRemaining: phlComputed.availableDays,
    alUsed: annualAl ? annualAl.confirmedUsedHalfDays / 2 : alConfirmedUsed,
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
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
  const preserves = (date: string, entry?: RosterDay) => rosterGenerationPreserves(date, entry, preferences, holidayDates);
  const planned = new Map(existingDays
    .filter((day) => !day.entryDate.startsWith(monthPrefix) || preserves(day.entryDate, day))
    .map((day) => [day.entryDate, day]));
  const defaultShift =
    shifts.find((s) => s.code === preferences.defaultShiftCode) ||
    shifts.find((s) => s.isDefault) ||
    shifts[0];
  const defaultShiftCode = defaultShift ? defaultShift.code : "K123";

  // Count PRD already assigned
  let prdUsed = 0;
  for (const d of existingDays) {
    if (d.entryDate.startsWith(monthPrefix) && d.leaveCode === "PRD" && d.status !== "CANCELLED" && preserves(d.entryDate, d)) {
      prdUsed++;
    }
  }
  let remainingPrd = Math.max(0, rosterPrdAllowance(preferences.monthlyPrdAllowance) - prdUsed);

  let availablePhl = Math.max(0, phlAvailableHalfDays);
  let availableAl = Math.max(0, alAvailableHalfDays);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const suggestions: RosterGeneratePreview["suggestions"] = [];
  const warnings: string[] = [];
  // Reserve weekly rest before optional Saturdays/holidays can consume the monthly quota.
  let reservedSundays = preferences.sundayOff ? Array.from({ length: daysInMonth }, (_, index) => index + 1).filter((day) => {
    const key = `${monthPrefix}${String(day).padStart(2, "0")}`;
    const existing = existingMap.get(key);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0 && !preserves(key, existing);
  }).length : 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const existing = existingMap.get(dateStr);

    if (preserves(dateStr, existing)) {
      continue;
    }

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const dow = date.getUTCDay(); // 0 = Sunday, 6 = Saturday

    const isSaturday = dow === 6;
    const isSunday = dow === 0;
    const isHoliday = holidayDates.has(dateStr);
    if (isSunday && preferences.sundayOff) reservedSundays--;

    const isPreferredOff =
      (isSaturday && preferences.saturdayOff) ||
      (isSunday && preferences.sundayOff) ||
      (isHoliday && preferences.publicHolidaysOff);

    let leaveCode: LeaveCode | null = null;
    const workingShift = existing?.status === "CONFIRMED" ? existing.shiftCode : defaultShiftCode;
    let shiftCode: string | null = workingShift;
    let reason = "Scheduled working shift";

    if (isPreferredOff) {
      // Allocate according to priority: PRD -> PHL -> AL
      if (remainingPrd > 0 && (isSunday || remainingPrd > reservedSundays)) {
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
        // Saturdays and public holidays return to a normal shift when leave runs out.
        shiftCode = isSaturday || isHoliday ? workingShift : null;
        leaveCode = null;
        reason = isSaturday || isHoliday
          ? "Normal shift (no leave credit available)"
          : "Preferred day off (insufficient leave balance)";
        warnings.push(`Insufficient leave balance for preferred day off on ${dateStr}.`);
      }
    }

    if (rosterWeekWorkdays(dateStr, planned) + rosterWorkdayWeight({ shiftCode, leaveCode }) > 6 && shiftCode) {
      shiftCode = null;
      leaveCode = remainingPrd > 0 ? "PRD" : null;
      if (leaveCode) remainingPrd--;
      reason = "Weekly rest (maximum 6 workdays, Monday-Sunday)";
      warnings.push(`Weekly rest required on ${dateStr}; no unavailable AL or PHL was used.`);
    }
    planned.set(dateStr, { entryDate: dateStr, shiftCode, leaveCode, status: "DRAFT", isLocked: false } as RosterDay);
    if (existing?.status === "CONFIRMED" && existing.shiftCode === shiftCode && existing.leaveCode === leaveCode) continue;
    suggestions.push({
      entryDate: dateStr,
      shiftCode,
      leaveCode,
      reason,
    });
  }

  const overLimit = rosterOverLimitWeeks(year, month, planned);
  for (const week of overLimit) warnings.push(`Existing protected entries exceed 6 workdays in the week of ${week}. Review them before applying.`);
  return { suggestions, warnings, blocked: overLimit.length > 0 };
}
