import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

export type ExpenseCurrency = "USD" | "KHR";
export type MoneyType = "expense" | "income";
export type ExpenseRangeMode = "all" | "month" | "week" | "today";

export type ExpenseRow = {
  type?: MoneyType;
  date: string;
  category: string;
  customCategory?: string;
  note: string;
  showNote?: boolean;
  amount: string;
};

export type Budget = {
  period: "monthly" | "weekly";
  amount: string;
};

export type Breakdown = {
  category: string;
  total: number;
  percent: number;
};

export type ExpenseItem = {
  date: string;
  category: string;
  note: string;
  amount: number;
  type: MoneyType;
};

export type ExpenseBudgetStatus = {
  label: string;
  text: string;
  bg: string;
  bar: string;
};

export type ExpenseTrackerSharePayload = {
  c?: ExpenseCurrency;
  r?: ExpenseRangeMode;
  b?: Budget;
  t?: string;
  rows?: ExpenseRow[];
};

export type ExpenseExampleState = {
  rows: ExpenseRow[];
  budget: Budget;
  rangeMode: ExpenseRangeMode;
  raw: string;
};

export const expenseCategories = [
  "Food",
  "Coffee",
  "Transport",
  "Rent",
  "Bills",
  "Internet",
  "Shopping",
  "Health",
  "Entertainment",
  "Loan",
  "Braces",
  "Other",
] as const;

export const incomeCategories = [
  "Salary",
  "Bonus",
  "Freelance",
  "Seniority",
  "OT",
  "Gift",
  "Allowance",
  "Other",
] as const;

