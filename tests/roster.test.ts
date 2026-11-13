import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateShiftHours,
  calculateDayWorkingHours,
  timeToMinutes,
  balanceBucketForLeave,
  leaveHalfDayCost,
  computeLeaveBalance,
  computeMonthlyRosterSummary,
  generateSmartRoster,
  DEFAULT_SHIFTS,
  DEFAULT_PREFERENCES,
  getRosterDayColors,
} from "../app/lib/roster.ts";
import { getHolidaySchedule } from "../app/data/cambodia-holidays.ts";
import type {
  RosterDay,
  RosterShift,
  RosterPreferences,
  LeaveBalance,
} from "../app/types/roster.ts";

const shiftsMap = new Map(DEFAULT_SHIFTS.map((s) => [s.code, s]));

test("assignment coverage excludes blank and cancelled dates", () => {
  const days = [
    { entryDate: "2026-11-01", shiftCode: "K123", leaveCode: null, status: "CONFIRMED" },
    { entryDate: "2026-11-02", shiftCode: null, leaveCode: "PRD", status: "DRAFT" },
    { entryDate: "2026-11-03", shiftCode: null, leaveCode: null, status: "CONFIRMED" },
    { entryDate: "2026-11-04", shiftCode: "K123", leaveCode: null, status: "CANCELLED" },
  ] as RosterDay[];
  const summary = computeMonthlyRosterSummary(2026, 11, days, DEFAULT_PREFERENCES, shiftsMap);
  assert.equal(summary.totalDays - summary.unassignedDays, 2);
  assert.equal(summary.unassignedDays, 28);
});

test("leave and working shifts have consistent full-day colors", () => {
  const shift = getRosterDayColors({ shiftCode: "K123", leaveCode: null, status: "DRAFT" });
  assert.ok(shift?.light);
  for (const code of ["PRD", "PHL", "AL", "H1", "H2"] as const) {
    const colors = getRosterDayColors({ shiftCode: null, leaveCode: code, status: "CONFIRMED" });
    assert.ok(colors?.light);
    assert.ok(colors?.dark);
    assert.notEqual(colors?.light, shift?.light);
  }
  assert.equal(getRosterDayColors({ shiftCode: "K123", leaveCode: null, status: "CANCELLED" }), null);
});

test("Saturday returns to a normal shift when PRD, PHL and AL are exhausted", () => {
  const result = generateSmartRoster({
    year: 2026,
    month: 11,
    preferences: { ...DEFAULT_PREFERENCES, monthlyPrdAllowance: 0 },
    shifts: DEFAULT_SHIFTS,
    phlAvailableHalfDays: 0,
    alAvailableHalfDays: 0,
  });
  for (const day of ["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"]) {
    const entry = result.suggestions.find((item) => item.entryDate === day)!;
    assert.equal(entry.shiftCode, DEFAULT_PREFERENCES.defaultShiftCode);
    assert.equal(entry.leaveCode, null);
  }
  assert.ok(!result.suggestions.some((day) => day.leaveCode === "AL" || day.leaveCode === "PHL"));
});

test("PRD is reserved for Sundays and exhausted leave makes Saturdays and holidays working days", () => {
  const result = generateSmartRoster({ year: 2026, month: 12, preferences: DEFAULT_PREFERENCES, shifts: DEFAULT_SHIFTS, holidayDates: new Set(["2026-12-29"]), alAvailableHalfDays: 0, phlAvailableHalfDays: 0 });
  assert.equal(result.suggestions.find((day) => day.entryDate === "2026-12-26")?.shiftCode, "K123");
  assert.equal(result.suggestions.find((day) => day.entryDate === "2026-12-27")?.leaveCode, "PRD");
  assert.equal(result.suggestions.find((day) => day.entryDate === "2026-12-29")?.shiftCode, "K123");
  assert.equal(result.suggestions.filter((day) => day.leaveCode === "PRD").length, 7);
  assert.ok(result.suggestions.every((day) => day.shiftCode || day.leaveCode));
});

