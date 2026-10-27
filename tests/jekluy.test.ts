import assert from "node:assert/strict";
import test from "node:test";
import { buildPaybackKhrRemainderMeta, buildPaybackPeople, computePaybackSettlements, parsePaybackRows } from "../app/lib/payback-calculator.ts";
import {
  calculateJekLuy,
  createJekLuyDraft,
  formatJekLuyMoney,
  getJekLuyCompleted,
  jekluySummary,
  parseJekLuyDraft,
  serializeJekLuyDraft,
  type JekLuyParticipant,
} from "../app/lib/jekluy.ts";

const rows = (amounts: string[]): JekLuyParticipant[] => amounts.map((amount, i) => ({ id: `p${i}`, name: ["កក្កដា", "ដាណែត", "វិសាល", "ក្រឹស្នា"][i] || `មិត្ត ${i}`, amount }));

test("JekLuy reuses PayBack for multiple upfront payers and the requested 190,000 riel example", () => {
  const result = calculateJekLuy(rows(["100000", "70000", "20000", "0"]), "KHR");
  assert.equal(result.totalCents, 19_000_000n);
  assert.deepEqual(result.people.map((person) => person.shareCents), [4_750_000n, 4_750_000n, 4_750_000n, 4_750_000n]);
  assert.deepEqual(result.transfers.map((transfer) => [transfer.fromId, transfer.toId, transfer.amountCents]), [
    ["p3", "p0", 4_750_000n], ["p2", "p0", 500_000n], ["p2", "p1", 2_250_000n],
  ]);
});

test("one payer and zero-paying participants settle exactly", () => {
  const result = calculateJekLuy(rows(["90000", "0", "0"]), "KHR");
  assert.deepEqual(result.transfers.map((transfer) => transfer.amountCents), [3_000_000n, 3_000_000n]);
  assert.equal(result.people[0]?.balanceCents, 6_000_000n);
});

test("equal and all-zero contributions need no repayments", () => {
  for (const amounts of [["5000", "5000"], ["0", "0", "0"]]) {
    const result = calculateJekLuy(rows(amounts), "KHR");
    assert.deepEqual(result.transfers, []);
    assert.equal(result.people.every((person) => person.balanceCents === 0n), true);
  }
});

test("KHR preserves existing 100-riel rounding and deterministic first-person remainder assignment", () => {
  const result = calculateJekLuy(rows(["10001", "0", "0"]), "KHR", "ASSIGN_TO_PERSON", "p0");
  assert.deepEqual(result.people.map((person) => person.shareCents), [340_100n, 330_000n, 330_000n]);
  assert.equal(result.remainderCents, 10_100n);
  assert.equal(result.remainderPersonId, "p0");
  assert.equal(result.people.reduce((total, person) => total + person.balanceCents, 0n), 0n);
});

test("large KHR groups never round a share above the available group total", () => {
  const result = calculateJekLuy(rows(["20099", ...Array(200).fill("0")]), "KHR", "ASSIGN_TO_PERSON", "p0");
  assert.equal(result.totalCents, 2_009_900n);
  assert.equal(result.people.reduce((sum, person) => sum + person.shareCents, 0n), 2_009_900n);
  assert.equal(result.people.reduce((sum, person) => sum + person.balanceCents, 0n), 0n);
  assert.ok(result.remainderCents >= 0n);
});

test("USD cents preserve decimal payments and indivisible remainders in input order", () => {
  const result = calculateJekLuy(rows(["0.10", "0.20", "0"]), "USD");
  assert.equal(result.totalCents, 30n);
  assert.deepEqual(result.transfers.map((transfer) => transfer.amountCents), [10n]);
  const remainder = calculateJekLuy(rows(["10.01", "0", "0"]), "USD");
  assert.deepEqual(remainder.people.map((person) => person.shareCents), [334n, 334n, 333n]);
});

