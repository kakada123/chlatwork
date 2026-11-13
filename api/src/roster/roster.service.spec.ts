import { BadRequestException } from "@nestjs/common";
import { RosterService } from "./roster.service";

describe("RosterService annual balances", () => {
  const prisma = {
    $transaction: jest.fn(),
    rosterPreferences: { findUnique: jest.fn() },
    rosterShift: { findMany: jest.fn() },
    leaveBalance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    rosterDay: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    leaveTransaction: { create: jest.fn() },
  };
  let service: RosterService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (action) => action(prisma));
    prisma.rosterPreferences.findUnique.mockResolvedValue({ userId: "user-a" });
    prisma.rosterShift.findMany.mockResolvedValue([{ code: "K123" }]);
    prisma.leaveBalance.findMany.mockResolvedValue([]);
    service = new RosterService(prisma as never);
  });

  function savedWorkday(date: string, leaveCode: "AL" | "PHL") {
    let day = {
      id: "day-a", userId: "user-a", entryDate: new Date(`${date}T00:00:00Z`),
      shiftCode: "K123" as string | null, leaveCode: null as string | null,
      status: "CONFIRMED", note: "Keep this note", isLocked: false,
      createdAt: new Date("2027-01-01T00:00:00Z"), updatedAt: new Date("2027-01-01T00:00:00Z"),
    };
    const balance = { leaveCode, openingBalanceHalfDays: 2, earnedHalfDays: 0, adjustmentHalfDays: 0, confirmedUsedHalfDays: 0, pendingHalfDays: 0 };
    prisma.rosterPreferences.findUnique.mockResolvedValue({ statusFlowEnabled: false, monthlyPrdAllowance: 0, saturdayOff: true, sundayOff: true, publicHolidaysOff: true, defaultShiftCode: "K123" });
    prisma.rosterDay.findMany.mockImplementation(async () => [day]);
    prisma.rosterDay.findUnique.mockImplementation(async () => day);
    prisma.rosterDay.upsert.mockImplementation(async ({ update }) => { day = { ...day, ...update }; return day; });
    prisma.leaveBalance.findMany.mockResolvedValue([balance]);
    prisma.leaveBalance.findUnique.mockResolvedValue(balance);
    prisma.leaveBalance.upsert.mockResolvedValue(balance);
    prisma.leaveBalance.update.mockImplementation(async ({ data }) => { balance.confirmedUsedHalfDays += data.confirmedUsedHalfDays.increment; return balance; });
    return { balance, get day() { return day; } };
  }

  it("applies new PHL credit to confirmed Saturday work once, preserving notes", async () => {
    const state = savedWorkday("2027-01-02", "PHL");
    const plan = { year: 2027, month: 1, entries: [{ date: "2027-01-02", shiftCode: null, leaveCode: "PHL" as const }] };
    expect(await service.applyRosterSuggestions("user-a", plan)).toEqual({ applied: 1, skipped: 0 });
    expect(state.day).toMatchObject({ shiftCode: null, leaveCode: "PHL", note: "Keep this note" });
    expect(state.balance.confirmedUsedHalfDays).toBe(2);
    expect(await service.applyRosterSuggestions("user-a", plan)).toEqual({ applied: 0, skipped: 1 });
    expect(state.balance.confirmedUsedHalfDays).toBe(2);
    expect(prisma.leaveTransaction.create).toHaveBeenCalledTimes(1);
  });

  it.each(["H1", "H2"] as const)("saves flexible %s without a shift and debits half a day", async (leaveCode) => {
    const state = savedWorkday("2027-01-04", "AL");
    await service.upsertRosterDay("user-a", "2027-01-04", { shiftCode: "K123", leaveCode });
    expect(state.day.shiftCode).toBeNull();
    expect(state.day.leaveCode).toBe(leaveCode);
    expect(state.balance.confirmedUsedHalfDays).toBe(1);
  });

  it("uses the normal Saturday shift when no leave credits are available", async () => {
    prisma.rosterPreferences.findUnique.mockResolvedValue({
      monthlyPrdAllowance: 0,
      saturdayOff: true,
      sundayOff: true,
      publicHolidaysOff: true,
      defaultShiftCode: "K123",
    });
    prisma.rosterDay.findMany.mockResolvedValue([]);
    prisma.leaveBalance.findUnique.mockResolvedValue(null);
    const result = await service.generatePreview("user-a", {
      year: 2026,
      month: 11,
    });
    for (const date of [
      "2026-11-07",
      "2026-11-14",
      "2026-11-21",
      "2026-11-28",
    ]) {
      expect(
        result.suggestions.find((entry) => entry.date === date),
      ).toMatchObject({ shiftCode: "K123", leaveCode: null });
    }
  });

  it("reconsiders confirmed Saturday work after annual leave credit is added", async () => {
    prisma.rosterPreferences.findUnique.mockResolvedValue({
      monthlyPrdAllowance: 0, statusFlowEnabled: false, saturdayOff: true,
      sundayOff: true, publicHolidaysOff: true, defaultShiftCode: "K123",
    });
    prisma.rosterDay.findMany.mockResolvedValue([{
      entryDate: new Date("2027-01-02T00:00:00Z"), shiftCode: "K123", leaveCode: null,
      status: "CONFIRMED", isLocked: false,
    }]);
    prisma.leaveBalance.findUnique.mockResolvedValue({
      openingBalanceHalfDays: 44, earnedHalfDays: 0, adjustmentHalfDays: 0,
      confirmedUsedHalfDays: 0, pendingHalfDays: 0,
    });
    const result = await service.generatePreview("user-a", { year: 2027, month: 1 });
    expect(result.suggestions.find((day) => day.date === "2027-01-02")?.leaveCode).toBe("PHL");
  });

  it("reserves Sunday PRD before Saturdays and works holidays when credits are exhausted", async () => {
    prisma.rosterPreferences.findUnique.mockResolvedValue({
      monthlyPrdAllowance: 7,
      saturdayOff: true,
      sundayOff: true,
      publicHolidaysOff: true,
      defaultShiftCode: "K123",
    });
    prisma.rosterDay.findMany.mockResolvedValue([]);
    prisma.leaveBalance.findUnique.mockResolvedValue(null);
    const result = await service.generatePreview("user-a", {
      year: 2026,
      month: 12,
    });
    expect(
      result.suggestions.find((day) => day.date === "2026-12-26")?.shiftCode,
    ).toBe("K123");
    expect(
      result.suggestions.find((day) => day.date === "2026-12-27")?.leaveCode,
    ).toBe("PRD");
    expect(
      result.suggestions.find((day) => day.date === "2026-12-29")?.shiftCode,
    ).toBe("K123");
    expect(
      result.suggestions.every((day) => day.shiftCode || day.leaveCode),
    ).toBe(true);
  });

  it("includes both adjacent months when enforcing Monday-Sunday limits", async () => {
    prisma.rosterPreferences.findUnique.mockResolvedValue({
      monthlyPrdAllowance: 0,
      saturdayOff: false,
      sundayOff: false,
      publicHolidaysOff: false,
      defaultShiftCode: "K123",
    });
    prisma.leaveBalance.findUnique.mockResolvedValue(null);
    const days = [
      ...Array.from({ length: 6 }, (_, i) => `2026-10-${i + 26}`),
      ...Array.from({ length: 6 }, (_, i) => `2026-12-0${i + 1}`),
    ];
    prisma.rosterDay.findMany.mockResolvedValue(
      days.map((date) => ({
        entryDate: new Date(`${date}T00:00:00Z`),
        shiftCode: "K123",
        leaveCode: null,
        status: "CONFIRMED",
        isLocked: true,
      })),
    );
    const result = await service.generatePreview("user-a", {
      year: 2026,
      month: 11,
    });
    expect(prisma.rosterDay.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-a",
        entryDate: {
          gte: new Date("2026-10-26T00:00:00Z"),
          lte: new Date("2026-12-06T00:00:00Z"),
        },
      },
    });
    expect(
      result.suggestions.find((day) => day.date === "2026-11-01")?.shiftCode,
    ).toBeNull();
    expect(
      result.suggestions.find((day) => day.date === "2026-11-30")?.shiftCode,
    ).toBeNull();
  });

  it("rejects an over-limit generated plan before any entry is written", async () => {
    prisma.rosterDay.findMany.mockResolvedValue([]);
    const upsert = jest.spyOn(service, "upsertRosterDay");
    const entries = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-11-${String(index + 2).padStart(2, "0")}`,
      shiftCode: "K123",
      status: "DRAFT" as const,
    }));
    await expect(
      service.applyRosterSuggestions("user-a", {
        year: 2026,
        month: 11,
        entries,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("loads balances for the selected year and authenticated user", async () => {
    await (service.getSettings as Function)("user-a", 2027);
    expect(prisma.leaveBalance.findMany).toHaveBeenCalledWith({
      where: { userId: "user-a", leaveYear: 2027 },
    });
  });

  it.each([NaN, 1999, 2101, 2027.5])(
    "rejects invalid year %s before querying data",
    async (year) => {
      await expect(
        (service.getSettings as Function)("user-a", year),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.rosterPreferences.findUnique).not.toHaveBeenCalled();
      expect(prisma.leaveBalance.findMany).not.toHaveBeenCalled();
    },
  );
});