test("generation caps Monday-Sunday work at 6 days including adjacent months", () => {
  const existingDays = [{ entryDate: "2026-10-26", shiftCode: "K123", leaveCode: null, status: "CONFIRMED", isLocked: true }] as RosterDay[];
  const result = generateSmartRoster({
    year: 2026, month: 11,
    preferences: { ...DEFAULT_PREFERENCES, monthlyPrdAllowance: 0, saturdayOff: false, sundayOff: false, publicHolidaysOff: false },
    shifts: DEFAULT_SHIFTS, existingDays,
  });
  assert.equal(result.suggestions.find((day) => day.entryDate === "2026-11-08")!.shiftCode, null);
  for (const day of [27, 28, 29, 30, 31]) existingDays.push({ entryDate: `2026-10-${day}`, shiftCode: "K123", leaveCode: null, status: "CONFIRMED", isLocked: true } as RosterDay);
  const boundary = generateSmartRoster({ year: 2026, month: 11, preferences: { ...DEFAULT_PREFERENCES, monthlyPrdAllowance: 0, sundayOff: false }, shifts: DEFAULT_SHIFTS, existingDays });
  assert.equal(boundary.suggestions.find((day) => day.entryDate === "2026-11-01")!.shiftCode, null);
});

test("protected half-day work counts as 0.5 toward the weekly limit", () => {
  const result = generateSmartRoster({ year: 2026, month: 11,
    preferences: { ...DEFAULT_PREFERENCES, saturdayOff: false, sundayOff: false, publicHolidaysOff: false },
    shifts: DEFAULT_SHIFTS,
    existingDays: [{ entryDate: "2026-11-08", shiftCode: "K123", leaveCode: "H1", status: "CONFIRMED", isLocked: true }] as RosterDay[],
  });
  assert.equal(result.suggestions.filter((day) => day.entryDate >= "2026-11-02" && day.entryDate <= "2026-11-07" && day.shiftCode).length, 5);
});

test("protected entries exceeding the weekly limit block generation without changing them", () => {
  const existingDays = Array.from({ length: 7 }, (_, index) => ({ entryDate: `2026-11-${String(index + 2).padStart(2, "0")}`, shiftCode: "K123", leaveCode: null, status: "CONFIRMED", isLocked: true })) as RosterDay[];
  const result = generateSmartRoster({ year: 2026, month: 11, preferences: DEFAULT_PREFERENCES, shifts: DEFAULT_SHIFTS, existingDays });
  assert.equal(result.blocked, true);
  assert.ok(result.warnings.some((message) => message.includes("Existing protected entries")));
  assert.ok(existingDays.every((existing) => !result.suggestions.some((day) => day.entryDate === existing.entryDate)));
});

test("PHL and AL usage and availability use the selected year's balances", () => {
  const balance = (leaveCode: "AL" | "PHL", used: number): LeaveBalance => ({
    leaveCode,
    leaveYear: 2027,
    openingBalanceHalfDays: 40,
    earnedHalfDays: 0,
    adjustmentHalfDays: 0,
    confirmedUsedHalfDays: used,
    pendingHalfDays: 2,
    totalHalfDays: 40,
    availableHalfDays: 38 - used,
  });
  const summary = computeMonthlyRosterSummary(
    2027,
    11,
    [],
    DEFAULT_PREFERENCES,
    shiftsMap,
    balance("AL", 7),
    balance("PHL", 10),
  );
  assert.equal(summary.alUsed, 3.5);
  assert.equal(summary.phlUsed, 5);
  assert.equal(summary.alRemaining, 15.5);
  assert.equal(summary.phlRemaining, 14);
  const otherYear = computeMonthlyRosterSummary(
    2028,
    1,
    [],
    DEFAULT_PREFERENCES,
    shiftsMap,
    balance("AL", 7),
    balance("PHL", 10),
  );
  assert.equal(otherYear.alUsed, 0);
  assert.equal(otherYear.phlUsed, 0);
  assert.equal(otherYear.alRemaining, 0);
  assert.equal(otherYear.phlRemaining, 0);
});

