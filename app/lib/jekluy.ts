import {
  buildPaybackKhrRemainderMeta,
  buildPaybackPeople,
  computePaybackSettlements,
  parsePaybackRows,
  type PaybackCurrency,
  type PaybackKhrRemainderMode,
  type PaybackPerson,
  type PaybackSettlement,
} from "./payback-calculator.ts";
import { formatMoneyAmount, MAX_MONEY_AMOUNT_CENTS, moneyCentsToNumber, roundKhrDownCents } from "./money.ts";

export type JekLuyCurrency = PaybackCurrency;
export type JekLuyParticipant = { id: string; name: string; amount: string };
export type JekLuyCompletion = { basis: string; ids: string[] };
export type JekLuyDraft = {
  version: 1;
  currency: JekLuyCurrency;
  participants: JekLuyParticipant[];
  remainderMode: PaybackKhrRemainderMode;
  remainderPayer: string;
  completed: JekLuyCompletion;
};
export type JekLuyResult = ReturnType<typeof calculateJekLuy>;
export const JEKLUY_STORAGE_KEY = "chlatwork:jekluy:v1";
export const JEKLUY_MAX_PARTICIPANTS = 1000;
const MAX_DRAFT_LENGTH = 200_000;

export class JekLuyInputError extends Error {
  participantId?: string;
  field?: "name" | "amount";

  constructor(message: string, participantId?: string, field?: "name" | "amount") {
    super(message);
    this.name = "JekLuyInputError";
    this.participantId = participantId;
    this.field = field;
  }
}

export function createJekLuyDraft(): JekLuyDraft {
  return {
    version: 1,
    currency: "KHR",
    participants: [1, 2].map((index) => ({ id: `person-${index}`, name: "", amount: "" })),
    remainderMode: "LEFTOVER_ONLY",
    remainderPayer: "",
    completed: { basis: "", ids: [] },
  };
}

function isCurrency(value: unknown): value is JekLuyCurrency {
  return value === "KHR" || value === "USD";
}

function hasValidParticipants(value: unknown): value is JekLuyParticipant[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > JEKLUY_MAX_PARTICIPANTS) return false;
  const ids = new Set<string>();
  return value.every((person) => {
    if (!person || typeof person !== "object" || typeof person.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(person.id) || ids.has(person.id) ||
      typeof person.name !== "string" || person.name.length > 80 || /[\r\n\u0000-\u001f]/.test(person.name) ||
      typeof person.amount !== "string" || person.amount.length > 24) return false;
    ids.add(person.id);
    return true;
  });
}

function normalizeAmount(amount: string, currency: JekLuyCurrency) {
  const input = amount.trim().replace(/[០-៩]/g, (digit) => String(digit.charCodeAt(0) - 0x17e0));
  if (!input) return "0";
  // Currency symbols and malformed grouping are rejected instead of silently mixing denominations.
  const whole = "(?:\\d+|\\d{1,3}(?:,\\d{3})+)";
  const pattern = currency === "KHR" ? new RegExp(`^${whole}$`) : new RegExp(`^(?:${whole}(?:\\.\\d{1,2})?|\\.\\d{1,2})$`);
  if (!pattern.test(input)) throw new Error("invalid amount");
  return input.replaceAll(",", "");
}

