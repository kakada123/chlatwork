/** Pure scheduling rules shared by the browser and API to keep previews consistent. */
export interface WeeklyWorkEntry {
  shiftCode?: string | null;
  leaveCode?: string | null;
  status?: string;
}

export const MAX_WEEKLY_WORKDAYS = 6;
export const MAX_MONTHLY_PRD = 7;

export function rosterPrdAllowance(value = MAX_MONTHLY_PRD): number {
  return Math.max(0, Math.min(MAX_MONTHLY_PRD, value));
}

export function rosterMonthPrdCount(
  date: string,
  entries: ReadonlyMap<string, WeeklyWorkEntry>,
): number {
  return [...entries].filter(
    ([key, entry]) =>
      key.startsWith(date.slice(0, 7)) &&
      entry.leaveCode === "PRD" &&
      entry.status !== "CANCELLED",
  ).length;
}

/** Existing confirmed/requested leave has already reserved credit and may be edited without a second debit. */
export function rosterDayViolation(
  date: string,
  next: WeeklyWorkEntry,
  entries: ReadonlyMap<string, WeeklyWorkEntry>,
  available: { AL: number; PHL: number },
  prdAllowance = MAX_MONTHLY_PRD,
): string | null {
  const previous = entries.get(date);
  const planned = new Map(entries).set(date, next);
  if (rosterMonthPrdCount(date, planned) > rosterPrdAllowance(prdAllowance))
    return "PRD cannot exceed the monthly allowance (maximum 7 days).";
  if (rosterWeekWorkdays(date, planned) > MAX_WEEKLY_WORKDAYS)
    return "Employees cannot work more than 6 days in a Monday-Sunday week.";
  if (next.status === "CANCELLED") return null;
  const bucket = (code?: string | null) =>
    code === "PHL"
      ? "PHL"
      : code === "AL" || code === "H1" || code === "H2"
        ? "AL"
        : null;
  const cost = (code?: string | null) =>
    code === "H1" || code === "H2" ? 1 : 2;
  const target = bucket(next.leaveCode);
  if (target) {
    const reserved =
      bucket(previous?.leaveCode) === target &&
      (previous?.status === "CONFIRMED" || previous?.status === "REQUESTED")
        ? cost(previous.leaveCode)
        : 0;
    if (cost(next.leaveCode) > available[target] + reserved)
      return `Insufficient ${target} balance for this year. Configure available leave first.`;
  }
  return null;
}

export function rosterWeekStart(date: string): Date {
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

export function rosterMonthWeekRange(year: number, month: number) {
  const start = rosterWeekStart(`${year}-${String(month).padStart(2, "0")}-01`);
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const end = rosterWeekStart(last);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end };
}

export function rosterWorkdayWeight(entry?: WeeklyWorkEntry): number {
  if (!entry?.shiftCode || entry.status === "CANCELLED") return 0;
  if (entry.leaveCode === "H1" || entry.leaveCode === "H2") return 0.5;
  return entry.leaveCode ? 0 : 1;
}

export function rosterWeekWorkdays(
  date: string,
  entries: ReadonlyMap<string, WeeklyWorkEntry>,
): number {
  const start = rosterWeekStart(date);
  let total = 0;
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + offset);
    total += rosterWorkdayWeight(entries.get(day.toISOString().slice(0, 10)));
  }
  return total;
}

export function rosterOverLimitWeeks(
  year: number,
  month: number,
  entries: ReadonlyMap<string, WeeklyWorkEntry>,
): string[] {
  const weeks = new Set<string>();
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= lastDay; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (rosterWeekWorkdays(date, entries) > MAX_WEEKLY_WORKDAYS)
      weeks.add(rosterWeekStart(date).toISOString().slice(0, 10));
  }
  return [...weeks];
}