test("Khmer digits and a blank paid field are accepted as zero without mixing currencies", () => {
  const result = calculateJekLuy(rows(["១០,០០០", ""]), "KHR");
  assert.equal(result.totalCents, 1_000_000n);
  for (const amount of ["$10", "10៛", "1,2", "1.2"]) assert.throws(() => calculateJekLuy(rows([amount, "0"]), "KHR"));
});

test("invalid money, names, duplicate IDs and unsafe totals fail with Khmer messages", () => {
  for (const amount of ["-1", "Infinity", "NaN", "1e2", "0.001", "1000000000000"]) {
    assert.throws(() => calculateJekLuy(rows([amount, "0"]), "USD"), /[\u1780-\u17ff]/);
  }
  assert.throws(() => calculateJekLuy(rows(["1"]), "KHR"));
  assert.throws(() => calculateJekLuy([{ id: "a", name: "", amount: "0" }, { id: "b", name: "B", amount: "1" }], "KHR"));
  assert.throws(() => calculateJekLuy([{ id: "same", name: "A", amount: "0" }, { id: "same", name: "B", amount: "1" }], "KHR"));
  assert.throws(() => calculateJekLuy(rows(["999999999999", "999999999999"]), "USD"));
  assert.throws(() => calculateJekLuy(rows(["1", "0"]), "EUR" as any));
});

test("duplicate display names stay separate participants", () => {
  const participants = rows(["10000", "0"]);
  participants.forEach((person) => { person.name = "សុខ"; });
  const result = calculateJekLuy(participants, "KHR");
  assert.equal(result.people.length, 2);
  assert.deepEqual(result.transfers.map((transfer) => [transfer.fromId, transfer.toId, transfer.amountCents]), [["p1", "p0", 500_000n]]);
});

test("repayments conserve every balance without zero, duplicate or self transfers", () => {
  for (const currency of ["KHR", "USD"] as const) {
    for (let count = 2; count <= 35; count++) {
      const result = calculateJekLuy(rows(Array.from({ length: count }, (_, i) => currency === "KHR" ? String((i * 7919 + count) % 20000) : `${i % 4}.${String((i * 17 + count) % 100).padStart(2, "0")}`)), currency, "ASSIGN_TO_PERSON", "p0");
      const residual = new Map(result.people.map((person) => [person.id, person.settlementBalanceCents]));
      const pairs = new Set();
      let outgoing = 0n;
      for (const transfer of result.transfers) {
        assert.notEqual(transfer.fromId, transfer.toId);
        assert.ok(transfer.amountCents > 0n);
        const pair = `${transfer.fromId}:${transfer.toId}`;
        assert.equal(pairs.has(pair), false);
        pairs.add(pair);
        outgoing += transfer.amountCents;
        residual.set(transfer.fromId, residual.get(transfer.fromId)! + transfer.amountCents);
        residual.set(transfer.toId, residual.get(transfer.toId)! - transfer.amountCents);
      }
      assert.equal([...residual.values()].every((balance) => balance === 0n), true);
      assert.equal(outgoing, result.people.reduce((sum, person) => sum + (person.settlementBalanceCents < 0n ? -person.settlementBalanceCents : 0n), 0n));
      assert.equal(result.people.reduce((sum, person) => sum + person.shareCents, 0n), result.totalCents);
      assert.ok(result.transfers.length < count);
    }
  }
});

test("draft round trip preserves unfinished rows and local completed transfers safely", () => {
  const draft = createJekLuyDraft();
  assert.equal(draft.currency, "KHR");
  assert.equal(draft.participants.length, 2);
  draft.participants = rows(["10000", "0"]);
  const result = calculateJekLuy(draft.participants, draft.currency);
  draft.completed = { basis: result.basis, ids: [result.transfers[0]!.id] };
  const restored = parseJekLuyDraft(serializeJekLuyDraft(draft));
  assert.deepEqual(restored, draft);
  assert.deepEqual(getJekLuyCompleted(result, restored.completed), [result.transfers[0]!.id]);
  assert.deepEqual(parseJekLuyDraft(serializeJekLuyDraft(createJekLuyDraft())), createJekLuyDraft());
});

