import type { PrismaService } from "../prisma/prisma.service";
import {
  DailyExpenseSummaryScheduler,
  formatDailyExpenseTotal,
} from "./daily-expense-summary.scheduler";
import type { NotificationsService } from "./notifications.service";

const USER_ID = "00000000-0000-4000-8000-000000000001";

describe("DailyExpenseSummaryScheduler", () => {
  const prisma = { $queryRaw: jest.fn() };
  const notifications = { sendToUser: jest.fn() };
  let scheduler: DailyExpenseSummaryScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduler = new DailyExpenseSummaryScheduler(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  it("sends the claimed local-day expense total", async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ userId: USER_ID, localDate: "2026-08-29" }])
      .mockResolvedValueOnce([{ total: "1234.50", currency: "USD" }]);
    notifications.sendToUser.mockResolvedValue(true);

    await expect(
      scheduler.runOnce(new Date("2026-08-29T15:00:05.000Z")),
    ).resolves.toBe(1);
    expect(notifications.sendToUser).toHaveBeenCalledWith(
      USER_ID,
      "Daily expense summary\n2026-08-29\nTotal spent: $1,234.50",
    );
  });

  it("does no per-user work when nobody is due", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await expect(scheduler.runOnce()).resolves.toBe(0);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(notifications.sendToUser).not.toHaveBeenCalled();
  });

  it("formats KHR without decimal digits", () => {
    expect(formatDailyExpenseTotal("12500.60", "KHR")).toBe("12,501៛");
  });
});