function cashSettlements(people: PaybackPerson[], exact: PaybackSettlement[]): PaybackSettlement[] {
  const unit = 10_000n; // 100៛ in the shared engine's integer scale.
  const net = new Map<string, bigint>();
  for (const transfer of exact) {
    net.set(transfer.from, (net.get(transfer.from) || 0n) - transfer.amountCents!);
    net.set(transfer.to, (net.get(transfer.to) || 0n) + transfer.amountCents!);
  }
  const side = (creditor: boolean) => people.flatMap((person) => {
    const signed = net.get(person.name) || 0n;
    if (creditor ? signed <= 0n : signed >= 0n) return [];
    const cents = creditor ? signed : -signed;
    const ceiling = (cents + unit - 1n) / unit;
    const refundCap = person.paidCents! / unit;
    return [{ name: person.name, cents, units: cents / unit, fraction: cents % unit,
      maxUnits: creditor && refundCap < ceiling ? refundCap : ceiling }];
  });
  const debtors = side(false);
  const creditors = side(true);
  const sum = (items: typeof debtors, key: "units" | "maxUnits" | "cents") => items.reduce((total, item) => total + item[key], 0n);
  const lower = sum(debtors, "units") > sum(creditors, "units") ? sum(debtors, "units") : sum(creditors, "units");
  const upper = sum(debtors, "maxUnits") < sum(creditors, "maxUnits") ? sum(debtors, "maxUnits") : sum(creditors, "maxUnits");
  if (lower > upper) {
    // Sub-100៛ contributions may make balanced nearest rounding impossible without a refund exceeding spending.
    // In that case waive each sub-unit portion; retain every difference in the exact audit below.
    return exact.flatMap((transfer) => {
      const cents = roundKhrDownCents(transfer.amountCents!);
      return cents > 0n ? [{ ...transfer, amountCents: cents, amount: moneyCentsToNumber(cents) }] : [];
    });
  }
  const nearest = roundKhrDownCents(sum(debtors, "cents") + unit / 2n) / unit;
  const target = nearest < lower ? lower : nearest > upper ? upper : nearest;
  const cashBalances = new Map<string, bigint>();
  for (const [items, sign] of [[debtors, -1n], [creditors, 1n]] as const) {
    let extra = target - sum(items, "units");
    // Share the extra cash units by largest fractional remainder, with stable input-order ties.
    // Rounding net balances together prevents many small transfers from compounding into an excessive refund.
    for (const item of [...items].sort((a, b) => a.fraction === b.fraction ? 0 : a.fraction > b.fraction ? -1 : 1)) {
      if (extra > 0n && item.units < item.maxUnits) { item.units++; extra--; }
      cashBalances.set(item.name, item.units * unit * sign);
    }
  }
  return computePaybackSettlements(people.map((person) => {
    const balanceCents = cashBalances.get(person.name) || 0n;
    return { ...person, balanceCents, balance: moneyCentsToNumber(balanceCents) };
  }));
}