export function roundExpense(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function todayISO(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export function startOfMonthISO(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

export function isoToDate(value: string): Date | null {
  const [year, month, day] = (value || "").split("-").map((segment) => Number(segment));
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function formatExpenseAmount(
  value: number,
  currency: ExpenseCurrency,
): string {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  if (currency === "KHR") {
    return `${sign}${absoluteValue.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}៛`;
  }

  return `${sign}$${absoluteValue.toFixed(2)}`;
}

export function parseExpenseAmount(input: string): number {
  const cleaned = (input ?? "").trim().replace(/\$/g, "").replace(/៛/g, "");
  const value = Number(cleaned);

  if (Number.isNaN(value)) {
    throw new Error("Invalid amount.");
  }

  return value;
}

export function createExpenseRow(
  category = "Food",
  date = todayISO(),
): ExpenseRow {
  return {
    type: "expense",
    date,
    category,
    note: "",
    amount: "",
    showNote: false,
  };
}

export function createIncomeRow(
  category = "Salary",
  date = todayISO(),
): ExpenseRow {
  return {
    type: "income",
    date,
    category,
    note: "",
    amount: "",
    showNote: false,
  };
}

export function createDefaultExpenseRows(now = new Date()): ExpenseRow[] {
  const date = todayISO(now);
  return [createExpenseRow("Food", date), createExpenseRow("Coffee", date)];
}

export function createDefaultBudget(): Budget {
  return {
    period: "monthly",
    amount: "",
  };
}

export function getPresetCategoriesForExpenseRow(row: ExpenseRow): string[] {
  return (row.type ?? "expense") === "income"
    ? [...incomeCategories]
    : [...expenseCategories];
}

export function resolveExpenseCategory(row: ExpenseRow): string {
  const category = (row.category ?? "").trim();
  if (category === "__custom__") {
    return (row.customCategory ?? "").trim();
  }

  return category;
}

export function normalizeCategoryToExpenseRow(
  categoryRaw: string,
  type: MoneyType,
): {
  category: string;
  customCategory?: string;
} {
  const category = (categoryRaw ?? "").trim();
  if (!category) {
    return { category: "" };
  }

  const presets = type === "income" ? incomeCategories : expenseCategories;
  const presetMatch = presets.find(
    (preset) => preset.toLowerCase() === category.toLowerCase(),
  );

  if (presetMatch) {
    return { category: presetMatch };
  }

  return {
    category: "__custom__",
    customCategory: category,
  };
}

export function getExpenseRangeLabel(rangeMode: ExpenseRangeMode): string {
  if (rangeMode === "all") return "All";
  if (rangeMode === "month") return "This month";
  if (rangeMode === "week") return "Last 7 days";
  return "Today";
}

function filterExpenseItemsByRange(
  items: ExpenseItem[],
  rangeMode: ExpenseRangeMode,
  now = new Date(),
): ExpenseItem[] {
  if (rangeMode === "all") {
    return items;
  }

  const today = todayISO(now);
  const monthStart = startOfMonthISO(now);
  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - 6);
  const weekStart = todayISO(weekStartDate);

  return items.filter((item) => {
    if (rangeMode === "today") return item.date === today;
    if (rangeMode === "month") return item.date >= monthStart;
    if (rangeMode === "week") return item.date >= weekStart;
    return true;
  });
}

export function collectExpenseItems(
  rows: ExpenseRow[],
  rangeMode: ExpenseRangeMode,
  now = new Date(),
): {
  items: ExpenseItem[];
  error: string;
} {
  let error = "";
  const parsedItems: ExpenseItem[] = [];

  for (const row of rows) {
    const type = (row.type ?? "expense") as MoneyType;
    const date = (row.date ?? "").trim();
    const category = resolveExpenseCategory(row);
    const note = (row.note ?? "").trim();
    const amountRaw = (row.amount ?? "").trim();
    const hasAny =
      date || category || note || amountRaw || (row.customCategory ?? "").trim();

    if (!hasAny) {
      continue;
    }

    if (!date) {
      error = "Missing date in a row.";
      continue;
    }

    if (!category) {
      error = "Missing category in a row.";
      continue;
    }

    if (!amountRaw) {
      error = `Missing amount for "${category}".`;
      continue;
    }

    try {
      parsedItems.push({
        date,
        category,
        note,
        amount: roundExpense(parseExpenseAmount(amountRaw)),
        type,
      });
    } catch (caughtError: any) {
      error = caughtError?.message || "Invalid amount";
    }
  }

  return {
    items: filterExpenseItemsByRange(parsedItems, rangeMode, now),
    error,
  };
}

export function getTotalSpent(items: ExpenseItem[]): number {
  return roundExpense(
    items
      .filter((item) => item.type !== "income")
      .reduce((sum, item) => sum + item.amount, 0),
  );
}

export function getTotalIncome(items: ExpenseItem[]): number {
  return roundExpense(
    items
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0),
  );
}

export function getNetBalance(
  totalIncome: number,
  totalSpent: number,
): number {
  return roundExpense(totalIncome - totalSpent);
}

export function getExpenseDateSpanDays(items: ExpenseItem[]): number {
  if (!items.length) {
    return 0;
  }

  const dates = items
    .map((item) => item.date)
    .filter(Boolean)
    .sort();

  const min = isoToDate(dates[0]);
  const max = isoToDate(dates[dates.length - 1]);
  if (!min || !max) {
    return 1;
  }

  const diff = Math.floor(
    (max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(1, diff + 1);
}

export function getExpenseDailyAverage(
  items: ExpenseItem[],
  totalSpent: number,
  dateSpanDays: number,
): number {
  const expenseOnly = items.filter((item) => item.type !== "income");
  if (!expenseOnly.length || !dateSpanDays) {
    return 0;
  }

  return roundExpense(totalSpent / dateSpanDays);
}

export function getBudgetValue(budget: Budget): number {
  const rawValue = (budget.amount ?? "").trim();
  if (!rawValue) {
    return 0;
  }

  try {
    return Math.max(0, parseExpenseAmount(rawValue));
  } catch {
    return 0;
  }
}

export function getBudgetRemaining(
  budgetValue: number,
  totalSpent: number,
): number {
  return roundExpense(budgetValue - totalSpent);
}

export function getBudgetPercent(
  totalSpent: number,
  budgetValue: number,
): number {
  if (!budgetValue) {
    return 0;
  }

  return Math.round((totalSpent / budgetValue) * 100);
}

export function getBudgetStatus(
  budgetValue: number,
  budgetRemaining: number,
): ExpenseBudgetStatus {
  if (!budgetValue) {
    return {
      label: "Set budget",
      text: "text-gray-600",
      bg: "bg-white",
      bar: "bg-gray-300",
    };
  }

  const ratio = budgetRemaining / budgetValue;

  if (budgetRemaining < 0) {
    return {
      label: "Over budget 💀",
      text: "text-red-700",
      bg: "bg-red-50 border-red-200",
      bar: "bg-red-500",
    };
  }

  if (ratio <= 0.1) {
    return {
      label: "Bro stop 😭",
      text: "text-red-700",
      bg: "bg-red-50 border-red-200",
      bar: "bg-red-500",
    };
  }

  if (ratio <= 0.3) {
    return {
      label: "Careful 🟡",
      text: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
      bar: "bg-yellow-500",
    };
  }

  return {
    label: "Safe ✅",
    text: "text-green-700",
    bg: "bg-green-50 border-green-200",
    bar: "bg-green-500",
  };
}

export function buildExpenseBreakdown(
  items: ExpenseItem[],
  totalSpent: number,
): Breakdown[] {
  const expenseOnly = items.filter((item) => item.type !== "income");
  if (!expenseOnly.length) {
    return [];
  }

  const totals = new Map<string, number>();
  for (const item of expenseOnly) {
    totals.set(
      item.category,
      roundExpense((totals.get(item.category) || 0) + item.amount),
    );
  }

  const safeTotal = totalSpent || 1;

  return [...totals.entries()]
    .map(([category, total]) => ({
      category,
      total,
      percent: (total / safeTotal) * 100,
    }))
    .sort((left, right) => right.total - left.total);
}

export function getTopExpenseItems(
  items: ExpenseItem[],
  limit = 5,
): ExpenseItem[] {
  return [...items]
    .filter((item) => item.type !== "income")
    .sort((left, right) => right.amount - left.amount)
    .slice(0, limit);
}

export function buildExpenseInsights(input: {
  currency: ExpenseCurrency;
  items: ExpenseItem[];
  totalIncome: number;
  totalSpent: number;
  netBalance: number;
  categoryBreakdown: Breakdown[];
  topExpenses: ExpenseItem[];
  budgetValue: number;
  budgetRemaining: number;
  dailyAvg: number;
}): string[] {
  if (!input.items.length) {
    return [];
  }

  const format = (value: number) => formatExpenseAmount(value, input.currency);
  const messages: string[] = [];

  if (input.totalIncome > 0) messages.push(`Income: ${format(input.totalIncome)}.`);
  if (input.totalSpent > 0) messages.push(`Spent: ${format(input.totalSpent)}.`);
  if (input.totalIncome > 0 || input.totalSpent > 0) {
    messages.push(`Net: ${format(input.netBalance)}.`);
  }

  const biggestCategory = input.categoryBreakdown[0];
  if (biggestCategory) {
    messages.push(
      `Biggest expense: ${biggestCategory.category} (${Math.round(biggestCategory.percent)}%).`,
    );
  }

  const topExpense = input.topExpenses[0];
  if (topExpense) {
    messages.push(`Top expense: ${topExpense.category} — ${format(topExpense.amount)}.`);
  }

  if (input.budgetValue) {
    if (input.budgetRemaining < 0) {
      messages.push(
        `You exceeded your budget by ${format(Math.abs(input.budgetRemaining))}.`,
      );
    } else {
      messages.push(`Remaining budget: ${format(input.budgetRemaining)}.`);
    }

    if (input.dailyAvg > 0 && input.budgetRemaining > 0) {
      const daysLeft = Math.floor(input.budgetRemaining / input.dailyAvg);
      messages.push(`At this pace, budget lasts about ${daysLeft} day(s).`);
    }
  } else {
    messages.push("Set a budget to unlock the spicy warnings 😄");
  }

  return messages;
}

export function parseExpenseRaw(raw: string): ExpenseRow[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const nextRows: ExpenseRow[] = [];

  for (const line of lines) {
    const parts = line.split(/\t|,/).map((segment) => segment.trim());
    if (parts.length < 4) {
      throw new Error(`Invalid line: "${line}"`);
    }

    const date = parts[0];
    const maybeType = (parts[1] || "").toLowerCase();
    const hasType = maybeType === "expense" || maybeType === "income";
    const type = (hasType ? maybeType : "expense") as MoneyType;
    const categoryRaw = hasType ? parts[2] : parts[1];
    const note = hasType ? (parts[3] ?? "") : (parts[2] ?? "");
    const amount = (hasType ? parts.slice(4) : parts.slice(3)).join(" ").trim();
    const normalizedCategory = normalizeCategoryToExpenseRow(categoryRaw, type);

    nextRows.push({
      type,
      date,
      category: normalizedCategory.category,
      customCategory: normalizedCategory.customCategory,
      note,
      showNote: false,
      amount,
    });
  }

  return nextRows;
}

export function buildExpenseSharePayload(
  payload: ExpenseTrackerSharePayload,
): string {
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function parseExpenseSharePayload(
  value: string,
): ExpenseTrackerSharePayload {
  const json = decompressFromEncodedURIComponent(value);
  if (!json) {
    throw new Error("Invalid share payload");
  }

  return JSON.parse(json) as ExpenseTrackerSharePayload;
}

export function buildExpenseSummaryLines(input: {
  currency: ExpenseCurrency;
  rangeLabel: string;
  itemsCount: number;
  totalIncome: number;
  totalSpent: number;
  netBalance: number;
  dailyAvg: number;
  budget: Budget;
  budgetValue: number;
  budgetRemaining: number;
  budgetPercent: number;
  categoryBreakdown: Breakdown[];
}): string[] {
  const format = (value: number) => formatExpenseAmount(value, input.currency);
  const lines: string[] = [];

  lines.push(`Expense Tracker (${input.rangeLabel})`);
  lines.push(`Items: ${input.itemsCount}`);
  lines.push(`Income: ${format(input.totalIncome)}`);
  lines.push(`Spent: ${format(input.totalSpent)}`);
  lines.push(`Net: ${format(input.netBalance)}`);
  lines.push(`Daily avg (spent): ${format(input.dailyAvg)}`);

  if (input.budgetValue) {
    lines.push(`Budget (${input.budget.period}): ${format(input.budgetValue)}`);
    lines.push(
      `Remaining: ${format(input.budgetRemaining)} (${input.budgetPercent}%)`,
    );
  }

  lines.push("");
  lines.push("Top expense categories:");

  for (const category of input.categoryBreakdown.slice(0, 5)) {
    lines.push(
      `- ${category.category}: ${format(category.total)} (${Math.round(category.percent)}%)`,
    );
  }

  return lines;
}

export function getExpenseExampleState(now = new Date()): ExpenseExampleState {
  const date = todayISO(now);

  return {
    rows: [
      { ...createIncomeRow("Salary", date), note: "Jan", amount: "740" },
      { ...createIncomeRow("Bonus", date), amount: "20" },
      { ...createExpenseRow("Food", date), note: "Lunch", amount: "4.5" },
      { ...createExpenseRow("Coffee", date), note: "Latte", amount: "2.0" },
      {
        ...createExpenseRow("Transport", date),
        note: "Tuk tuk",
        amount: "1.5",
      },
      { ...createExpenseRow("Rent", date), note: "Monthly", amount: "100" },
      {
        ...createExpenseRow("__custom__", date),
        customCategory: "Gym",
        amount: "15",
      },
    ],
    budget: { period: "monthly", amount: "200" },
    rangeMode: "month",
    raw: `2026-01-29, income, Salary, Jan, 740
2026-01-29, income, Bonus, , 20
2026-01-29, expense, Food, lunch, 4.5
2026-01-29, expense, Coffee, latte, 2.0
2026-01-29, expense, Transport, tuk tuk, 1.5
2026-01-29, expense, Rent, monthly, 100
2026-01-29, expense, Gym, , 15`,
  };
}
