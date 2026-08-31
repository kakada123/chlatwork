import type { PrismaService } from "../prisma/prisma.service";
import {
  buildSpendingOverviewMessage,
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

  it("sends the full spending overview for the saved range", async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ userId: USER_ID, localDate: "2026-08-29" }])
      .mockResolvedValueOnce([
        {
          currency: "USD",
          rangeMode: "MONTH",
          budgetPeriod: "MONTHLY",
          budgetInput: "37.54",
          entryDate: "2026-08-27",
          entryType: "EXPENSE",
          category: "Other",
          amount: "21.79",
        },
        {
          currency: "USD",
          rangeMode: "MONTH",
          budgetPeriod: "MONTHLY",
          budgetInput: "37.54",
          entryDate: "2026-08-28",
          entryType: "EXPENSE",
          category: "Food",
          amount: "20.94",
        },
        {
          currency: "USD",
          rangeMode: "MONTH",
          budgetPeriod: "MONTHLY",
          budgetInput: "37.54",
          entryDate: "2026-08-29",
          entryType: "EXPENSE",
          category: "Coffee",
          amount: "3.18",
        },
      ]);
    notifications.sendToUser.mockResolvedValue(true);

    await expect(
      scheduler.runOnce(new Date("2026-08-29T15:00:05.000Z")),
    ).resolves.toBe(1);
    expect(notifications.sendToUser).toHaveBeenCalledWith(
      USER_ID,
      [
        "📊 Spending overview",
        "Range: This month",
        "As of: 2026-08-29",
        "Status: Over budget 💀",
        "",
        "Items: 3",
        "Income: $0.00",
        "Spent: $45.91",
        "Net: -$45.91",
        "Daily avg (spent): $15.30",
        "",
        "💰 Budget (Monthly)",
        "Budget amount: $37.54",
        "Remaining: -$8.37",
        "Budget used: 122%",
        "Budget uses the selected range: This month.",
        "",
        "💡 Insights",
        "• Spent: $45.91.",
        "• Net: -$45.91.",
        "• Biggest expense: Other (47%).",
        "• Top expense: Other — $21.79.",
        "• You exceeded your budget by $8.37.",
        "",
        "📂 Spending by category (highest first)",
        "• Other: $21.79 (47%)",
        "• Food: $20.94 (46%)",
        "• Coffee: $3.18 (7%)",
        "",
        "Tip: keep categories consistent (Food vs food). Your future self will thank you 😄",
      ].join("\n"),
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

  it("uses the local date when applying the saved today range", () => {
    const message = buildSpendingOverviewMessage("2026-08-29", [
      {
        currency: "USD",
        rangeMode: "TODAY",
        budgetPeriod: "WEEKLY",
        budgetInput: "100",
        entryDate: "2026-08-28",
        entryType: "EXPENSE",
        category: "Food",
        amount: "90",
      },
      {
        currency: "USD",
        rangeMode: "TODAY",
        budgetPeriod: "WEEKLY",
        budgetInput: "100",
        entryDate: "2026-08-29",
        entryType: "INCOME",
        category: "Salary",
        amount: "20",
      },
      {
        currency: "USD",
        rangeMode: "TODAY",
        budgetPeriod: "WEEKLY",
        budgetInput: "100",
        entryDate: "2026-08-29",
        entryType: "EXPENSE",
        category: "Coffee",
        amount: "5",
      },
    ]);

    expect(message).toContain("Range: Today");
    expect(message).toContain("Items: 2");
    expect(message).toContain("Income: $20.00");
    expect(message).toContain("Spent: $5.00");
    expect(message).not.toContain("$90.00");
  });

  it("keeps category detail within Telegram's message limit", () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      currency: "USD" as const,
      rangeMode: "ALL" as const,
      budgetPeriod: "MONTHLY" as const,
      budgetInput: "1000",
      entryDate: "2026-08-29",
      entryType: "EXPENSE" as const,
      category: `Category ${index} ${"x".repeat(100)}`,
      amount: "1",
    }));
    const message = buildSpendingOverviewMessage("2026-08-29", rows);

    expect(message.length).toBeLessThanOrEqual(4_096);
    expect(message).toMatch(/…and \d+ more categories/);
  });
});