test("corrupt, oversized, wrong-version and duplicate-ID drafts are rejected without executing content", () => {
  for (const raw of ["bad json", "null", "[]", '{"version":2}', " ".repeat(200001)]) assert.throws(() => parseJekLuyDraft(raw));
  const draft = createJekLuyDraft();
  draft.participants[1]!.id = draft.participants[0]!.id;
  assert.throws(() => parseJekLuyDraft(JSON.stringify(draft)));
});

test("paid marks survive renaming but never apply to a changed calculation or currency", () => {
  const participants = rows(["10000", "0"]);
  const result = calculateJekLuy(participants, "KHR");
  const completed = { basis: result.basis, ids: [result.transfers[0]!.id, "forged-transfer"] };
  participants[0]!.name = "ឈ្មោះថ្មី";
  assert.deepEqual(getJekLuyCompleted(calculateJekLuy(participants, "KHR"), completed), [result.transfers[0]!.id]);
  participants[0]!.amount = "20000";
  assert.deepEqual(getJekLuyCompleted(calculateJekLuy(participants, "KHR"), completed), []);
  assert.deepEqual(getJekLuyCompleted(calculateJekLuy(participants, "USD"), completed), []);
});

test("copy summaries are Khmer, include exact contributions and completed instructions", () => {
  const result = calculateJekLuy(rows(["10000", "0"]), "KHR");
  const text = jekluySummary(result, [result.transfers[0]!.id]);
  assert.match(text, /ចែកលុយ/);
  assert.match(text, /ដាណែត ត្រូវសង កក្កដា 5,000៛/);
  assert.match(text, /សងរួច/);
  assert.match(text, /សរុប៖ 10,000៛/);
  assert.equal(formatJekLuyMoney(125n, "USD"), "$1.25");
});

test("KHR defaults to PayBack's rounded share with the leftover kept separate", () => {
  const participants = rows(["10000", "0", "0"]);
  const result = calculateJekLuy(participants, "KHR");
  assert.deepEqual(result.people.map((person) => person.shareCents), [330_000n, 330_000n, 330_000n]);
  assert.equal(result.baseShareCents, 330_000n);
  assert.equal(result.remainderCents, 10_000n);
  assert.equal(result.remainderPersonId, null);
  assert.equal(result.remainderMode, "LEFTOVER_ONLY");
  assert.deepEqual(result.transfers.map((transfer) => transfer.amountCents), [330_000n, 330_000n]);
  assert.equal(result.people.reduce((sum, person) => sum + person.shareCents, result.remainderCents), result.totalCents);
  assert.match(jekluySummary(result), /ចំណែកម្នាក់ៗ៖ 3,300៛/);
  assert.match(jekluySummary(result), /សំណល់ដាច់ដោយឡែក៖ 100៛/);
});

test("both KHR choices retain exact PayBack balances before applying cash rounding", () => {
  const participants = rows(["10001", "7012", "0"]);
  const entries = parsePaybackRows(participants.map((person) => ({ name: person.id, amount: person.amount })));
  for (const mode of ["LEFTOVER_ONLY", "ASSIGN_TO_PERSON"] as const) {
    const expected = buildPaybackPeople(entries, "KHR", mode, "p1");
    const meta = buildPaybackKhrRemainderMeta(entries, mode, "p1");
    const result = calculateJekLuy(participants, "KHR", mode, "p1");
    assert.deepEqual(result.people.map((person) => person.balanceCents), expected.map((person) => person.balanceCents));
    assert.deepEqual(result.exactTransfers.map((transfer) => [transfer.fromId, transfer.toId, transfer.amountCents]), computePaybackSettlements(expected).map((transfer) => [transfer.from, transfer.to, transfer.amountCents]));
    assert.equal(result.remainderPersonId, meta.assignedTo);
  }
});

