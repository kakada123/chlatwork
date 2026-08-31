import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

const ONE_MINUTE_MS = 60_000;
const DELIVERY_BATCH_SIZE = 5;
const TELEGRAM_MESSAGE_MAX_LENGTH = 4_096;

interface DueSummaryUser {
  userId: string;
  localDate: string;
}

interface ExpenseSummaryRow {
  currency: "USD" | "KHR";
  rangeMode: "ALL" | "MONTH" | "WEEK" | "TODAY";
  budgetPeriod: "MONTHLY" | "WEEKLY";
  budgetInput: string;
  entryDate: string | null;
  entryType: "EXPENSE" | "INCOME" | null;
  category: string | null;
  amount: string | null;
}

interface SummaryItem {
  date: string;
  type: "EXPENSE" | "INCOME";
  category: string;
  amountCents: bigint;
}

interface CategorySummary {
  category: string;
  totalCents: bigint;
  percent: number;
}

function parseMoneyCents(value: string | null): bigint {
  const match = value?.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return 0n;

  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
}

function formatMoneyCents(cents: bigint, currency: "USD" | "KHR") {
  const negative = cents < 0n;
  const absoluteCents = negative ? -cents : cents;

  if (currency === "KHR") {
    const roundedRiel = (absoluteCents + 50n) / 100n;
    const grouped = roundedRiel
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${negative && roundedRiel > 0n ? "-" : ""}${grouped}៛`;
  }

  const whole = (absoluteCents / 100n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (absoluteCents % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}$${whole}.${fraction}`;
}

export function formatDailyExpenseTotal(
  total: string,
  currency: "USD" | "KHR",
) {
  const match = total.trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return currency === "KHR" ? "0៛" : "$0.00";

  const cents =
    (match[1] === "-" ? -1n : 1n) *
    (BigInt(match[2]) * 100n +
      BigInt((match[3] ?? "").padEnd(2, "0").slice(0, 2)));
  return formatMoneyCents(cents, currency);
}

function subtractCalendarDays(localDate: string, days: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function getRangeDetails(
  rangeMode: ExpenseSummaryRow["rangeMode"],
  localDate: string,
) {
  if (rangeMode === "ALL") return { label: "All", startDate: null };
  if (rangeMode === "MONTH") {
    return { label: "This month", startDate: `${localDate.slice(0, 7)}-01` };
  }
  if (rangeMode === "WEEK") {
    return { label: "Last 7 days", startDate: subtractCalendarDays(localDate, 6) };
  }
  return { label: "Today", startDate: localDate };
}

function isInSelectedRange(
  date: string,
  rangeMode: ExpenseSummaryRow["rangeMode"],
  startDate: string | null,
  localDate: string,
) {
  if (rangeMode === "ALL") return true;
  if (rangeMode === "TODAY") return date === localDate;
  // The tracker treats the month/week choices as an inclusive lower bound.
  return Boolean(startDate && date >= startDate);
}

function getBudgetStatus(budgetCents: bigint, spentCents: bigint) {
  if (budgetCents <= 0n) return "Set budget";
  if (spentCents > budgetCents) return "Over budget 💀";

  const remainingCents = budgetCents - spentCents;
  if (remainingCents * 10n <= budgetCents) return "Bro stop 😭";
  if (remainingCents * 10n <= budgetCents * 3n) return "Careful 🟡";
  return "Safe ✅";
}

function getDateSpanDays(items: SummaryItem[]) {
  if (!items.length) return 0;
  const dates = items.map((item) => item.date).sort();
  const first = new Date(`${dates[0]}T00:00:00.000Z`).getTime();
  const last = new Date(`${dates[dates.length - 1]}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.floor((last - first) / 86_400_000) + 1);
}

function buildCategorySummaries(
  items: SummaryItem[],
  totalSpentCents: bigint,
): CategorySummary[] {
  const totals = new Map<string, bigint>();
  for (const item of items) {
    if (item.type !== "EXPENSE") continue;
    totals.set(
      item.category,
      (totals.get(item.category) ?? 0n) + item.amountCents,
    );
  }

  return [...totals.entries()]
    .map(([category, totalCents]) => ({
      category,
      totalCents,
      percent:
        totalSpentCents > 0n
          ? Number((totalCents * 100n + totalSpentCents / 2n) / totalSpentCents)
          : 0,
    }))
    .sort((left, right) =>
      left.totalCents === right.totalCents
        ? 0
        : right.totalCents > left.totalCents
          ? 1
          : -1,
    );
}

function appendCategoriesWithinTelegramLimit(
  lines: string[],
  categories: CategorySummary[],
  currency: "USD" | "KHR",
) {
  const tip = "\nTip: keep categories consistent (Food vs food). Your future self will thank you 😄";
  let included = 0;

  for (const category of categories) {
    const line = `• ${category.category}: ${formatMoneyCents(category.totalCents, currency)} (${category.percent}%)`;
    const omitted = categories.length - included - 1;
    const overflowLine = omitted > 0 ? `\n• …and ${omitted} more categories` : "";
    const candidate = [...lines, line].join("\n") + overflowLine + tip;
    if (candidate.length > TELEGRAM_MESSAGE_MAX_LENGTH) break;
    lines.push(line);
    included += 1;
  }

  const omitted = categories.length - included;
  if (omitted > 0) lines.push(`• …and ${omitted} more categories`);
  lines.push("", tip.trimStart());
}

export function buildSpendingOverviewMessage(
  localDate: string,
  rows: ExpenseSummaryRow[],
) {
  const profile = rows[0] ?? {
    currency: "USD" as const,
    rangeMode: "MONTH" as const,
    budgetPeriod: "MONTHLY" as const,
    budgetInput: "",
  };
  const { label: rangeLabel, startDate } = getRangeDetails(
    profile.rangeMode,
    localDate,
  );
  const items = rows
    .filter(
      (row) =>
        row.entryDate &&
        row.entryType &&
        row.amount &&
        isInSelectedRange(
          row.entryDate,
          profile.rangeMode,
          startDate,
          localDate,
        ),
    )
    .map((row) => ({
      date: row.entryDate as string,
      type: row.entryType as "EXPENSE" | "INCOME",
      category: row.category?.trim() || "Other",
      amountCents: parseMoneyCents(row.amount),
    }))
    .filter((item) => item.amountCents > 0n);

  const expenses = items.filter((item) => item.type === "EXPENSE");
  const incomeCents = items
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.amountCents, 0n);
  const spentCents = expenses.reduce(
    (sum, item) => sum + item.amountCents,
    0n,
  );
  const netCents = incomeCents - spentCents;
  const dateSpanDays = getDateSpanDays(items);
  const dailyAverageCents = dateSpanDays
    ? (spentCents + BigInt(dateSpanDays) / 2n) / BigInt(dateSpanDays)
    : 0n;
  const budgetCents = parseMoneyCents(profile.budgetInput);
  const remainingCents = budgetCents - spentCents;
  const budgetPercent =
    budgetCents > 0n
      ? Number((spentCents * 100n + budgetCents / 2n) / budgetCents)
      : 0;
  const status = getBudgetStatus(budgetCents, spentCents);
  const categories = buildCategorySummaries(items, spentCents);
  const topExpense = [...expenses].sort((left, right) =>
    left.amountCents === right.amountCents
      ? 0
      : right.amountCents > left.amountCents
        ? 1
        : -1,
  )[0];
  const format = (cents: bigint) =>
    formatMoneyCents(cents, profile.currency);

  const lines = [
    "📊 Spending overview",
    `Range: ${rangeLabel}`,
    `As of: ${localDate}`,
    `Status: ${status}`,
    "",
    `Items: ${items.length}`,
    `Income: ${format(incomeCents)}`,
    `Spent: ${format(spentCents)}`,
    `Net: ${format(netCents)}`,
    `Daily avg (spent): ${format(dailyAverageCents)}`,
    "",
    `💰 Budget (${profile.budgetPeriod === "WEEKLY" ? "Weekly" : "Monthly"})`,
    `Budget amount: ${format(budgetCents)}`,
    `Remaining: ${format(remainingCents)}`,
    `Budget used: ${budgetPercent}%`,
    `Budget uses the selected range: ${rangeLabel}.`,
    "",
    "💡 Insights",
  ];

  if (!items.length) {
    lines.push("• No insights yet.");
  } else {
    if (incomeCents > 0n) lines.push(`• Income: ${format(incomeCents)}.`);
    if (spentCents > 0n) lines.push(`• Spent: ${format(spentCents)}.`);
    if (incomeCents > 0n || spentCents > 0n) {
      lines.push(`• Net: ${format(netCents)}.`);
    }

    const biggestCategory = categories[0];
    if (biggestCategory) {
      lines.push(
        `• Biggest expense: ${biggestCategory.category} (${biggestCategory.percent}%).`,
      );
    }
    if (topExpense) {
      lines.push(
        `• Top expense: ${topExpense.category} — ${format(topExpense.amountCents)}.`,
      );
    }

    if (budgetCents > 0n) {
      if (remainingCents < 0n) {
        lines.push(
          `• You exceeded your budget by ${format(-remainingCents)}.`,
        );
      } else {
        lines.push(`• Remaining budget: ${format(remainingCents)}.`);
        if (dailyAverageCents > 0n && remainingCents > 0n) {
          lines.push(
            `• At this pace, budget lasts about ${remainingCents / dailyAverageCents} day(s).`,
          );
        }
      }
    } else {
      lines.push("• Set a budget to unlock the spicy warnings 😄");
    }
  }

  lines.push("", "📂 Spending by category (highest first)");
  if (categories.length) {
    appendCategoriesWithinTelegramLimit(lines, categories, profile.currency);
  } else {
    lines.push(
      "• No expense categories yet.",
      "",
      "Tip: keep categories consistent (Food vs food). Your future self will thank you 😄",
    );
  }

  return lines.join("\n");
}

@Injectable()
export class DailyExpenseSummaryScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DailyExpenseSummaryScheduler.name);
  private alignmentTimer?: NodeJS.Timeout;
  private minuteTimer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    void this.tick();

    const delayToMinuteBoundary = ONE_MINUTE_MS - (Date.now() % ONE_MINUTE_MS);
    this.alignmentTimer = setTimeout(() => {
      void this.tick();
      this.minuteTimer = setInterval(() => void this.tick(), ONE_MINUTE_MS);
      this.minuteTimer.unref();
    }, delayToMinuteBoundary);
    this.alignmentTimer.unref();
  }

  onModuleDestroy() {
    if (this.alignmentTimer) clearTimeout(this.alignmentTimer);
    if (this.minuteTimer) clearInterval(this.minuteTimer);
  }

  async runOnce(now = new Date()) {
    // Claiming the local date inside one locked statement makes delivery at-most-once across API replicas.
    // A failed provider attempt stays claimed so a transient outage cannot create repeated notification spam.
    const dueUsers = await this.prisma.$queryRaw<DueSummaryUser[]>`
      WITH due AS (
        SELECT
          id,
          (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)::date AS local_date
        FROM users
        WHERE telegram_notifications_enabled = TRUE
          AND EXTRACT(
            HOUR FROM (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)
          )::integer >= telegram_daily_expense_summary_hour
          AND (
            telegram_daily_expense_summary_last_attempt_date IS NULL
            OR telegram_daily_expense_summary_last_attempt_date
              < (${now}::timestamptz AT TIME ZONE telegram_notification_time_zone)::date
          )
        ORDER BY id
        LIMIT 100
        FOR UPDATE SKIP LOCKED
      )
      UPDATE users AS recipient
      SET telegram_daily_expense_summary_last_attempt_date = due.local_date
      FROM due
      WHERE recipient.id = due.id
      RETURNING
        recipient.id::text AS "userId",
        due.local_date::text AS "localDate"
    `;

    for (let index = 0; index < dueUsers.length; index += DELIVERY_BATCH_SIZE) {
      const batch = dueUsers.slice(index, index + DELIVERY_BATCH_SIZE);
      await Promise.all(batch.map((recipient) => this.sendSummary(recipient)));
    }

    return dueUsers.length;
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.runOnce();
    } catch {
      // Keep operational logs useful without exposing account identifiers or provider request details.
      this.logger.warn("Daily expense summary run failed");
    } finally {
      this.running = false;
    }
  }

  private async sendSummary(recipient: DueSummaryUser) {
    try {
      // One snapshot keeps the Telegram overview internally consistent while the user edits tracker rows.
      const rows = await this.prisma.$queryRaw<ExpenseSummaryRow[]>`
        SELECT
          COALESCE(profile.currency::text, 'USD') AS "currency",
          COALESCE(profile."rangeMode"::text, 'MONTH') AS "rangeMode",
          COALESCE(profile."budgetPeriod"::text, 'MONTHLY') AS "budgetPeriod",
          COALESCE(profile."budgetInput", '') AS "budgetInput",
          entry."entryDate"::text AS "entryDate",
          entry.type::text AS "entryType",
          CASE
            WHEN entry.category = '__custom__'
              THEN COALESCE(NULLIF(entry."customCategory", ''), 'Other')
            ELSE COALESCE(NULLIF(entry.category, ''), 'Other')
          END AS "category",
          entry.amount::text AS "amount"
        FROM users AS recipient
        LEFT JOIN expense_profiles AS profile
          ON profile."userId" = recipient.id
        LEFT JOIN expense_entries AS entry
          ON entry."userId" = recipient.id
          AND entry."entryDate" IS NOT NULL
          AND entry.amount IS NOT NULL
        WHERE recipient.id = ${recipient.userId}::uuid
        ORDER BY entry.position ASC NULLS LAST
      `;

      await this.notifications.sendToUser(
        recipient.userId,
        buildSpendingOverviewMessage(recipient.localDate, rows),
      );
    } catch {
      // One unavailable Telegram recipient must not block other users' summaries.
      this.logger.warn("A daily expense summary could not be delivered");
    }
  }
}
