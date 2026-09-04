import { formatTelegramExpenseAmount } from './telegram-expense-parser';

interface TodayExpense {
  category: string;
  customCategory?: string | null;
  amount: string;
}

function parseCents(value: string) {
  const match = value.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return 0n;
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

function formatCents(cents: bigint, currency: 'USD' | 'KHR') {
  return formatTelegramExpenseAmount(
    `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`,
    currency,
  );
}

export function buildTelegramTodaySummary(
  localDate: string,
  currency: 'USD' | 'KHR',
  expenses: TodayExpense[],
) {
  const categoryTotals = new Map<string, bigint>();
  let totalCents = 0n;

  for (const expense of expenses) {
    const amountCents = parseCents(expense.amount);
    if (amountCents <= 0n) continue;
    const category =
      expense.category === '__custom__'
        ? expense.customCategory?.trim() || 'Other'
        : expense.category.trim() || 'Other';
    totalCents += amountCents;
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0n) + amountCents);
  }

  const categories = [...categoryTotals.entries()].sort((left, right) =>
    left[1] === right[1] ? 0 : left[1] > right[1] ? -1 : 1,
  );
  const lines = [
    `📊 Today — ${localDate}`,
    `Spent: ${formatCents(totalCents, currency)}`,
    `Entries: ${expenses.length}`,
  ];

  if (!categories.length) {
    lines.push('', 'No expenses recorded yet.');
    return lines.join('\n');
  }

  lines.push('', 'By category:');
  const visible = categories.slice(0, 12);
  for (const [category, amountCents] of visible) {
    lines.push(`• ${category}: ${formatCents(amountCents, currency)}`);
  }
  if (categories.length > visible.length) {
    lines.push(`• …and ${categories.length - visible.length} more categories`);
  }
  return lines.join('\n');
}