test("the screenshot's 14,967-riel repayment becomes a real 15,000-riel cash payment", () => {
  const participants = rows(["3333", "33333"]);
  const result = calculateJekLuy(participants, "KHR");
  assert.equal(result.totalCents, 3_666_600n);
  assert.equal(result.baseShareCents, 1_830_000n);
  assert.equal(result.remainderCents, 6_600n);
  assert.deepEqual(result.transfers.map((transfer) => transfer.amountCents), [1_500_000n]);
  assert.deepEqual(result.roundingAdjustments.map((change) => [change.exactAmountCents, change.amountCents]), [[1_496_700n, 1_500_000n]]);
  assert.equal(result.people.find((person) => person.id === "p0")?.settlementBalanceCents, -1_500_000n);
  assert.equal(result.people.find((person) => person.id === "p1")?.settlementBalanceCents, 1_500_000n);
  assert.equal(participants[0]?.amount, "3333");
  assert.match(jekluySummary(result), /ត្រូវសង កក្កដា 15,000៛|កក្កដា ត្រូវសង ដាណែត 15,000៛/);
});

test("all KHR repayments use 100-riel cash units in both modes without inventing zero transfers", () => {
  for (const mode of ["LEFTOVER_ONLY", "ASSIGN_TO_PERSON"] as const) {
    for (const amounts of [["3333", "33333"], ["10101", "7012", "0"], ["1", "0"], ["199", "0"], ["10000", "0", "0"]]) {
      const result = calculateJekLuy(rows(amounts), "KHR", mode, "p1");
      for (const transfer of result.transfers) {
        assert.ok(transfer.amountCents > 0n);
        assert.equal(transfer.amountCents % 10_000n, 0n);
      }
      assert.equal(result.people.reduce((sum, person) => sum + person.settlementBalanceCents, 0n), 0n);
      assert.equal(result.people.reduce((sum, person) => sum + person.actualShareCents, 0n), result.totalCents);
    }
  }
  const tiny = calculateJekLuy(rows(["1", "0"]), "KHR", "ASSIGN_TO_PERSON", "p1");
  assert.deepEqual(tiny.transfers, []);
  assert.equal(tiny.roundingAdjustments.length, 1);
  assert.match(jekluySummary(tiny), /បន្ទាប់ពីបង្គត់/);
  assert.equal(calculateJekLuy(rows(["3367", "33333"]), "KHR").transfers[0]?.amountCents, 1_490_000n);
  assert.equal(calculateJekLuy(rows(["3350", "33350"]), "KHR").transfers[0]?.amountCents, 1_500_000n, "50-riel ties round upward deterministically");
});

test("USD repayments remain cent-exact and old KHR paid marks do not cross the new cash policy", () => {
  const usd = calculateJekLuy(rows(["33.33", "333.33"]), "USD");
  assert.deepEqual(usd.transfers.map((transfer) => transfer.amountCents), [15_000n]);
  assert.deepEqual(usd.roundingAdjustments, []);
  const participants = rows(["3333", "33333"]);
  const oldBasis = JSON.stringify(["KHR", [["p0", "333300"], ["p1", "3333300"]], ["LEFTOVER_ONLY", null]]);
  const result = calculateJekLuy(participants, "KHR");
  assert.deepEqual(getJekLuyCompleted(result, { basis: oldBasis, ids: ['["p0","p1","1496700"]'] }), []);
});

