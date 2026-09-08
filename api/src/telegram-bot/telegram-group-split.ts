import type { ExpenseCurrency } from '@prisma/client';
import type { TelegramInlineKeyboard } from './telegram-bot.types';

const MAX_PARTICIPANTS = 8;
const AMOUNT_PATTERN =
  /^(\$\s*)?([1-9]\d{0,11}(?:\.\d{1,2})?)(?:\s*(USD|KHR|៛))?/i;

export interface ParsedTelegramSplit {
  total: string;
  currency: ExpenseCurrency;
  participants: Array<{
    position: number;
    name: string;
    amount: string;
    telegramUserId?: string;
  }>;
}

export interface TelegramSplitView {
  id: string;
  title: string;
  total: { toString(): string } | string;
  currency: ExpenseCurrency;
  status: string;
  participants: Array<{
    id: string;
    position: number;
    name: string;
    amount: { toString(): string } | string;
    telegramDisplayName: string | null;
    paidAt: Date | null;
  }>;
}

export class TelegramSplitParseError extends Error {}

export function parseTelegramSplit(
  text: string,
  accountCurrency: ExpenseCurrency,
  joinedMembers?: Array<{ telegramUserId: string; displayName: string }>,
): ParsedTelegramSplit {
  const body = text.trim().replace(/^\/split(?:@[A-Za-z0-9_]+)?\s*/i, '');
  const amountMatch = AMOUNT_PATTERN.exec(body);
  if (!amountMatch) {
    throw new TelegramSplitParseError('Use /split 60 Alice, Bob, Carol');
  }

  const explicitCurrency = amountMatch[1]
    ? 'USD'
    : /KHR|៛/i.test(amountMatch[3] ?? '')
      ? 'KHR'
      : /USD/i.test(amountMatch[3] ?? '')
        ? 'USD'
        : null;
  if (explicitCurrency && explicitCurrency !== accountCurrency) {
    throw new TelegramSplitParseError(
      `Your ChlatWork tracker uses ${accountCurrency}.`,
    );
  }

  const nameText = body.slice(amountMatch[0].length).trim();
  if (joinedMembers && nameText) {
    throw new TelegramSplitParseError(
      'Reply with only the total; participants come from the final vote.',
    );
  }
  const names =
    joinedMembers?.map((member) => member.displayName) ??
    body
      .slice(amountMatch[0].length)
      .replace(/^[\s,:;\-–—]+/, '')
      .split(',')
      .map((name) => name.trim().replace(/\s{2,}/g, ' '))
      .filter(Boolean);
  if (
    names.length < (joinedMembers ? 1 : 2) ||
    names.length > (joinedMembers ? 50 : MAX_PARTICIPANTS)
  ) {
    throw new TelegramSplitParseError(
      joinedMembers
        ? 'The equal split needs 1–50 joined participants.'
        : `Add 2-${MAX_PARTICIPANTS} comma-separated names.`,
    );
  }
  if (names.some((name) => name.length > 80)) {
    throw new TelegramSplitParseError(
      'Participant names must be 80 characters or less.',
    );
  }
  const uniqueNames = new Set(
    names.map((name) => name.toLocaleLowerCase('en-US')),
  );
  if (!joinedMembers && uniqueNames.size !== names.length) {
    throw new TelegramSplitParseError(
      'Each participant name must be different.',
    );
  }

  const totalCents = parseMoneyCents(amountMatch[2]);
  // Riel shares use whole riel so the displayed shares still add up to the bill.
  if (accountCurrency === 'KHR' && totalCents % 100n !== 0n) {
    throw new TelegramSplitParseError('Use a whole-riel bill total.');
  }
  const unit = accountCurrency === 'KHR' ? 100n : 1n;
  const totalUnits = totalCents / unit;
  if (totalUnits < BigInt(names.length)) {
    throw new TelegramSplitParseError('The total is too small to split.');
  }
  const base = totalUnits / BigInt(names.length);
  const remainder = totalUnits % BigInt(names.length);

  return {
    total: centsToDecimal(totalCents),
    currency: accountCurrency,
    participants: names.map((name, position) => ({
      position,
      name,
      amount: centsToDecimal(
        (base + (BigInt(position) < remainder ? 1n : 0n)) * unit,
      ),
      ...(joinedMembers
        ? { telegramUserId: joinedMembers[position]!.telegramUserId }
        : {}),
    })),
  };
}

export function buildTelegramSplitMessage(split: TelegramSplitView) {
  const paid = split.participants.filter(
    (participant) => participant.paidAt,
  ).length;
  const lines = [
    `🧾 ${split.title}`,
    `Total: ${formatTelegramMoney(String(split.total), split.currency)}`,
    `Paid: ${paid}/${split.participants.length}`,
    '',
    ...[...split.participants]
      .sort((left, right) => left.position - right.position)
      .map((participant) => {
        const marker = participant.paidAt ? '✅' : '⬜';
        const payer =
          participant.telegramDisplayName &&
          participant.telegramDisplayName !== participant.name
            ? ` — ${split.participants.length > 8 ? truncate(participant.telegramDisplayName, 16) : participant.telegramDisplayName}`
            : '';
        return `${marker} ${split.participants.length > 8 ? truncate(participant.name, 32) : participant.name}: ${formatTelegramMoney(
          String(participant.amount),
          split.currency,
        )}${payer}`;
      }),
    '',
    paid === split.participants.length
      ? 'Everyone is marked paid 🎉'
      : 'Tap your name when you have paid. Tap again to undo.',
  ];
  return lines.join('\n');
}

export function buildTelegramSplitKeyboard(
  split: TelegramSplitView,
): TelegramInlineKeyboard {
  if (split.status !== 'OPEN') return { inline_keyboard: [] };
  return {
    inline_keyboard: [...split.participants]
      .sort((left, right) => left.position - right.position)
      .map((participant) => [
        {
          text: `${participant.paidAt ? '✅' : '⬜'} ${truncate(participant.name, 42)}`,
          callback_data: `split:toggle:${participant.id}`,
        },
      ]),
  };
}

export function formatTelegramMoney(
  amount: string,
  currency: ExpenseCurrency | 'USD' | 'KHR',
) {
  const cents = parseMoneyCents(amount);
  if (currency === 'KHR') {
    const rounded = (cents + 50n) / 100n;
    return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}៛`;
  }
  const whole = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${whole}.${(cents % 100n).toString().padStart(2, '0')}`;
}

export function parseMoneyCents(value: string) {
  const match = value.trim().match(/^(0|[1-9]\d{0,11})(?:\.(\d{1,2}))?$/);
  if (!match)
    throw new TelegramSplitParseError('Amount is invalid or too large.');
  const cents =
    BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  if (cents <= 0n)
    throw new TelegramSplitParseError('Amount must be greater than zero.');
  return cents;
}

function centsToDecimal(cents: bigint) {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
