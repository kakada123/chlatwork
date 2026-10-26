import {
  buildPaybackKhrRemainderMeta,
  buildPaybackPeople,
  computePaybackSettlements,
  parsePaybackRows,
  type PaybackCurrency,
} from "./payback-calculator.ts";
import { formatMoneyAmount, MAX_MONEY_AMOUNT_CENTS } from "./money.ts";

export type JekLuyCurrency = PaybackCurrency;
export type JekLuyParticipant = { id: string; name: string; amount: string };
export type JekLuyCompletion = { basis: string; ids: string[] };
export type JekLuyDraft = {
  version: 1;
  currency: JekLuyCurrency;
  participants: JekLuyParticipant[];
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

export function calculateJekLuy(participants: JekLuyParticipant[], currency: JekLuyCurrency) {
  if (!isCurrency(currency) || !hasValidParticipants(participants))
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
  // Keep PayBack's established KHR rule and assign its remainder so no balance is left outstanding.
  const people = buildPaybackPeople(entries, currency, "ASSIGN_TO_PERSON", firstId);
  const remainder = currency === "KHR" ? buildPaybackKhrRemainderMeta(entries, "ASSIGN_TO_PERSON", firstId) : null;
  const names = new Map(participants.map((person) => [person.id, person.name.trim()]));
  const basis = JSON.stringify([currency, entries.map((entry) => [entry.name, entry.paidCents!.toString()])]);
  return {
    currency,
    totalCents,
    basis,
    people: people.map((person) => ({
      id: person.name,
      name: names.get(person.name)!,
      paidCents: person.paidCents!,
      balanceCents: person.balanceCents!,
      shareCents: person.paidCents! - person.balanceCents!,
    })),
    transfers: computePaybackSettlements(people).map((transfer) => ({
      id: JSON.stringify([transfer.from, transfer.to, transfer.amountCents!.toString()]),
      fromId: transfer.from,
      toId: transfer.to,
      fromName: names.get(transfer.from)!,
      toName: names.get(transfer.to)!,
      amountCents: transfer.amountCents!,
    })),
    remainderCents: remainder?.leftoverCents ?? 0n,
    remainderPersonId: remainder?.assignedTo ?? null,
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

export function jekluySummary(result: JekLuyResult, completedIds: string[] = []): string {
  const money = (amount: bigint) => formatJekLuyMoney(amount, result.currency);
  return [
    "ចែកលុយ 💸",
    `សរុប៖ ${money(result.totalCents)} · ${result.people.length} នាក់`,
    ...result.people.map((person) => `${person.name}៖ បានចេញ ${money(person.paidCents)} · ចំណែក ${money(person.shareCents)}`),
    "",
    ...(result.transfers.length ? result.transfers.map((transfer) => `${completedIds.includes(transfer.id) ? "✓ សងរួច៖ " : ""}${transfer.fromName} ត្រូវសង ${transfer.toName} ${money(transfer.amountCents)}`) : ["គ្រប់គ្នាចេញលុយស្មើគ្នាហើយ មិនបាច់សងគ្នាទេ។"]),
  ].join("\n");
}

export function parseJekLuyDraft(raw: string): JekLuyDraft {
  if (raw.length > MAX_DRAFT_LENGTH) throw new Error("Draft too large");
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 || !isCurrency(value.currency) || !hasValidParticipants(value.participants) ||
    !value.completed || typeof value.completed.basis !== "string" || value.completed.basis.length > MAX_DRAFT_LENGTH ||
    !Array.isArray(value.completed.ids) || value.completed.ids.length > JEKLUY_MAX_PARTICIPANTS ||
    value.completed.ids.some((id: unknown) => typeof id !== "string" || id.length > 200)) throw new Error("Invalid draft");
  // Return only versioned fields. Unknown persisted properties never enter the reactive session.
  return {
    version: 1,
    currency: value.currency,
    participants: value.participants.map((person: JekLuyParticipant) => ({ id: person.id, name: person.name, amount: person.amount })),
    completed: { basis: value.completed.basis, ids: [...new Set<string>(value.completed.ids)] },
  };
}

export function serializeJekLuyDraft(draft: JekLuyDraft): string {
  return JSON.stringify(parseJekLuyDraft(JSON.stringify(draft)));
}
