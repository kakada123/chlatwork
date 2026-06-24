import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  formatMoneyAmount,
  formatMoneyAmountDisplay,
  moneyTone,
  parseMoneyInputToCents,
} from "../app/lib/money.ts";
import {
  buildPaybackSharePayload,
  buildPaybackKhrRemainderMeta,
  buildPaybackPeople,
  computePaybackSettlements,
  formatPaybackAmount,
  getPaybackAverage,
  getPaybackTotal,
  groupPaybackEntries,
  parsePaybackSharePayload,
  parsePaybackRows,
} from "../app/lib/payback-calculator.ts";

test("shared money formatter safely normalizes invalid and extreme display values", () => {
  for (const value of [null, undefined, "", "abc", "NaN", "Infinity", Number.NaN, Infinity]) {
    const amount = formatMoneyAmountDisplay(value, "USD");

    assert.equal(amount.value, "$0.00");
    assert.equal(amount.full, "$0.00");
    assert.equal(amount.isCompact, false);
  }

  assert.equal(formatMoneyAmount("3.33e+28", "USD"), "$0.00");
  assert.doesNotMatch(formatMoneyAmount("3.33e+28", "USD"), /e\+?/i);
});

test("shared money parser rejects empty, negative, infinite, scientific, and unsupported values", () => {
  for (const invalidAmount of [
    "",
    "-1",
    "NaN",
    "Infinity",
    "3.33e+28",
    "1000000000000",
  ]) {
    assert.throws(() => parseMoneyInputToCents(invalidAmount));
  }

  assert.equal(parseMoneyInputToCents("0", { allowZero: true }), 0n);
  assert.equal(parseMoneyInputToCents("$1,250.105"), 125_011n);
});

test("shared money display compacts large values and preserves full formatted title text", () => {
  const amount = formatMoneyAmountDisplay("1250000", "USD");
  const negative = formatMoneyAmountDisplay("-3400000000", "USD");

  assert.equal(amount.value, "$1.25M");
  assert.equal(amount.full, "$1,250,000.00");
  assert.equal(amount.isCompact, true);
  assert.equal(negative.value, "-$3.40B");
  assert.equal(negative.full, "-$3,400,000,000.00");
  assert.doesNotMatch(amount.value + amount.full + negative.value + negative.full, /e\+?/i);
});

test("shared money tone is green only for positive, red for negative, and neutral for zero", () => {
  assert.equal(moneyTone(1), "positive");
  assert.equal(moneyTone(-1), "negative");
  assert.equal(moneyTone(0), "neutral");
  assert.equal(moneyTone("invalid"), "neutral");
});

test("payback input validation rejects invalid values and keeps zero participants safe", () => {
  assert.deepEqual(
    parsePaybackRows([
      { name: "Mina", amount: "0" },
      { name: "Rotha", amount: "$1.20" },
    ]).map((entry) => [entry.name, entry.paid, entry.paidCents]),
    [
      ["Mina", 0, 0n],
      ["Rotha", 1.2, 120n],
    ],
  );

  for (const amount of ["", "-1", "NaN", "Infinity", "3.33e+28", "1000000000000"]) {
    assert.throws(() => parsePaybackRows([{ name: "Bad", amount }]));
  }
});

test("payback totals, averages, and settlements use cent-safe decimal math", () => {
  const entries = groupPaybackEntries(
    parsePaybackRows([
      { name: "A", amount: "0.10" },
      { name: "B", amount: "0.20" },
      { name: "C", amount: "0" },
    ]),
  );
  const people = buildPaybackPeople(entries, "USD", "LEFTOVER_ONLY", "");
  const settlements = computePaybackSettlements(people);

  assert.equal(getPaybackTotal(people), 0.3);
  assert.equal(getPaybackAverage(people), 0.1);
  assert.deepEqual(
    settlements.map((settlement) => [
      settlement.from,
      settlement.to,
      settlement.amount,
      settlement.amountCents,
    ]),
    [["C", "B", 0.1, 10n]],
  );
  assert.equal(formatPaybackAmount(getPaybackTotal(people), "USD"), "$0.30");
});

