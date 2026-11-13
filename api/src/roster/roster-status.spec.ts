import { BadRequestException } from "@nestjs/common";
import { RosterService } from "./roster.service";

describe("monthly bulk status updates", () => {
  function fixture(statusFlowEnabled = true) {
    const rows: Array<{
      id: string;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
      entryDate: Date;
      shiftCode: string | null;
      leaveCode: string | null;
      status: string;
      isLocked: boolean;
      note: string | null;
    }> = [
      {
        id: "a",
        userId: "user-a",
        createdAt: new Date("2026-11-01T00:00:00Z"),
        updatedAt: new Date("2026-11-01T00:00:00Z"),
        entryDate: new Date("2026-11-02T00:00:00Z"),
        shiftCode: null,
        leaveCode: "AL",
        status: "DRAFT",
        isLocked: false,
        note: "keep",
      },
      {
        id: "b",
        userId: "user-a",
        createdAt: new Date("2026-11-01T00:00:00Z"),
        updatedAt: new Date("2026-11-01T00:00:00Z"),
        entryDate: new Date("2026-11-03T00:00:00Z"),
        shiftCode: "K123",
        leaveCode: "H1",
        status: "DRAFT",
        isLocked: false,
        note: null,
      },
      {
        id: "c",
        userId: "user-a",
        createdAt: new Date("2026-11-01T00:00:00Z"),
        updatedAt: new Date("2026-11-01T00:00:00Z"),
        entryDate: new Date("2026-11-04T00:00:00Z"),
        shiftCode: null,
        leaveCode: "AL",
        status: "DRAFT",
        isLocked: true,
        note: null,
      },
    ];
    let usedHalfDays = 0;
    const tx = {
      rosterPreferences: {
        findUnique: jest.fn(async () => ({ statusFlowEnabled })),
      },
      rosterDay: {
        delete: jest.fn(async ({ where }) => {
          const index = rows.findIndex((row) => row.entryDate.getTime() === where.userId_entryDate.entryDate.getTime());
          return rows.splice(index, 1)[0];
        }),
        findMany: jest.fn(async () => rows),
        findUnique: jest.fn(async ({ where }) =>
          rows.find(
            (row) =>
              row.entryDate.getTime() ===
              where.userId_entryDate.entryDate.getTime(),
          ),
        ),
        upsert: jest.fn(async ({ where, update }) => {
          const row = rows.find(
            (entry) =>
              entry.entryDate.getTime() ===
              where.userId_entryDate.entryDate.getTime(),
          )!;
          Object.assign(row, update);
          return row;
        }),
      },
      leaveBalance: {
        findUnique: jest.fn(
          async () =>
            ({
              openingBalanceHalfDays: 40,
              earnedHalfDays: 0,
              adjustmentHalfDays: 0,
              confirmedUsedHalfDays: 0,
              pendingHalfDays: 0,
            }) as any,
        ),
        upsert: jest.fn(async () => ({})),
        update: jest.fn(async ({ data }) => {
          usedHalfDays +=
            (data.confirmedUsedHalfDays?.increment ?? 0) -
            (data.confirmedUsedHalfDays?.decrement ?? 0);
        }),
      },
      leaveTransaction: { create: jest.fn(async () => ({})) },
    };
    const prisma = { $transaction: jest.fn(async (action) => action(tx)) };
    return {
      service: new RosterService(prisma as never),
      rows,
      tx,
      prisma,
      used: () => usedHalfDays,
    };
  }

  it("confirms several entries with correct annual half-day deductions and skips locks", async () => {
    const { service, rows, tx, used } = fixture();
    const result = await (service as any).updateStatuses("user-a", {
      year: 2026,
      month: 11,
      dates: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"],
      status: "CONFIRMED",
    });
    expect(result.updated).toBe(2);
    expect(rows[0]).toMatchObject({
      status: "CONFIRMED",
      leaveCode: "AL",
      note: "keep",
    });
    expect(rows[1]).toMatchObject({
      status: "CONFIRMED",
      leaveCode: "H1",
      shiftCode: null,
    });
    expect(rows[2].status).toBe("DRAFT");
    expect(used()).toBe(3);
    expect(
      tx.leaveBalance.update.mock.calls.every(
        ([call]) =>
          call.where.userId_leaveCode_leaveYear.userId === "user-a" &&
          call.where.userId_leaveCode_leaveYear.leaveYear === 2026,
      ),
    ).toBe(true);
  });

  it("rejects dates outside the selected month before writing", async () => {
    const { service, prisma } = fixture();
    await expect(
      (service as any).updateStatuses("user-a", {
        year: 2026,
        month: 11,
        dates: ["2026-12-01"],
        status: "CONFIRMED",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an eighth PRD day before writing", async () => {
    const { service, rows, tx } = fixture();
    const template = rows[0]!;
    rows.splice(
      0,
      rows.length,
      ...Array.from({ length: 8 }, (_, index) => ({
        ...template,
        id: `p-${index}`,
        entryDate: new Date(
          `2026-11-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
        ),
        leaveCode: "PRD",
      })),
    );
    await expect(
      service.upsertRosterDay("user-a", "2026-11-08", { status: "CONFIRMED" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.rosterDay.upsert).not.toHaveBeenCalled();
  });

  it("rejects seven workdays in a Monday-Sunday week before writing", async () => {
    const { service, rows, tx } = fixture();
    const template = rows[0]!;
    rows.splice(
      0,
      rows.length,
      ...Array.from({ length: 7 }, (_, index) => ({
        ...template,
        id: `w-${index}`,
        entryDate: new Date(
          `2026-11-${String(index + 2).padStart(2, "0")}T00:00:00Z`,
        ),
        leaveCode: null as any,
        shiftCode: "K123",
      })),
    );
    await expect(
      service.upsertRosterDay("user-a", "2026-11-08", { status: "CONFIRMED" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.rosterDay.upsert).not.toHaveBeenCalled();
  });

  it.each(["AL", "PHL", "H1", "H2"] as const)(
    "rejects %s when annual credit is not configured",
    async (leaveCode) => {
      const { service, tx } = fixture();
      tx.leaveBalance.findUnique.mockResolvedValue(null);
      await expect(
        service.upsertRosterDay("user-a", "2026-11-02", {
          leaveCode,
          status: "CONFIRMED",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.rosterDay.upsert).not.toHaveBeenCalled();
    },
  );

  it("confirms immediately with flow off and reverses the old leave bucket on edits", async () => {
    const { service, rows, tx, used } = fixture(false);
    const first = await service.upsertRosterDay("user-a", "2026-11-02", {
      status: "DRAFT",
    });
    expect(first.status).toBe("CONFIRMED");
    expect(used()).toBe(2);
    const edited = await service.upsertRosterDay("user-a", "2026-11-02", {
      leaveCode: "PHL",
    });
    expect(edited.status).toBe("CONFIRMED");
    expect(rows[0].leaveCode).toBe("PHL");
    expect(used()).toBe(2);
    const updates = tx.leaveBalance.update.mock.calls;
    expect(updates[updates.length - 2][0]).toMatchObject({
      where: {
        userId_leaveCode_leaveYear: { leaveCode: "AL", leaveYear: 2026 },
      },
      data: { confirmedUsedHalfDays: { decrement: 2 } },
    });
    expect(updates[updates.length - 1][0]).toMatchObject({
      where: {
        userId_leaveCode_leaveYear: { leaveCode: "PHL", leaveYear: 2026 },
      },
      data: { confirmedUsedHalfDays: { increment: 2 } },
    });
  });

  it('returns annual credit when a confirmed entry is deleted', async () => {
    const { service, rows, used } = fixture(false);
    await service.upsertRosterDay('user-a', '2026-11-02', { status: 'CONFIRMED' });
    expect(used()).toBe(2);
    await service.deleteRosterDay('user-a', '2026-11-02');
    expect(used()).toBe(0);
    expect(rows.some((row) => row.entryDate.toISOString().startsWith('2026-11-02'))).toBe(false);
  });
});
