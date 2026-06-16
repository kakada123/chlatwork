import lzString from "lz-string";
import type { MoneyCurrency } from "./money.ts";
import {
  divideMoneyCents,
  formatMoneyAmount,
  moneyCentsToNumber,
  moneyNumberToCents,
  parseMoneyInputToCents,
  roundKhrDownCents,
  roundMoney,
} from "./money.ts";

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } =
  lzString;

export type PaybackCurrency = MoneyCurrency;

export type PaybackPerson = {
  name: string;
  paid: number;
  paidCents?: bigint;
  balance: number;
  balanceCents?: bigint;
};

export type PaybackSettlement = {
  from: string;
  to: string;
  amount: number;
  amountCents?: bigint;
};

export type PaybackInputRow = {
  name: string;
  amount: string;
};

export type PaybackEntry = {
  name: string;
  paid: number;
  paidCents?: bigint;
};

export type PaybackKhrRemainderMode = "LEFTOVER_ONLY" | "ASSIGN_TO_PERSON";

export type PaybackKhrRemainderMeta = {
  baseShare: number;
  baseShareCents?: bigint;
  leftover: number;
  leftoverCents?: bigint;
  assignedTo: string | null;
};

export type PaybackSharePayload = {
  c?: PaybackCurrency;
  t?: string;
  krm?: PaybackKhrRemainderMode;
  krp?: string;
};

type PaybackCompactSharePayload = [
  text: string,
  currency?: PaybackCurrency | "",
  khrRemainderMode?: PaybackKhrRemainderMode | "",
  khrRemainderPayer?: string,
];

function compareCentsDesc(left: bigint, right: bigint): number {
  if (left === right) {
    return 0;
  }

  return right > left ? 1 : -1;
}

function getPaybackEntryCents(entry: PaybackEntry): bigint {
  return entry.paidCents ?? moneyNumberToCents(entry.paid);
}

function getPaybackPersonPaidCents(person: PaybackPerson): bigint {
  return person.paidCents ?? moneyNumberToCents(person.paid);
}

function getPaybackPersonBalanceCents(person: PaybackPerson): bigint {
  return person.balanceCents ?? moneyNumberToCents(person.balance);
}

function sumPaybackEntryCents(entries: PaybackEntry[]): bigint {
  return entries.reduce((sum, entry) => sum + getPaybackEntryCents(entry), 0n);
}

function getKhrRemainderBaseShareCents(meta: PaybackKhrRemainderMeta): bigint {
  return meta.baseShareCents ?? moneyNumberToCents(meta.baseShare);
}

function getKhrRemainderLeftoverCents(meta: PaybackKhrRemainderMeta): bigint {
  return meta.leftoverCents ?? moneyNumberToCents(meta.leftover);
}

export function createEmptyPaybackRow(): PaybackInputRow {
  return { name: "", amount: "" };
}

export function createPaybackRows(count = 1): PaybackInputRow[] {
  return Array.from({ length: count }, () => createEmptyPaybackRow());
}

export function createEmptyPaybackKhrRemainder(): PaybackKhrRemainderMeta {
  return {
    baseShare: 0,
    baseShareCents: 0n,
    leftover: 0,
    leftoverCents: 0n,
    assignedTo: null,
  };
}

export function roundPayback(value: number): number {
  return roundMoney(value);
}

export function formatPaybackAmount(
  value: number,
  currency: PaybackCurrency,
): string {
  return formatMoneyAmount(value, currency);
}

export function formatPaybackExactKhr(value: number): string {
  return formatMoneyAmount(value, "KHR");
}

export function hasPaybackInput(rows: PaybackInputRow[]): boolean {
  return rows.some(
    (row) => (row.name ?? "").trim() || (row.amount ?? "").trim(),
  );
}

function parsePaybackAmountToCents(value: string, errorPrefix: string): bigint {
  try {
    return parseMoneyInputToCents(value, { allowZero: true });
  } catch {
    throw new Error(errorPrefix);
  }
}

export function parsePaybackLines(input: string): PaybackEntry[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line): line is string => line.length > 0);

  const entries: PaybackEntry[] = [];

  for (const line of lines) {
    const match = line.match(
      /^(.+?)(?:\s*[:=]\s*|\s+-\s+|\s+)([+-]?(?:[$៛,\d.\s])+)\s*$/,
    );

    if (!match) {
      throw new Error(`Invalid line: "${line}"`);
    }

    const rawName = match[1];
    const rawAmount = match[2];

    if (rawName === undefined || rawAmount === undefined) {
      throw new Error(`Invalid line format: "${line}"`);
    }

    const name = rawName.trim();

    if (!name) {
      throw new Error(`Missing name in line: "${line}"`);
    }

    const paidCents = parsePaybackAmountToCents(
      rawAmount,
      `Invalid amount in line: "${line}"`,
    );

    entries.push({
      name,
      paid: moneyCentsToNumber(paidCents),
      paidCents,
    });
  }

  return entries;
}