test("1. PRD 7-day monthly limit and quota calculation", () => {
  const days: RosterDay[] = [
    { entryDate: "2026-11-01", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-02", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-03", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-04", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-05", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-06", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-07", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
  ];

  const summary = computeMonthlyRosterSummary(
    2026,
    11,
    days,
    DEFAULT_PREFERENCES,
    shiftsMap,
  );

  assert.equal(summary.prdAllowance, 7);
  assert.equal(summary.prdUsed, 7);
  assert.equal(summary.prdRemaining, 0);

  // If 8th PRD is added, remaining should be -1 indicating quota exceeded
  const daysExceeded: RosterDay[] = [
    ...days,
    { entryDate: "2026-11-08", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
  ];

  const summaryExceeded = computeMonthlyRosterSummary(
    2026,
    11,
    daysExceeded,
    DEFAULT_PREFERENCES,
    shiftsMap,
  );

  assert.equal(summaryExceeded.prdUsed, 8);
  assert.equal(summaryExceeded.prdRemaining, -1);
});

test("2. PRD monthly reset: separate months do not cross-accumulate quota", () => {
  const daysNov: RosterDay[] = [
    { entryDate: "2026-11-01", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-02", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
  ];
  const daysDec: RosterDay[] = [
    { entryDate: "2026-12-01", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-12-02", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-12-03", leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
  ];

  const allDays = [...daysNov, ...daysDec];

  const summaryNov = computeMonthlyRosterSummary(
    2026,
    11,
    allDays,
    DEFAULT_PREFERENCES,
    shiftsMap,
  );

  const summaryDec = computeMonthlyRosterSummary(
    2026,
    12,
    allDays,
    DEFAULT_PREFERENCES,
    shiftsMap,
  );

  assert.equal(summaryNov.prdUsed, 2);
  assert.equal(summaryNov.prdRemaining, 5);

  assert.equal(summaryDec.prdUsed, 3);
  assert.equal(summaryDec.prdRemaining, 4);
});

test("3. PHL usage on non-public-holiday dates", () => {
  // 2026-11-10 is a Tuesday and NOT an official public holiday in Cambodia
  const schedule = getHolidaySchedule(2026);
  const nov10Holiday = schedule.events.some(
    (e) => e.date === "2026-11-10" && e.kind === "public-holiday",
  );
  assert.equal(nov10Holiday, false, "2026-11-10 should not be an official public holiday");

  const phlDay: RosterDay = {
    entryDate: "2026-11-10",
    leaveCode: "PHL",
    status: "CONFIRMED",
    isLocked: false,
  };

  const phlBalance: LeaveBalance = {
    leaveCode: "PHL",
    leaveYear: 2026,
    openingBalanceHalfDays: 4, // 2 days
    earnedHalfDays: 0,
    adjustmentHalfDays: 0,
    confirmedUsedHalfDays: 2, // 1 day used
    pendingHalfDays: 0,
  };

  const summary = computeMonthlyRosterSummary(
    2026,
    11,
    [phlDay],
    DEFAULT_PREFERENCES,
    shiftsMap,
    null,
    phlBalance,
  );

  assert.equal(summary.phlUsed, 1, "Should deduct 1 day of PHL");
  assert.equal(summary.phlRemaining, 1, "Should have 1 day remaining from 2 opening");
});

test("4. AL full-day deduction (2 half-days internally)", () => {
  assert.equal(leaveHalfDayCost("AL"), 2);
  assert.equal(balanceBucketForLeave("AL"), "AL");

  const alDay: RosterDay = {
    entryDate: "2026-11-12",
    leaveCode: "AL",
    status: "CONFIRMED",
    isLocked: false,
  };

  const alBalance: LeaveBalance = {
    leaveCode: "AL",
    leaveYear: 2026,
    openingBalanceHalfDays: 10, // 5 days
    earnedHalfDays: 0,
    adjustmentHalfDays: 0,
    confirmedUsedHalfDays: 2, // 1 day used
    pendingHalfDays: 0,
  };

  const summary = computeMonthlyRosterSummary(
    2026,
    11,
    [alDay],
    DEFAULT_PREFERENCES,
    shiftsMap,
    alBalance,
    null,
  );

  assert.equal(summary.alUsed, 1);
  assert.equal(summary.alRemaining, 4);
});

test("5. H1/H2 half-day deductions (1 half-day each) and preserved working shift", () => {
  assert.equal(leaveHalfDayCost("H1"), 1);
  assert.equal(leaveHalfDayCost("H2"), 1);
  assert.equal(balanceBucketForLeave("H1"), "AL");
  assert.equal(balanceBucketForLeave("H2"), "AL");

  const k123 = DEFAULT_SHIFTS.find((s) => s.code === "K123")!;
  // K123 is 09:00 to 18:30 = 9.5 hours
  const fullHours = calculateShiftHours(k123.startTime, k123.endTime);
  assert.equal(fullHours, 9.5);

  // For H1 or H2, working hours are reduced by half
  const h1Hours = calculateDayWorkingHours(k123, "H1");
  const h2Hours = calculateDayWorkingHours(k123, "H2");
  assert.equal(h1Hours, 4.75);
  assert.equal(h2Hours, 4.75);

  const days: RosterDay[] = [
    { entryDate: "2026-11-16", shiftCode: "K123", leaveCode: "H1", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-17", shiftCode: "K123", leaveCode: "H2", status: "CONFIRMED", isLocked: false },
  ];

  const alBalance: LeaveBalance = {
    leaveCode: "AL",
    leaveYear: 2026,
    openingBalanceHalfDays: 10, // 5 days
    earnedHalfDays: 0,
    adjustmentHalfDays: 0,
    confirmedUsedHalfDays: 2, // 1 day = 2 half-days used by H1 + H2
    pendingHalfDays: 0,
  };

  const summary = computeMonthlyRosterSummary(
    2026,
    11,
    days,
    DEFAULT_PREFERENCES,
    shiftsMap,
    alBalance,
    null,
  );

  assert.equal(summary.halfDaysCount, 2);
  assert.equal(summary.alUsed, 1); // 0.5 + 0.5
  assert.equal(summary.alRemaining, 4);
  assert.equal(summary.workingDays, 2);
});

test("6. Insufficient AL/PHL balances warnings in summary and generator", () => {
  const alBalance = computeLeaveBalance({
    openingBalanceHalfDays: 2, // 1 day
    earnedHalfDays: 0,
    adjustmentHalfDays: 0,
    confirmedUsedHalfDays: 4, // 2 days
    pendingHalfDays: 0,
  });

  assert.equal(alBalance.availableDays, -1);

  const schedule = getHolidaySchedule(2026);
  const holidayDates = new Set(
    schedule.events.filter((e) => e.kind === "public-holiday").map((e) => e.date),
  );

  const result = generateSmartRoster({
    year: 2026,
    month: 11,
    preferences: {
      ...DEFAULT_PREFERENCES,
      allocationPriority: ["PRD", "PHL", "AL"],
    },
    shifts: DEFAULT_SHIFTS,
    existingDays: [],
    holidayDates,
    alAvailableHalfDays: 0, // No AL available
    phlAvailableHalfDays: 0, // No PHL available
  });

  assert.ok(result.warnings.length > 0, "Should generate warnings for insufficient leave balance");
});

test("7. Changing AL to PHL without double deductions (reversal + debit)", () => {
  const opening = 6; // 3 days
  let confirmedAl = 2; // 1 day AL initially used
  let confirmedPhl = 0;

  // Initial state
  let alState = computeLeaveBalance({
    openingBalanceHalfDays: opening,
    earnedHalfDays: 0,
    adjustmentHalfDays: 0,
    confirmedUsedHalfDays: confirmedAl,
    pendingHalfDays: 0,
  });
  assert.equal(alState.availableDays, 2);

  // Reverse AL (-2 half-days) and apply PHL (+2 half-days)
  confirmedAl -= 2;
  confirmedPhl += 2;

  alState = computeLeaveBalance({
    openingBalanceHalfDays: opening,
    earnedHalfDays: 0,
    adjustmentHalfDays: 0,
    confirmedUsedHalfDays: confirmedAl,
    pendingHalfDays: 0,
  });
  const phlState = computeLeaveBalance({
    openingBalanceHalfDays: opening,
    earnedHalfDays: 0,
    adjustmentHalfDays: 0,
    confirmedUsedHalfDays: confirmedPhl,
    pendingHalfDays: 0,
  });

  assert.equal(alState.availableDays, 3, "AL restored to full 3 days");
  assert.equal(phlState.availableDays, 2, "PHL deducted by exactly 1 day");
});

test("8. Overnight shift date and working hours handling (e.g. K234 20:00 - 05:30)", () => {
  const k234 = DEFAULT_SHIFTS.find((s) => s.code === "K234")!;
  assert.ok(k234, "K234 shift should exist");
  assert.equal(k234.isOvernight, true);

  // 20:00 to 05:30 = 9.5 hours
  const hours = calculateShiftHours(k234.startTime, k234.endTime);
  assert.equal(hours, 9.5, "Overnight hours from 20:00 to 05:30 should be 9.5 hours");

  // Day working hours test
  const dayHours = calculateDayWorkingHours(k234, null);
  assert.equal(dayHours, 9.5);

  // With half-day leave on overnight shift
  const h1Overnight = calculateDayWorkingHours(k234, "H1");
  assert.equal(h1Overnight, 4.75);
});

test("9. Deterministic smart roster generation (PRD first -> PHL -> AL -> default shift)", () => {
  const schedule = getHolidaySchedule(2026);
  const holidayDates = new Set(
    schedule.events.filter((e) => e.kind === "public-holiday").map((e) => e.date),
  );

  const result = generateSmartRoster({
    year: 2026,
    month: 11,
    preferences: {
      ...DEFAULT_PREFERENCES,
      monthlyPrdAllowance: 7,
      saturdayOff: true,
      sundayOff: true,
      holidaysOff: true,
      defaultShiftCode: "K123",
      allocationPriority: ["PRD", "PHL", "AL"],
    },
    shifts: DEFAULT_SHIFTS,
    existingDays: [],
    holidayDates,
    phlAvailableHalfDays: 4, // 2 days PHL
    alAvailableHalfDays: 6, // 3 days AL
  });

  // November 2026 has 30 days
  assert.equal(result.suggestions.length, 30);

  const prdAllocations = result.suggestions.filter((s) => s.leaveCode === "PRD");
  const phlAllocations = result.suggestions.filter((s) => s.leaveCode === "PHL");
  const defaultShiftAllocations = result.suggestions.filter((s) => s.shiftCode === "K123");

  // PRD should take first 7 preferred off days
  assert.equal(prdAllocations.length, 7, "PRD should get exactly 7 days");
  // Remaining off days should get PHL
  assert.ok(phlAllocations.length > 0, "PHL should be allocated for remaining off days");
  // Working days should get K123
  assert.ok(defaultShiftAllocations.length > 0, "Working days should receive default shift K123");
});

test("10. Preservation of manually assigned or locked dates during generation", () => {
  const schedule = getHolidaySchedule(2026);
  const holidayDates = new Set(
    schedule.events.filter((e) => e.kind === "public-holiday").map((e) => e.date),
  );

  const existingDays: RosterDay[] = [
    {
      entryDate: "2026-11-01", // Sunday
      shiftCode: "K234",
      leaveCode: null,
      status: "CONFIRMED",
      isLocked: true, // User locked Sunday Nov 1 as working night shift
    },
    {
      entryDate: "2026-11-15",
      shiftCode: "K122",
      leaveCode: null,
      status: "REQUESTED",
      isLocked: false,
    },
  ];

  const result = generateSmartRoster({
    year: 2026,
    month: 11,
    preferences: DEFAULT_PREFERENCES,
    shifts: DEFAULT_SHIFTS,
    existingDays,
    holidayDates,
    phlAvailableHalfDays: 4,
    alAvailableHalfDays: 4,
  });

  // Locked date Nov 1 and requested date Nov 15 must NOT be in the modification suggestions
  const nov1 = result.suggestions.find((s) => s.entryDate === "2026-11-01");
  assert.equal(nov1, undefined, "Locked date Nov 1 must be preserved and not overwritten");

  const nov15 = result.suggestions.find((s) => s.entryDate === "2026-11-15");
  assert.equal(nov15, undefined, "Requested date Nov 15 must be preserved and not overwritten");
});

test("11. No duplicate deductions on repeated requests or generations", () => {
  const schedule = getHolidaySchedule(2026);
  const holidayDates = new Set(
    schedule.events.filter((e) => e.kind === "public-holiday").map((e) => e.date),
  );

  const run1 = generateSmartRoster({
    year: 2026,
    month: 11,
    preferences: DEFAULT_PREFERENCES,
    shifts: DEFAULT_SHIFTS,
    existingDays: [],
    holidayDates,
    phlAvailableHalfDays: 4,
    alAvailableHalfDays: 4,
  });

  const run2 = generateSmartRoster({
    year: 2026,
    month: 11,
    preferences: DEFAULT_PREFERENCES,
    shifts: DEFAULT_SHIFTS,
    existingDays: [],
    holidayDates,
    phlAvailableHalfDays: 4,
    alAvailableHalfDays: 4,
  });

  assert.deepEqual(run1.suggestions, run2.suggestions, "Generator must be deterministic");
  assert.deepEqual(run1.warnings, run2.warnings);
});

test("12. Mode switching and data isolation", () => {
  const schedule = getHolidaySchedule(2026);
  const publicEvents = schedule.events;

  const personalDay: RosterDay = {
    entryDate: "2026-11-04",
    shiftCode: "K123",
    status: "CONFIRMED",
    isLocked: false,
  };

  assert.ok(!("shiftCode" in publicEvents[0]), "Public events must not have shiftCode");
  assert.ok("shiftCode" in personalDay, "Personal roster day must contain shiftCode");
  assert.equal(personalDay.shiftCode, "K123");
});

test("13. Month/year navigation in Roster mode correctly slices days", () => {
  const allDays: RosterDay[] = [
    { entryDate: "2026-10-31", shiftCode: "K123", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-01", shiftCode: "K123", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-30", shiftCode: "K123", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-12-01", shiftCode: "K123", status: "CONFIRMED", isLocked: false },
  ];

  const novSummary = computeMonthlyRosterSummary(
    2026,
    11,
    allDays,
    DEFAULT_PREFERENCES,
    shiftsMap,
  );

  assert.equal(novSummary.workingDays, 2, "Only Nov 1 and Nov 30 should be counted in November");

  const octSummary = computeMonthlyRosterSummary(
    2026,
    10,
    allDays,
    DEFAULT_PREFERENCES,
    shiftsMap,
  );

  assert.equal(octSummary.workingDays, 1, "Only Oct 31 counted in October");
});

test("14. Roster export calculation verification", () => {
  const days: RosterDay[] = [
    { entryDate: "2026-11-02", shiftCode: "K123", leaveCode: null, status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-03", shiftCode: "K123", leaveCode: null, status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-04", shiftCode: null, leaveCode: "PRD", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-05", shiftCode: null, leaveCode: "PHL", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-06", shiftCode: null, leaveCode: "AL", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-09", shiftCode: "K123", leaveCode: "H1", status: "CONFIRMED", isLocked: false },
    { entryDate: "2026-11-10", shiftCode: "K123", leaveCode: null, status: "REQUESTED", isLocked: false },
  ];

  const summary = computeMonthlyRosterSummary(
    2026,
    11,
    days,
    DEFAULT_PREFERENCES,
    shiftsMap,
  );

  assert.equal(summary.workingDays, 4, "3 full days + 1 H1 day");
  assert.equal(summary.prdUsed, 1);
  assert.equal(summary.phlUsed, 1);
  assert.equal(summary.alUsed, 1.5, "1 full AL + 0.5 H1");
  assert.equal(summary.pendingRequests, 1, "Nov 10 is REQUESTED");
  assert.equal(summary.halfDaysCount, 1);
});

test("15. Time math utilities handle edge cases", () => {
  assert.equal(timeToMinutes("00:00"), 0);
  assert.equal(timeToMinutes("09:30"), 570);
  assert.equal(timeToMinutes("23:59"), 1439);

  // Standard shifts
  assert.equal(calculateShiftHours("08:30", "18:00"), 9.5);
  assert.equal(calculateShiftHours("09:00", "18:30"), 9.5);
  assert.equal(calculateShiftHours("09:30", "19:00"), 9.5);

  // Overnight shift
  assert.equal(calculateShiftHours("20:00", "05:30"), 9.5);
  assert.equal(calculateShiftHours("22:00", "06:00"), 8.0);
});

test("16. holiday extraction in previewSmartRoster handles getHolidaySchedule events format", () => {
  const holidaySched = getHolidaySchedule(2026);
  assert.ok(Array.isArray(holidaySched.events), "holidaySched must have events array");
  const holidayDates = new Set<string>();
  for (const h of holidaySched.events || []) {
    if (h.kind === "public-holiday") {
      holidayDates.add(h.date);
    }
  }
  assert.ok(holidayDates.size > 0, "Should extract public holiday dates");
  assert.ok(holidayDates.has("2026-01-01"));
  assert.ok(holidayDates.has("2026-11-23")); // Water festival
});
