export type PaybackCurrency = "USD" | "KHR";

export type PaybackPerson = {
  name: string;
  paid: number;
  balance: number;
};

export type PaybackSettlement = {
  from: string;
  to: string;
  amount: number;
};

export type PaybackInputRow = {
  name: string;
  amount: string;
};

export type PaybackEntry = {
  name: string;
  paid: number;
};

export type PaybackKhrRemainderMode = "LEFTOVER_ONLY" | "ASSIGN_TO_PERSON";

export type PaybackKhrRemainderMeta = {
  baseShare: number;
  leftover: number;
  assignedTo: string | null;
};

export type PaybackSharePayload = {
  c?: PaybackCurrency;
  t?: string;
  krm?: PaybackKhrRemainderMode;
  krp?: string;
};

export function createEmptyPaybackRow(): PaybackInputRow {
  return { name: "", amount: "" };
}

export function createPaybackRows(count = 1): PaybackInputRow[] {
  return Array.from({ length: count }, () => createEmptyPaybackRow());
}

export function createEmptyPaybackKhrRemainder(): PaybackKhrRemainderMeta {
  return {
    baseShare: 0,
    leftover: 0,
    assignedTo: null,
  };
}

export function roundPayback(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundKhrDown(value: number): number {
  return Math.floor(value / 100) * 100;
}

export function formatPaybackAmount(
  value: number,
  currency: PaybackCurrency,
): string {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  if (currency === "KHR") {
    const roundedValue = roundKhrDown(absoluteValue);
    return `${sign}${roundedValue.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}៛`;
  }

  return `${sign}$${absoluteValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPaybackExactKhr(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  return `${sign}${absoluteValue.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}៛`;
}

export function hasPaybackInput(rows: PaybackInputRow[]): boolean {
  return rows.some(
    (row) => (row.name ?? "").trim() || (row.amount ?? "").trim(),
  );
}

function parsePaybackAmount(value: string, errorPrefix: string): number {
  const cleanedValue = value.replace(/\$/g, "").replace(/៛/g, "");
  const amount = Number(cleanedValue);

  if (Number.isNaN(amount)) {
    throw new Error(errorPrefix);
  }

  return amount;
}

export function parsePaybackLines(input: string): PaybackEntry[] {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: PaybackEntry[] = [];

  for (const line of lines) {
    const cleanedLine = line.replace(/\$/g, "").replace(/៛/g, "");
    const match = cleanedLine.match(/^(.+?)[\s:=-]+(-?\d+(\.\d+)?)\s*$/);

    if (!match) {
      throw new Error(`Invalid line: "${line}"`);
    }

    const name = match[1].trim();
    const paid = Number(match[2]);

    if (!name) {
      throw new Error(`Missing name in line: "${line}"`);
    }

    if (Number.isNaN(paid)) {
      throw new Error(`Invalid amount in line: "${line}"`);
    }

    entries.push({ name, paid });
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

    const paid = parsePaybackAmount(amountRaw, `Invalid amount for "${name}".`);
    entries.push({ name, paid });
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
    amount: String(entry.paid),
  }));

  return rows.length ? rows : createPaybackRows();
}

export function groupPaybackEntries(entries: PaybackEntry[]): PaybackEntry[] {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    totals.set(entry.name, roundPayback((totals.get(entry.name) || 0) + entry.paid));
  }

  return [...totals.entries()].map(([name, paid]) => ({ name, paid }));
}

export function buildPaybackKhrRemainderMeta(
  entries: PaybackEntry[],
  mode: PaybackKhrRemainderMode,
  payer: string,
): PaybackKhrRemainderMeta {
  const totalPaid = roundPayback(
    entries.reduce((sum, person) => sum + person.paid, 0),
  );
  const peopleCount = entries.length;

  if (!peopleCount) {
    return createEmptyPaybackKhrRemainder();
  }

  const baseShare = Math.floor(totalPaid / peopleCount / 100) * 100;
  const leftover = roundPayback(totalPaid - baseShare * peopleCount);

  if (mode === "ASSIGN_TO_PERSON") {
    const assignedTo =
      entries.find((person) => person.name === payer)?.name ??
      entries[0]?.name ??
      null;

    return {
      baseShare,
      leftover,
      assignedTo,
    };
  }

  return {
    baseShare,
    leftover,
    assignedTo: null,
  };
}

function buildKhrBalances(
  entries: PaybackEntry[],
  mode: PaybackKhrRemainderMode,
  payer: string,
): PaybackPerson[] {
  const meta = buildPaybackKhrRemainderMeta(entries, mode, payer);

  return entries
    .map((person) => {
      let targetShare = meta.baseShare;

      if (
        mode === "ASSIGN_TO_PERSON" &&
        meta.leftover > 0 &&
        meta.assignedTo === person.name
      ) {
        targetShare = roundPayback(targetShare + meta.leftover);
      }

      return {
        name: person.name,
        paid: person.paid,
        balance: roundPayback(person.paid - targetShare),
      };
    })
    .sort((a, b) => b.paid - a.paid);
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

  const totalPaid = roundPayback(
    entries.reduce((sum, person) => sum + person.paid, 0),
  );
  const averagePaid = entries.length ? roundPayback(totalPaid / entries.length) : 0;

  return entries
    .map((person) => ({
      name: person.name,
      paid: person.paid,
      balance: roundPayback(person.paid - averagePaid),
    }))
    .sort((a, b) => b.paid - a.paid);
}

export function computePaybackSettlements(
  people: PaybackPerson[],
): PaybackSettlement[] {
  const debtors = people
    .filter((person) => person.balance < 0)
    .map((person) => ({ ...person, balance: roundPayback(Math.abs(person.balance)) }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = people
    .filter((person) => person.balance > 0)
    .map((person) => ({ ...person, balance: roundPayback(person.balance) }))
    .sort((a, b) => b.balance - a.balance);

  const settlements: PaybackSettlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const amount = roundPayback(Math.min(debtor.balance, creditor.balance));

    if (amount > 0) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount,
      });

      debtor.balance = roundPayback(debtor.balance - amount);
      creditor.balance = roundPayback(creditor.balance - amount);
    }

    if (debtor.balance <= 0.009) {
      debtorIndex += 1;
    }

    if (creditor.balance <= 0.009) {
      creditorIndex += 1;
    }
  }

  return settlements;
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

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64Url(value: string): string {
  const paddedValue =
    value.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (value.length % 4)) % 4);

  const binary = atob(paddedValue);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function buildPaybackSharePayload(
  payload: PaybackSharePayload,
): string {
  return encodeBase64Url(JSON.stringify(payload));
}

export function parsePaybackSharePayload(
  payload: string,
): PaybackSharePayload {
  return JSON.parse(decodeBase64Url(payload)) as PaybackSharePayload;
}