test("payback USD settlement distributes cents without losing the decimal remainder", () => {
  const people = buildPaybackPeople(
    groupPaybackEntries(
      parsePaybackRows([
        { name: "A", amount: "10.00" },
        { name: "B", amount: "0" },
        { name: "C", amount: "0" },
      ]),
    ),
    "USD",
    "LEFTOVER_ONLY",
    "",
  );
  const settlements = computePaybackSettlements(people);
  const totalBalanceCents = people.reduce(
    (sum, person) => sum + (person.balanceCents ?? 0n),
    0n,
  );

  assert.equal(totalBalanceCents, 0n);
  assert.deepEqual(
    settlements.map((settlement) => [
      settlement.from,
      settlement.to,
      settlement.amount,
      settlement.amountCents,
    ]),
    [
      ["B", "A", 3.33, 333n],
      ["C", "A", 3.33, 333n],
    ],
  );
});

test("payback KHR remainder and huge totals stay deterministic", () => {
  const entries = groupPaybackEntries(
    parsePaybackRows([
      { name: "Mina", amount: "5000៛" },
      { name: "Sreynea", amount: "10000៛" },
      { name: "John", amount: "4000៛" },
      { name: "Minea", amount: "0" },
      { name: "Reak", amount: "0" },
      { name: "Rotha", amount: "38100៛" },
    ]),
  );
  const meta = buildPaybackKhrRemainderMeta(entries, "LEFTOVER_ONLY", "");

  assert.equal(meta.baseShare, 9500);
  assert.equal(meta.leftover, 100);

  const hugePeople = buildPaybackPeople(
    groupPaybackEntries(
      parsePaybackRows([
        { name: "A", amount: "3330000000" },
        { name: "B", amount: "0" },
      ]),
    ),
    "USD",
    "LEFTOVER_ONLY",
    "",
  );

  assert.equal(getPaybackTotal(hugePeople), 3_330_000_000);
  assert.equal(formatMoneyAmountDisplay(getPaybackTotal(hugePeople), "USD").value, "$3.33B");
});

test("payback share payload round-trips compact shared links", () => {
  const payload = buildPaybackSharePayload({
    c: "KHR",
    t: "Mina 5000\nRotha: 10000៛",
    krm: "ASSIGN_TO_PERSON",
    krp: "Mina",
  });

  assert.deepEqual(parsePaybackSharePayload(payload), {
    c: "KHR",
    t: "Mina:5000\nRotha:10000",
    krm: "ASSIGN_TO_PERSON",
    krp: "Mina",
  });
});

test("money amount component and summary components include narrow-width overflow guards", () => {
  const moneySource = readFileSync(
    new URL("../app/components/MoneyAmount.vue", import.meta.url),
    "utf8",
  );
  const expenseSource = readFileSync(
    new URL("../app/components/expense-tracker/ExpenseTrackerSummaryCard.vue", import.meta.url),
    "utf8",
  );
  const paybackSource = readFileSync(
    new URL("../app/components/payback-calculator/PaybackCalculatorSummaryCard.vue", import.meta.url),
    "utf8",
  );
  const cssSource = readFileSync(
    new URL("../app/assets/css/main.css", import.meta.url),
    "utf8",
  );

  assert.match(moneySource, /class="money-amount"/);
  assert.match(moneySource, /:title="fullValue"/);
  assert.match(cssSource, /\.money-amount[\s\S]*min-width: 0/);
  assert.match(cssSource, /\.money-amount[\s\S]*text-overflow: ellipsis/);
  assert.match(expenseSource, /<MoneyAmount/);
  assert.match(expenseSource, /max-w-\[9rem\]/);
  assert.match(paybackSource, /<MoneyAmount/);
  assert.match(paybackSource, /max-w-\[9rem\]/);
  assert.match(paybackSource, /money-value-neutral/);
});
