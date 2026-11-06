import assert from "node:assert/strict";
import test from "node:test";
import english from "../app/locales/en/native.ts";
import khmer from "../app/locales/km/native.ts";
import { translateMessage } from "../app/lib/i18n.ts";
import { calculateJekLuy, jekluySummary, JekLuyInputError } from "../app/lib/jekluy.ts";

test("native games and JekLuy provide matching centralized catalogs with meaningful English copy", () => {
  assert.deepEqual(Object.keys(english).sort(), Object.keys(khmer).sort());
  assert.ok(Object.keys(english).length > 250);
  for (const [key, value] of Object.entries(english)) {
    assert.match(key, /^native\.(?:jekluy|patience|cockroach)\./);
    assert.ok(value.length, key);
    assert.ok(khmer[key as keyof typeof khmer]?.length, key);
  }
  assert.equal(translateMessage("en", "native.patience.testYourPatience"), "Test your patience");
  assert.equal(translateMessage("km", "native.patience.testYourPatience"), "សាកល្បងភាពអត់ធ្មត់របស់អ្នក");
});

test("changing JekLuy summary language preserves financial results and participant data", () => {
  const participants = [{ id: "payer", name: "Alice {count}", amount: "30000" }, { id: "friend", name: "Bob", amount: "0" }];
  const original = structuredClone(participants);
  const km = calculateJekLuy(participants, "KHR");
  const en = calculateJekLuy(participants, "KHR", "LEFTOVER_ONLY", "", "en");
  assert.deepEqual(en, km);
  assert.deepEqual(participants, original);
  const englishSummary = jekluySummary(en, [], "en");
  const khmerSummary = jekluySummary(km);
  assert.match(englishSummary, /Total: 30,000៛/);
  assert.match(englishSummary, /Bob owes Alice \{count\} 15,000៛/);
  assert.match(khmerSummary, /Bob ត្រូវសង Alice \{count\} 15,000៛/);
  assert.ok(englishSummary.includes("Alice {count}"));
  assert.match(khmerSummary, /សរុប៖ 30,000៛/);
});

test("localized JekLuy errors retain their participant and field metadata", () => {
  const participants = [{ id: "missing", name: "", amount: "0" }, { id: "friend", name: "Bob", amount: "0" }];
  assert.throws(() => calculateJekLuy(participants, "USD", "LEFTOVER_ONLY", "", "en"), (error: unknown) => {
    assert.ok(error instanceof JekLuyInputError);
    assert.equal(error.participantId, "missing");
    assert.equal(error.field, "name");
    assert.equal(error.message, "Enter the name of person 1.");
    return true;
  });
});
