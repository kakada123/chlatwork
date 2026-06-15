export type MoneyCurrency = "USD" | "KHR";

export type MoneyAmountDisplay = {
  value: string;
  full: string;
  isCompact: boolean;
};

export type MoneyInputOptions = {
  allowZero?: boolean;
  maxCents?: bigint;
};

export const MONEY_SCALE = 100n;
export const MAX_MONEY_AMOUNT_CENTS = 999_999_999_999_99n;
export const MAX_MONEY_AMOUNT = Number(MAX_MONEY_AMOUNT_CENTS) / 100;

const COMPACT_AMOUNT_THRESHOLD_CENTS = 1_000_000n * MONEY_SCALE;

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const USD_COMPACT_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  notation: "compact",
  style: "currency",
});

const KHR_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "KHR",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
});

const KHR_COMPACT_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "KHR",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 2,
  notation: "compact",
  style: "currency",
});

function parseDecimalStringToCents(value: string): bigint {
  const [wholeRaw = "0", fractionRaw = ""] = value.split(".");
  const whole = wholeRaw || "0";
  const fraction = `${fractionRaw}000`;
  const cents = BigInt(fraction.slice(0, 2));
  const shouldRoundUp = Number(fraction[2] ?? "0") >= 5;

  return BigInt(whole) * MONEY_SCALE + cents + (shouldRoundUp ? 1n : 0n);
}

function normalizeMoneyString(value: string): string {
  return value.trim().replace(/[$៛,]/g, "").replace(/\s+/g, "");
}

function parseMoneyStringToCents(value: string): bigint | null {
  const cleaned = normalizeMoneyString(value);

  if (!cleaned) {
    return null;
  }

  const sign = cleaned.startsWith("-") ? -1n : 1n;
  const unsigned =
    cleaned.startsWith("-") || cleaned.startsWith("+")
      ? cleaned.slice(1)
      : cleaned;

  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(unsigned)) {
    return null;
  }

  return parseDecimalStringToCents(unsigned) * sign;
}

export function moneyCentsToNumber(cents: bigint): number {
  return Number(cents) / Number(MONEY_SCALE);
}

export function moneyNumberToCents(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return 0n;
  }

  if (typeof value === "string") {
    return parseMoneyStringToCents(value) ?? 0n;
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0n;
  }

  const sign = numberValue < 0 ? -1n : 1n;
  const absoluteValue = Math.abs(numberValue);
  const cents = parseDecimalStringToCents(absoluteValue.toFixed(2));

  return cents * sign;
}

export function parseMoneyInputToCents(
  input: string,
  options: MoneyInputOptions = {},
): bigint {
  const cleaned = normalizeMoneyString(input ?? "");

  if (!cleaned) {
    throw new Error("Amount is required.");
  }

  if (cleaned.startsWith("-")) {
    throw new Error("Amount must be greater than 0.");
  }

  if (!/^\+?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) {
    throw new Error("Invalid amount.");
  }

  const cents = parseMoneyStringToCents(cleaned) ?? 0n;

  if (options.allowZero ? cents < 0n : cents <= 0n) {
    throw new Error("Amount must be greater than 0.");
  }

  const maxCents = options.maxCents ?? MAX_MONEY_AMOUNT_CENTS;
  if (cents > maxCents) {
    throw new Error(
      `Amount must be ${formatMoneyAmount(MAX_MONEY_AMOUNT, "USD")} or less.`,
    );
  }

  return cents;
}

export function parseMoneyInput(
  input: string,
  options?: MoneyInputOptions,
): number {
  return moneyCentsToNumber(parseMoneyInputToCents(input, options));
}

export function roundMoney(value: unknown): number {
  return moneyCentsToNumber(moneyNumberToCents(value));
}

export function addMoney(valueA: unknown, valueB: unknown): number {
  return moneyCentsToNumber(
    moneyNumberToCents(valueA) + moneyNumberToCents(valueB),
  );
}

export function subtractMoney(valueA: unknown, valueB: unknown): number {
  return moneyCentsToNumber(
    moneyNumberToCents(valueA) - moneyNumberToCents(valueB),
  );
}

export function sumMoneyCents(values: readonly unknown[]): bigint {
  return values.reduce<bigint>(
    (sum, value) => sum + moneyNumberToCents(value),
    0n,
  );
}

export function divideMoneyCents(cents: bigint, divisor: number): bigint {
  if (divisor <= 0) {
    return 0n;
  }

  const divisorCents = BigInt(divisor);
  return (cents + divisorCents / 2n) / divisorCents;
}

export function roundKhrDownCents(cents: bigint): bigint {
  const oneHundredRielCents = 10_000n;
  return (cents / oneHundredRielCents) * oneHundredRielCents;
}

function formatCents(
  cents: bigint,
  currency: MoneyCurrency,
  compact = false,
): string {
  const formatter =
    currency === "KHR"
      ? compact
        ? KHR_COMPACT_FORMATTER
        : KHR_FORMATTER
      : compact
        ? USD_COMPACT_FORMATTER
        : USD_FORMATTER;

  return formatter.format(moneyCentsToNumber(cents));
}

export function formatMoneyAmount(
  value: unknown,
  currency: MoneyCurrency,
): string {
  return formatMoneyAmountDisplay(value, currency).full;
}

export function formatMoneyAmountDisplay(
  value: unknown,
  currency: MoneyCurrency,
): MoneyAmountDisplay {
  const cents = moneyNumberToCents(value);
  const full = formatCents(cents, currency);
  const isCompact =
    cents <= -COMPACT_AMOUNT_THRESHOLD_CENTS ||
    cents >= COMPACT_AMOUNT_THRESHOLD_CENTS;

  return {
    value: isCompact ? formatCents(cents, currency, true) : full,
    full,
    isCompact,
  };
}

export function moneyTone(value: unknown): "positive" | "negative" | "neutral" {
  const cents = moneyNumberToCents(value);

  if (cents > 0n) {
    return "positive";
  }

  if (cents < 0n) {
    return "negative";
  }

  return "neutral";
}
