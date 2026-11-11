import { todayISO } from "./expense-tracker.ts";
import { moneyCentsToNumber, moneyNumberToCents } from "./money.ts";

export type ExpensePeriodPreset =
  "today" | "week" | "month" | "last-month" | "year";
export type ExpenseTrendMode = "daily" | "weekly" | "monthly";
export type ExpenseTrendPoint = { date: string; spent: number; income: number };

export function getExpensePresetRange(
  preset: ExpensePeriodPreset,
  now = new Date(),
) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end = new Date(start);
  if (preset === "week") start.setDate(start.getDate() - 6);
  if (preset === "month") {
    start.setDate(1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  }
  if (preset === "last-month") {
    start.setDate(1);
    start.setMonth(start.getMonth() - 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  }
  if (preset === "year") {
    start.setMonth(0, 1);
    end = new Date(start.getFullYear(), 11, 31);
  }
  return { from: todayISO(start), to: todayISO(end) };
}

export function formatExpenseRangeDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : value;
}

function bucketDate(value: string, mode: ExpenseTrendMode) {
  const date = new Date(`${value}T00:00:00Z`);
  if (mode === "weekly")
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  if (mode === "monthly") date.setUTCDate(1);
  return date;
}

export function buildExpenseTrendSeries(
  data: ExpenseTrendPoint[],
  from: string,
  to: string,
  mode: ExpenseTrendMode,
) {
  const start = bucketDate(from, mode);
  const end = bucketDate(to, mode);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    from > to
  )
    return { points: [], tooManyPoints: false };
  const buckets = new Map<string, { spent: bigint; income: bigint }>();
  // Bound SVG work for very long custom ranges; the user can choose a coarser chart interval.
  for (const cursor = new Date(start); cursor <= end;) {
    if (buckets.size >= 480) return { points: [], tooManyPoints: true };
    buckets.set(cursor.toISOString().slice(0, 10), { spent: 0n, income: 0n });
    if (mode === "monthly") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (mode === "weekly" ? 7 : 1));
  }
  for (const point of data) {
    if (point.date < from || point.date > to) continue;
    const date = bucketDate(point.date, mode);
    if (!Number.isFinite(date.getTime())) continue;
    const bucket = buckets.get(date.toISOString().slice(0, 10));
    if (!bucket) continue;
    bucket.spent += moneyNumberToCents(point.spent);
    bucket.income += moneyNumberToCents(point.income);
  }
  return {
    points: [...buckets].map(([date, totals]) => ({
      date,
      spent: moneyCentsToNumber(totals.spent),
      income: moneyCentsToNumber(totals.income),
    })),
    tooManyPoints: false,
  };
}

export type WeeklyExpenseDay = {
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  spent: number;
  income: number;
};

export type WeeklyExpenseGroup = {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  formattedRange: string;
  activeRangeLabel: string;
  days: WeeklyExpenseDay[];
  totalSpent: number;
  totalIncome: number;
};

export function formatExpenseDayDDMMYYYY(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}

export function getExpenseDayOfWeek(dateStr: string, isKhmer = false): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat(isKhmer ? "km-KH" : "en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(d);
}

export function buildWeeklyExpenseBreakdown(
  data: ExpenseTrendPoint[],
  isKhmer = false,
): WeeklyExpenseGroup[] {
  if (!data || !data.length) return [];

  // Group / aggregate unique dates using cents to avoid float drift
  const dateTotals = new Map<string, { spent: bigint; income: bigint }>();
  for (const point of data) {
    if (!point.date) continue;
    if (point.spent <= 0 && point.income <= 0) continue;
    const current = dateTotals.get(point.date) ?? { spent: 0n, income: 0n };
    current.spent += moneyNumberToCents(point.spent);
    current.income += moneyNumberToCents(point.income);
    dateTotals.set(point.date, current);
  }

  if (dateTotals.size === 0) return [];

  const sortedDates = [...dateTotals.keys()].sort((a, b) => a.localeCompare(b));

  const weekMap = new Map<string, WeeklyExpenseDay[]>();
  for (const date of sortedDates) {
    const totals = dateTotals.get(date)!;
    const d = new Date(`${date}T00:00:00Z`);
    const dayIndex = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - dayIndex);
    const weekStart = d.toISOString().slice(0, 10);

    const dayObj: WeeklyExpenseDay = {
      date,
      formattedDate: formatExpenseDayDDMMYYYY(date),
      dayOfWeek: getExpenseDayOfWeek(date, isKhmer),
      spent: moneyCentsToNumber(totals.spent),
      income: moneyCentsToNumber(totals.income),
    };

    const daysInWeek = weekMap.get(weekStart) ?? [];
    daysInWeek.push(dayObj);
    weekMap.set(weekStart, daysInWeek);
  }

  const result: WeeklyExpenseGroup[] = [];
  for (const [weekStart, days] of weekMap) {
    const endD = new Date(`${weekStart}T00:00:00Z`);
    endD.setUTCDate(endD.getUTCDate() + 6);
    const weekEnd = endD.toISOString().slice(0, 10);

    const firstActiveDate = days[0].date;
    const lastActiveDate = days[days.length - 1].date;

    const formattedStart = formatExpenseDayDDMMYYYY(weekStart);
    const formattedEnd = formatExpenseDayDDMMYYYY(weekEnd);
    const formattedRange = `${formattedStart} – ${formattedEnd}`;

    const activeRangeLabel =
      firstActiveDate === lastActiveDate
        ? formatExpenseDayDDMMYYYY(firstActiveDate)
        : `${formatExpenseDayDDMMYYYY(firstActiveDate)} – ${formatExpenseDayDDMMYYYY(lastActiveDate)}`;

    const totalSpentCents = days.reduce(
      (sum, d) => sum + moneyNumberToCents(d.spent),
      0n,
    );
    const totalIncomeCents = days.reduce(
      (sum, d) => sum + moneyNumberToCents(d.income),
      0n,
    );

    result.push({
      weekKey: weekStart,
      weekStart,
      weekEnd,
      formattedRange,
      activeRangeLabel,
      days,
      totalSpent: moneyCentsToNumber(totalSpentCents),
      totalIncome: moneyCentsToNumber(totalIncomeCents),
    });
  }

  return result;
}
