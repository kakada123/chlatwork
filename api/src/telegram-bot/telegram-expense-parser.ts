export type TelegramExpenseCurrency = 'USD' | 'KHR';

export interface ParsedTelegramExpense {
  amount: string;
  currency: TelegramExpenseCurrency;
  category: string;
  note: string;
}

export class TelegramExpenseParseError extends Error {}

const CATEGORY_KEYWORDS: ReadonlyArray<{
  category: string;
  keywords: readonly string[];
}> = [
  { category: 'Coffee', keywords: ['coffee', 'cafe', 'latte', 'កាហ្វេ'] },
  {
    category: 'Food',
    keywords: [
      'food',
      'breakfast',
      'lunch',
      'dinner',
      'meal',
      'rice',
      'noodle',
      'បាយ',
      'អាហារ',
      'ម្ហូប',
    ],
  },
  {
    category: 'Transport',
    keywords: [
      'transport',
      'taxi',
      'grab',
      'tuktuk',
      'tuk tuk',
      'bus',
      'fuel',
      'gas',
      'សាំង',
      'តាក់ស៊ី',
    ],
  },
  { category: 'Rent', keywords: ['rent', 'ជួល'] },
  {
    category: 'Bills',
    keywords: ['bill', 'electricity', 'water', 'utility', 'ភ្លើង', 'ទឹក'],
  },
  { category: 'Internet', keywords: ['internet', 'wifi', 'data'] },
  {
    category: 'Shopping',
    keywords: ['shopping', 'shop', 'clothes', 'market', 'ទិញ', 'ផ្សារ'],
  },
  {
    category: 'Health',
    keywords: ['health', 'doctor', 'hospital', 'medicine', 'ពេទ្យ', 'ថ្នាំ'],
  },
  {
    category: 'Entertainment',
    keywords: ['entertainment', 'movie', 'cinema', 'game', 'ភាពយន្ត'],
  },
  { category: 'Loan', keywords: ['loan', 'debt', 'កម្ចី', 'បំណុល'] },
  { category: 'Braces', keywords: ['braces', 'orthodontic'] },
];

const AMOUNT_TOKEN = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?:\$\s*)?` +
    String.raw`(?:[1-9]\d{0,2}(?:,\d{3}){1,3}|0|[1-9]\d{0,11})` +
    String.raw`(?:\.\d{1,2})?(?:\s*(?:USD|KHR|៛))?(?![\p{L}\p{N}])`,
  'giu',
);

function currencyFromToken(token: string): TelegramExpenseCurrency | null {
  if (/\$|USD/i.test(token)) return 'USD';
  if (/៛|KHR/i.test(token)) return 'KHR';
  return null;
}

function normalizeAmount(token: string) {
  const value = token
    .replace(/USD|KHR|៛|\$/gi, '')
    .replace(/,/g, '')
    .trim();
  const match = value.match(/^(0|[1-9]\d{0,11})(?:\.(\d{1,2}))?$/);
  if (!match) throw new TelegramExpenseParseError('Amount is invalid or too large.');

  if (BigInt(match[1]) === 0n && !/[1-9]/.test(match[2] ?? '')) {
    throw new TelegramExpenseParseError('Amount must be greater than zero.');
  }

  const fraction = match[2]?.replace(/0+$/, '');
  return fraction ? `${match[1]}.${fraction}` : match[1];
}

function inferCategory(note: string) {
  const normalized = note.toLocaleLowerCase('en-US');
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.category;
    }
  }
  return 'Other';
}

export function parseTelegramExpense(
  text: string,
  accountCurrency: TelegramExpenseCurrency,
): ParsedTelegramExpense {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) {
    throw new TelegramExpenseParseError('Send a short expense such as “Lunch 4.50”.');
  }

  const matches = [...trimmed.matchAll(AMOUNT_TOKEN)];
  if (matches.length !== 1) {
    throw new TelegramExpenseParseError(
      matches.length
        ? 'Please include only one amount.'
        : 'Include an amount, for example “Lunch 4.50” or “បាយ 15000៛”.',
    );
  }

  const match = matches[0];
  const explicitCurrency = currencyFromToken(match[0]);
  if (explicitCurrency && explicitCurrency !== accountCurrency) {
    throw new TelegramExpenseParseError(
      `This tracker uses ${accountCurrency}. Change its currency in ChlatWork ` +
        `before saving ${explicitCurrency}.`,
    );
  }

  const note = `${trimmed.slice(0, match.index)} ${trimmed.slice(
    (match.index ?? 0) + match[0].length,
  )}`
    .replace(/^[\s,:;\-–—]+|[\s,:;\-–—]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    amount: normalizeAmount(match[0]),
    currency: accountCurrency,
    category: inferCategory(note),
    note,
  };
}

export function formatTelegramExpenseAmount(
  amount: string,
  currency: TelegramExpenseCurrency,
) {
  const [whole, fraction = ''] = amount.split('.');
  if (currency === 'KHR') {
    const rounded = BigInt(whole) + (Number(fraction.padEnd(2, '0').slice(0, 2)) >= 50 ? 1n : 0n);
    return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}៛`;
  }
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${grouped}.${fraction.padEnd(2, '0')}`;
}
