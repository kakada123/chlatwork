import type { ExpenseCurrency } from '@prisma/client';
import { formatTelegramMoney } from './telegram-group-split';
import type { TelegramInlineKeyboard } from './telegram-bot.types';

export type SpendingRange = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';

export interface SpendingQuestion {
  range: SpendingRange;
  category?: string;
}

export interface SpendingEntryView {
  id: string;
  entryDate: Date | null;
  category: string;
  customCategory: string | null;
  note: string;
  amount: { toString(): string } | string | null;
}

export function parseSpendingQuestion(text: string): SpendingQuestion | null {
  const trimmed = text.trim();
  const commandMatch = /^\/spend(?:@[A-Za-z0-9_]+)?(?:\s+(.*))?$/i.exec(
    trimmed,
  );
  const naturalQuestion =
    /^(?:how much|what|show|tell me|តើ|បង្ហាញ)/i.test(trimmed) &&
    /(?:spend|spent|spending|expense|ចំណាយ)/i.test(trimmed);
  if (!commandMatch && !naturalQuestion) return null;

  const body = (commandMatch?.[1] ?? trimmed).trim();
  const normalized = body.toLocaleLowerCase('en-US');
  const range: SpendingRange = /(?:today|ថ្ងៃនេះ)/i.test(normalized)
    ? 'TODAY'
    : /(?:week|7 days|សប្តាហ៍)/i.test(normalized)
      ? 'WEEK'
      : /(?:all time|all|ទាំងអស់)/i.test(normalized)
        ? 'ALL'
        : 'MONTH';

  const afterOn =
    /(?:\bon\b|\bfor\b)\s+(.+?)(?:\s+(?:today|this week|this month|last 7 days|all time))?(?:\?|$)/i.exec(
      body,
    )?.[1];
  const commandCategory = commandMatch
    ? body
        .replace(/\b(?:today|week|month|all|this|last|7|days|time)\b/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    : '';
  const category = (afterOn ?? commandCategory)
    .replace(/[?.!,]+$/g, '')
    .trim()
    .slice(0, 120);

  return { range, ...(category ? { category } : {}) };
}

export function spendingDateRange(range: SpendingRange, localDate: string) {
  if (range === 'ALL') return {};
  if (range === 'TODAY') return { startDate: localDate, endDate: localDate };
  if (range === 'MONTH') {
    return { startDate: `${localDate.slice(0, 7)}-01`, endDate: localDate };
  }
  return { startDate: subtractDays(localDate, 6), endDate: localDate };
}

export function buildSpendingAnswer(
  question: SpendingQuestion,
  localDate: string,
  entries: SpendingEntryView[],
  currency: ExpenseCurrency,
) {
  const total = entries.reduce(
    (sum, entry) => sum + parseCents(String(entry.amount ?? '0')),
    0n,
  );
  const categoryLabel = question.category ? ` on ${question.category}` : '';
  const rangeLabel =
    question.range === 'TODAY'
      ? `today (${localDate})`
      : question.range === 'WEEK'
        ? 'in the last 7 days'
        : question.range === 'MONTH'
          ? `this month (${localDate.slice(0, 7)})`
          : 'across all saved expenses';

  if (!entries.length) {
    return `No expenses found${categoryLabel} ${rangeLabel}.`;
  }

  const categories = new Map<string, bigint>();
  for (const entry of entries) {
    const label =
      entry.category === '__custom__'
        ? entry.customCategory?.trim() || 'Other'
        : entry.category.trim() || 'Other';
    categories.set(
      label,
      (categories.get(label) ?? 0n) + parseCents(String(entry.amount)),
    );
  }
  const top = [...categories.entries()]
    .sort((left, right) =>
      right[1] > left[1] ? 1 : right[1] < left[1] ? -1 : 0,
    )
    .slice(0, 3);

  return [
    `💸 You spent ${formatTelegramMoney(centsToDecimal(total), currency)}${categoryLabel} ${rangeLabel}.`,
    `Entries: ${entries.length}`,
    ...(question.category
      ? []
      : [
          '',
          'Top categories:',
          ...top.map(
            ([category, cents]) =>
              `• ${category}: ${formatTelegramMoney(centsToDecimal(cents), currency)}`,
          ),
        ]),
  ].join('\n');
}

export function buildRecentExpenses(
  entries: SpendingEntryView[],
  currency: ExpenseCurrency,
): { text: string; keyboard: TelegramInlineKeyboard } {
  if (!entries.length) {
    return {
      text: 'No saved expenses yet.',
      keyboard: { inline_keyboard: [] },
    };
  }
  const lines = ['🕘 Recent expenses', ''];
  const keyboard: TelegramInlineKeyboard['inline_keyboard'] = [];
  entries.forEach((entry, index) => {
    const category =
      entry.category === '__custom__'
        ? entry.customCategory?.trim() || 'Other'
        : entry.category.trim() || 'Other';
    const date = entry.entryDate?.toISOString().slice(0, 10) ?? 'No date';
    const label = `${index + 1}. ${category} — ${formatTelegramMoney(
      String(entry.amount ?? '0'),
      currency,
    )} · ${date}`;
    lines.push(label, ...(entry.note ? [`   ${entry.note}`] : []));
    keyboard.push([
      {
        text: `✏️ Edit ${index + 1}`,
        callback_data: `recent:edit:${entry.id}`,
      },
      {
        text: `🗑 Delete ${index + 1}`,
        callback_data: `recent:delete:${entry.id}`,
      },
    ]);
  });
  return { text: lines.join('\n'), keyboard: { inline_keyboard: keyboard } };
}

function subtractDays(localDate: string, days: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function parseCents(value: string) {
  const match = value.match(/^(\d+)(?:\.(\d{1,2}))?/);
  if (!match) return 0n;
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
}

function centsToDecimal(cents: bigint) {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}