export function calculateJekLuy(
  participants: JekLuyParticipant[],
  currency: JekLuyCurrency,
  remainderMode: PaybackKhrRemainderMode = "LEFTOVER_ONLY",
  remainderPayer = "",
) {
  if (!isCurrency(currency) || !hasValidParticipants(participants) || !["LEFTOVER_ONLY", "ASSIGN_TO_PERSON"].includes(remainderMode))
    throw new JekLuyInputError("សូមបញ្ចូលអ្នកចូលរួមយ៉ាងតិច ២ នាក់ ហើយកុំឱ្យទិន្នន័យស្ទួន។");

  const entries = participants.map((person, index) => {
    if (!person.name.trim()) throw new JekLuyInputError(`សូមបញ្ចូលឈ្មោះអ្នកទី ${index + 1}។`, person.id, "name");
    try {
      // IDs are the existing engine's keys: identical display names must never merge two friends.
      return parsePaybackRows([{ name: person.id, amount: normalizeAmount(person.amount, currency) }])[0]!;
    } catch {
      throw new JekLuyInputError(currency === "KHR"
        ? "សូមបញ្ចូលលុយជាចំនួនរៀលពេញ ចាប់ពី ០ ឡើងទៅ។"
        : "សូមបញ្ចូលលុយដុល្លារ ចាប់ពី ០ ឡើងទៅ និងក្បៀសមិនលើស ២ ខ្ទង់។", person.id, "amount");
    }
  });
  const totalCents = entries.reduce((sum, entry) => sum + entry.paidCents!, 0n);
  if (totalCents > MAX_MONEY_AMOUNT_CENTS)
    throw new JekLuyInputError("លុយសរុបច្រើនពេក។ សូមពិនិត្យចំនួនលុយម្តងទៀត។");

  const firstId = participants[0]!.id;
  // Match PayBack: leave the rounded-off KHR amount separate unless someone explicitly covers it.
  const people = buildPaybackPeople(entries, currency, remainderMode, remainderPayer || firstId);
  const remainder = currency === "KHR" ? buildPaybackKhrRemainderMeta(entries, remainderMode, remainderPayer || firstId) : null;
  const names = new Map(participants.map((person) => [person.id, person.name.trim()]));
  const exact = computePaybackSettlements(people);
  const exactTransfers = exact.map((transfer) => ({
    id: JSON.stringify([transfer.from, transfer.to, transfer.amountCents!.toString()]),
    fromId: transfer.from,
    toId: transfer.to,
    fromName: names.get(transfer.from)!,
    toName: names.get(transfer.to)!,
    amountCents: transfer.amountCents!,
  }));
  const pairKey = (from: string, to: string) => JSON.stringify([from, to]);
  const exactByPair = new Map(exactTransfers.map((transfer) => [pairKey(transfer.fromId, transfer.toId), transfer.amountCents]));
  const transfers = (currency === "KHR" ? cashSettlements(people, exact) : exact).map((transfer) => ({
    id: JSON.stringify([transfer.from, transfer.to, transfer.amountCents!.toString()]),
    fromId: transfer.from, toId: transfer.to,
    fromName: names.get(transfer.from)!, toName: names.get(transfer.to)!,
    amountCents: transfer.amountCents!,
    exactAmountCents: exactByPair.get(pairKey(transfer.from, transfer.to)) || 0n,
  }));
  const cashByPair = new Map(transfers.map((transfer) => [pairKey(transfer.fromId, transfer.toId), transfer.amountCents]));
  const roundingAdjustments = [
    ...exactTransfers.flatMap((transfer) => {
      const amountCents = cashByPair.get(pairKey(transfer.fromId, transfer.toId)) || 0n;
      return amountCents === transfer.amountCents ? [] : [{ ...transfer, exactAmountCents: transfer.amountCents, amountCents }];
    }),
    ...transfers.filter((transfer) => !exactByPair.has(pairKey(transfer.fromId, transfer.toId))),
  ];
  const settlementBalances = new Map<string, bigint>();
  for (const transfer of transfers) {
    settlementBalances.set(transfer.fromId, (settlementBalances.get(transfer.fromId) || 0n) - transfer.amountCents);
    settlementBalances.set(transfer.toId, (settlementBalances.get(transfer.toId) || 0n) + transfer.amountCents);
  }
  const basisValues: unknown[] = [currency, entries.map((entry) => [entry.name, entry.paidCents!.toString()])];
  // Old paid marks stay valid only when the remainder policy cannot change any repayment.
  if (remainder && remainder.leftoverCents! > 0n) basisValues.push([remainderMode, remainder.assignedTo]);
  if (roundingAdjustments.length) basisValues.push("khr-cash-balanced-100:v1");
  const basis = JSON.stringify(basisValues);
  return {
    currency,
    totalCents,
    basis,
    people: people.map((person) => ({
      id: person.name,
      name: names.get(person.name)!,
      paidCents: person.paidCents!,
      balanceCents: person.balanceCents!,
      settlementBalanceCents: settlementBalances.get(person.name) || 0n,
      actualShareCents: person.paidCents! - (settlementBalances.get(person.name) || 0n),
      shareCents: person.paidCents! - person.balanceCents!,
    })),
    exactTransfers,
    transfers,
    roundingAdjustments,
    remainderCents: remainder?.leftoverCents ?? 0n,
    remainderPersonId: remainder?.assignedTo ?? null,
    remainderMode,
    baseShareCents: remainder?.baseShareCents ?? 0n,
  };
}

export function getJekLuyCompleted(result: JekLuyResult, completed: JekLuyCompletion): string[] {
  if (completed.basis !== result.basis) return [];
  const validIds = new Set(result.transfers.map((transfer) => transfer.id));
  return [...new Set(completed.ids)].filter((id) => validIds.has(id));
}

export function formatJekLuyMoney(cents: bigint, currency: JekLuyCurrency): string {
  const formatted = formatMoneyAmount(cents, currency);
  return currency === "KHR" ? `${formatted.replace(/[៛\s]/g, "")}៛` : formatted;
}