export function parsePaybackRows(rows: PaybackInputRow[]): PaybackEntry[] {
  const entries: PaybackEntry[] = [];

  for (const row of rows) {
    const name = (row.name ?? "").trim();
    const amountRaw = (row.amount ?? "").trim();

    if (!name && !amountRaw) {
      continue;
    }

    if (!name) {
      throw new Error("Missing name in a row.");
    }

    if (!amountRaw) {
      throw new Error(`Missing amount for "${name}".`);
    }

    const paidCents = parsePaybackAmountToCents(
      amountRaw,
      `Invalid amount for "${name}".`,
    );

    entries.push({
      name,
      paid: moneyCentsToNumber(paidCents),
      paidCents,
    });
  }

  return entries;
}

export function buildPaybackRawFromRows(rows: PaybackInputRow[]): string {
  return rows
    .map((row) => {
      const name = (row.name ?? "").trim();
      const amount = (row.amount ?? "").trim();

      if (!name && !amount) {
        return "";
      }

      return `${name}: ${amount}`;
    })
    .filter(Boolean)
    .join("\n");
}

export function buildPaybackRowsFromRaw(input: string): PaybackInputRow[] {
  const entries = parsePaybackLines(input);
  const rows = entries.map((entry) => ({
    name: entry.name,
    amount: String(moneyCentsToNumber(getPaybackEntryCents(entry))),
  }));

  return rows.length ? rows : createPaybackRows();
}

export function groupPaybackEntries(entries: PaybackEntry[]): PaybackEntry[] {
  const totals = new Map<string, bigint>();

  for (const entry of entries) {
    totals.set(
      entry.name,
      (totals.get(entry.name) ?? 0n) + getPaybackEntryCents(entry),
    );
  }

  return [...totals.entries()].map(([name, paidCents]) => ({
    name,
    paid: moneyCentsToNumber(paidCents),
    paidCents,
  }));
}

export function buildPaybackKhrRemainderMeta(
  entries: PaybackEntry[],
  mode: PaybackKhrRemainderMode,
  payer: string,
): PaybackKhrRemainderMeta {
  const totalPaidCents = sumPaybackEntryCents(entries);
  const peopleCount = entries.length;

  if (!peopleCount) {
    return createEmptyPaybackKhrRemainder();
  }

  const baseShareCents = roundKhrDownCents(
    divideMoneyCents(totalPaidCents, peopleCount),
  );
  const leftoverCents = totalPaidCents - baseShareCents * BigInt(peopleCount);

  if (mode === "ASSIGN_TO_PERSON") {
    const assignedTo =
      entries.find((person) => person.name === payer)?.name ??
      entries[0]?.name ??
      null;

    return {
      baseShare: moneyCentsToNumber(baseShareCents),
      baseShareCents,
      leftover: moneyCentsToNumber(leftoverCents),
      leftoverCents,
      assignedTo,
    };
  }

  return {
    baseShare: moneyCentsToNumber(baseShareCents),
    baseShareCents,
    leftover: moneyCentsToNumber(leftoverCents),
    leftoverCents,
    assignedTo: null,
  };
}

function buildKhrBalances(
  entries: PaybackEntry[],
  mode: PaybackKhrRemainderMode,
  payer: string,
): PaybackPerson[] {
  const meta = buildPaybackKhrRemainderMeta(entries, mode, payer);
  const baseShareCents = getKhrRemainderBaseShareCents(meta);
  const leftoverCents = getKhrRemainderLeftoverCents(meta);

  return entries
    .map((person) => {
      let targetShareCents = baseShareCents;

      if (
        mode === "ASSIGN_TO_PERSON" &&
        leftoverCents > 0n &&
        meta.assignedTo === person.name
      ) {
        targetShareCents += leftoverCents;
      }

      const paidCents = getPaybackEntryCents(person);
      const balanceCents = paidCents - targetShareCents;

      return {
        name: person.name,
        paid: moneyCentsToNumber(paidCents),
        paidCents,
        balance: moneyCentsToNumber(balanceCents),
        balanceCents,
      };
    })
    .sort((a, b) =>
      compareCentsDesc(
        getPaybackPersonPaidCents(a),
        getPaybackPersonPaidCents(b),
      ),
    );
}

function buildUsdBalances(entries: PaybackEntry[]): PaybackPerson[] {
  const totalPaidCents = sumPaybackEntryCents(entries);
  const peopleCount = entries.length;

  if (!peopleCount) {
    return [];
  }

  const peopleCountBigInt = BigInt(peopleCount);
  const baseShareCents = totalPaidCents / peopleCountBigInt;
  const leftoverCents = totalPaidCents % peopleCountBigInt;

  return entries
    .map((person, index) => {
      // USD cannot split below one cent, so spread extra cents in input order
      // instead of rounding every person to the same imbalanced share.
      const targetShareCents =
        baseShareCents + (BigInt(index) < leftoverCents ? 1n : 0n);
      const paidCents = getPaybackEntryCents(person);
      const balanceCents = paidCents - targetShareCents;

      return {
        name: person.name,
        paid: moneyCentsToNumber(paidCents),
        paidCents,
        balance: moneyCentsToNumber(balanceCents),
        balanceCents,
      };
    })
    .sort((a, b) =>
      compareCentsDesc(
        getPaybackPersonPaidCents(a),
        getPaybackPersonPaidCents(b),
      ),
    );
}