test("group cash rounding never refunds more than someone paid or compounds many tiny debts", () => {
  const five = calculateJekLuy(rows(["300", "50", "50", "50", "50"]), "KHR");
  assert.equal(five.people.find((person) => person.id === "p0")?.actualShareCents, 10_000n);
  assert.deepEqual(five.transfers.map((transfer) => transfer.amountCents), [10_000n, 10_000n]);
  for (const amounts of [
    ["300", "50", "50", "50", "50"],
    ["10300", ...Array(200).fill("49")],
    ["0", ...Array(20).fill("1050")],
    ["0", ...Array(210).fill("49")],
  ]) {
    const result = calculateJekLuy(rows(amounts), "KHR", "ASSIGN_TO_PERSON", "p0");
    assert.equal(result.people.every((person) => person.actualShareCents >= 0n), true);
    assert.equal(result.people.reduce((sum, person) => sum + person.actualShareCents, 0n), result.totalCents);
  }
  const oneDebtor = calculateJekLuy(rows(["0", ...Array(20).fill("1050")]), "KHR");
  assert.equal(oneDebtor.people.find((person) => person.id === "p0")?.actualShareCents, 100_000n);
});

test("varied KHR groups preserve exact spending and bound each normal cash-rounding adjustment", () => {
  let seed = 1637;
  for (let fixture = 0; fixture < 120; fixture++) {
    const count = 2 + fixture % 39;
    const amounts = Array.from({ length: count }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return String(seed % (fixture % 3 === 0 ? 100 : 50000));
    });
    for (const mode of ["LEFTOVER_ONLY", "ASSIGN_TO_PERSON"] as const) {
      const result = calculateJekLuy(rows(amounts), "KHR", mode, "p0");
      assert.equal(result.people.every((person) => person.actualShareCents >= 0n), true);
      assert.equal(result.people.reduce((sum, person) => sum + person.actualShareCents, 0n), result.totalCents);
      assert.equal(result.people.reduce((sum, person) => sum + person.settlementBalanceCents, 0n), 0n);
      assert.equal(result.transfers.every((transfer) => transfer.amountCents > 0n && transfer.amountCents % 10_000n === 0n), true);
      if (result.baseShareCents >= 10_000n) {
        const exactNet = new Map<string, bigint>();
        for (const transfer of result.exactTransfers) {
          exactNet.set(transfer.fromId, (exactNet.get(transfer.fromId) || 0n) - transfer.amountCents);
          exactNet.set(transfer.toId, (exactNet.get(transfer.toId) || 0n) + transfer.amountCents);
        }
        for (const person of result.people) {
          const adjustment = person.settlementBalanceCents - (exactNet.get(person.id) || 0n);
          assert.ok(adjustment > -10_000n && adjustment < 10_000n);
        }
      }
    }
  }
});

test("KHR paid marks cannot cross remainder modes or the selected payer", () => {
  const participants = rows(["10000", "0", "0"]);
  const separate = calculateJekLuy(participants, "KHR");
  const completed = { basis: separate.basis, ids: [separate.transfers[0]!.id] };
  assert.deepEqual(getJekLuyCompleted(calculateJekLuy(participants, "KHR", "ASSIGN_TO_PERSON", "p1"), completed), []);
  const assigned = calculateJekLuy(participants, "KHR", "ASSIGN_TO_PERSON", "p1");
  assert.deepEqual(getJekLuyCompleted(calculateJekLuy(participants, "KHR", "ASSIGN_TO_PERSON", "p2"), { basis: assigned.basis, ids: assigned.transfers.map((transfer) => transfer.id) }), []);
});

test("existing drafts retain names and amounts and adopt PayBack's separate-leftover default", () => {
  const participants = rows(["10000", "0", "0"]);
  const oldBasis = JSON.stringify(["KHR", participants.map((person) => [person.id, (BigInt(person.amount) * 100n).toString()])]);
  const draft = parseJekLuyDraft(JSON.stringify({ version: 1, currency: "KHR", participants, completed: { basis: oldBasis, ids: ['["p1","p0","330000"]'] } }));
  assert.deepEqual(draft.participants, participants);
  assert.equal(draft.remainderMode, "LEFTOVER_ONLY");
  assert.equal(draft.remainderPayer, "");
  assert.deepEqual(getJekLuyCompleted(calculateJekLuy(participants, "KHR"), draft.completed), []);
});