export function jekluyEmptySettlementMessage(result: JekLuyResult): string {
  if (result.totalCents === 0n) return "មិនទាន់មានអ្នកចេញលុយទេ។ អ្នកដែលមិនបានចេញលុយ អាចទុកជា ០ បាន។";
  if (result.roundingAdjustments.length) return "មិនបាច់ផ្ទេរលុយទេ បន្ទាប់ពីបង្គត់ត្រឹម ១០០៛។";
  if (result.remainderCents > 0n && !result.remainderPersonId)
    return "មិនមានលុយត្រូវសងគ្នាតាមចំណែកដែលបានបង្គត់ទេ។ សំណល់នៅដាច់ដោយឡែក។";
  return "គ្រប់គ្នាចេញលុយស្មើគ្នាហើយ មិនបាច់សងគ្នាទេ។";
}

export function jekluySummary(result: JekLuyResult, completedIds: string[] = []): string {
  const money = (amount: bigint) => formatJekLuyMoney(amount, result.currency);
  return [
    "ចែកលុយ 💸",
    `សរុប៖ ${money(result.totalCents)} · ${result.people.length} នាក់`,
    ...(result.currency === "KHR" ? [`ចំណែកម្នាក់ៗ៖ ${money(result.baseShareCents)}`] : []),
    ...result.people.map((person) => `${person.name}៖ បានចេញ ${money(person.paidCents)} · ចំណែក ${money(person.shareCents)}`),
    ...(result.remainderCents > 0n ? [result.remainderPersonId
      ? `សំណល់៖ ${money(result.remainderCents)} · គិតលើ ${result.people.find((person) => person.id === result.remainderPersonId)!.name}`
      : `សំណល់ដាច់ដោយឡែក៖ ${money(result.remainderCents)} (មិនទាន់បែងចែក)`] : []),
    "",
    ...(result.transfers.length ? result.transfers.map((transfer) => `${completedIds.includes(transfer.id) ? "✓ សងរួច៖ " : ""}${transfer.fromName} ត្រូវសង ${transfer.toName} ${money(transfer.amountCents)}`) : [jekluyEmptySettlementMessage(result)]),
    ...(result.roundingAdjustments.length ? ["", "ការបង្គត់លុយសងជាឯកតា ១០០៛៖",
      ...result.roundingAdjustments.map((transfer) => `${transfer.fromName} → ${transfer.toName}៖ ${money(transfer.exactAmountCents)} → ${money(transfer.amountCents)}`)] : []),
  ].join("\n");
}

export function parseJekLuyDraft(raw: string): JekLuyDraft {
  if (raw.length > MAX_DRAFT_LENGTH) throw new Error("Draft too large");
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 || !isCurrency(value.currency) || !hasValidParticipants(value.participants) ||
    (value.remainderMode !== undefined && !["LEFTOVER_ONLY", "ASSIGN_TO_PERSON"].includes(value.remainderMode)) ||
    (value.remainderPayer !== undefined && (typeof value.remainderPayer !== "string" || !/^[a-zA-Z0-9_-]{0,80}$/.test(value.remainderPayer))) ||
    !value.completed || typeof value.completed.basis !== "string" || value.completed.basis.length > MAX_DRAFT_LENGTH ||
    !Array.isArray(value.completed.ids) || value.completed.ids.length > JEKLUY_MAX_PARTICIPANTS ||
    value.completed.ids.some((id: unknown) => typeof id !== "string" || id.length > 200)) throw new Error("Invalid draft");
  // Return only versioned fields. Unknown persisted properties never enter the reactive session.
  return {
    version: 1,
    currency: value.currency,
    participants: value.participants.map((person: JekLuyParticipant) => ({ id: person.id, name: person.name, amount: person.amount })),
    remainderMode: value.remainderMode ?? "LEFTOVER_ONLY",
    remainderPayer: value.remainderPayer ?? "",
    completed: { basis: value.completed.basis, ids: [...new Set<string>(value.completed.ids)] },
  };
}

export function serializeJekLuyDraft(draft: JekLuyDraft): string {
  return JSON.stringify(parseJekLuyDraft(JSON.stringify(draft)));
}