export function buildPaybackPeople(
  entries: PaybackEntry[],
  currency: PaybackCurrency,
  mode: PaybackKhrRemainderMode,
  payer: string,
): PaybackPerson[] {
  if (currency === "KHR") {
    return buildKhrBalances(entries, mode, payer);
  }

  return buildUsdBalances(entries);
}

export function computePaybackSettlements(
  people: PaybackPerson[],
): PaybackSettlement[] {
  type BalanceEntry = {
    name: string;
    balanceCents: bigint;
  };

  const debtors: BalanceEntry[] = people
    .map((person) => ({
      name: person.name,
      balanceCents: getPaybackPersonBalanceCents(person),
    }))
    .filter((person) => person.balanceCents < 0n)
    .map((person) => ({
      name: person.name,
      balanceCents: -person.balanceCents,
    }))
    .sort((a, b) => compareCentsDesc(a.balanceCents, b.balanceCents));

  const creditors: BalanceEntry[] = people
    .map((person) => ({
      name: person.name,
      balanceCents: getPaybackPersonBalanceCents(person),
    }))
    .filter((person) => person.balanceCents > 0n)
    .sort((a, b) => compareCentsDesc(a.balanceCents, b.balanceCents));

  const settlements: PaybackSettlement[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    // Required when noUncheckedIndexedAccess is enabled.
    if (!debtor || !creditor) {
      break;
    }

    const amountCents =
      debtor.balanceCents < creditor.balanceCents
        ? debtor.balanceCents
        : creditor.balanceCents;

    if (amountCents <= 0n) {
      break;
    }

    settlements.push({
      from: debtor.name,
      to: creditor.name,
      amount: moneyCentsToNumber(amountCents),
      amountCents,
    });

    debtor.balanceCents -= amountCents;
    creditor.balanceCents -= amountCents;

    if (debtor.balanceCents === 0n) {
      debtorIndex += 1;
    }

    if (creditor.balanceCents === 0n) {
      creditorIndex += 1;
    }
  }

  return settlements;
}

export function getPaybackTotal(people: PaybackPerson[]): number {
  return moneyCentsToNumber(
    people.reduce((sum, person) => sum + getPaybackPersonPaidCents(person), 0n),
  );
}

export function getPaybackAverage(people: PaybackPerson[]): number {
  if (!people.length) {
    return 0;
  }

  return moneyCentsToNumber(
    divideMoneyCents(
      moneyNumberToCents(getPaybackTotal(people)),
      people.length,
    ),
  );
}

export function getPaybackExampleRaw(currency: PaybackCurrency): string {
  if (currency === "KHR") {
    return `Mina 5000៛
Sreynea : 10000៛
John: 4000៛
Minea: 0
Reak: 0
Rotha: 38100៛`;
  }

  return `Mina 5$
Sreynea : 10$
John: 4$
Minea: 0
Reak: 0
Rotha: 38$`;
}

function buildCompactPaybackRaw(value: string): string {
  const input = value.trim();

  if (!input) {
    return "";
  }

  try {
    return parsePaybackLines(input)
      .map((entry) => `${entry.name}:${entry.paid}`)
      .join("\n");
  } catch {
    return input;
  }
}

function decodeBase64Url(value: string): string {
  const paddedValue =
    value.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (value.length % 4)) % 4);

  const binary = atob(paddedValue);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function buildPaybackSharePayload(payload: PaybackSharePayload): string {
  const compactPayload: PaybackCompactSharePayload = [
    buildCompactPaybackRaw(payload.t ?? ""),
  ];

  if (payload.c && payload.c !== "USD") {
    compactPayload[1] = payload.c;
  }

  if (payload.c === "KHR" && payload.krm === "ASSIGN_TO_PERSON") {
    compactPayload[2] = payload.krm;
    compactPayload[3] = payload.krp;
  }

  return compressToEncodedURIComponent(JSON.stringify(compactPayload));
}

export function parsePaybackSharePayload(payload: string): PaybackSharePayload {
  const json = decompressFromEncodedURIComponent(payload);

  if (json) {
    const parsedPayload = JSON.parse(json) as
      | PaybackSharePayload
      | PaybackCompactSharePayload;

    if (Array.isArray(parsedPayload)) {
      const [text, currency, khrRemainderMode, khrRemainderPayer] =
        parsedPayload;

      return {
        t: text,
        c: currency || "USD",
        krm: khrRemainderMode || "LEFTOVER_ONLY",
        krp: khrRemainderPayer,
      };
    }

    return parsedPayload;
  }

  // Keep old shared links working after moving new links to compressed payloads.
  return JSON.parse(decodeBase64Url(payload)) as PaybackSharePayload;
}
