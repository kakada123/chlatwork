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
    },
    rosterDay: { findMany: jest.fn() },
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
