import assert from "node:assert/strict";
import test from "node:test";
import { buildExpenseEntryChanges } from "../app/lib/expense-entry-changes.ts";

const saved = {
  id: "00000000-0000-4000-8000-000000000001",
  updatedAt: "2026-10-01T00:00:00.000Z",
  type: "expense" as const,
  date: "2026-10-01",
  category: "Food",
  note: "Lunch",
  amount: "5",
  showNote: true,
};

test("unchanged loaded entries produce no writes", () => {
  assert.deepEqual(buildExpenseEntryChanges([{ ...saved }], [saved]), {
    upserts: [],
    deleted: [],
  });
});

test("only edited entries are sent with their original version", () => {
  const other = { ...saved, id: "00000000-0000-4000-8000-000000000002" };
  const result = buildExpenseEntryChanges(
    [{ ...saved, amount: "6" }, other],
    [saved, other],
  );
  assert.equal(result.upserts.length, 1);
  assert.equal(result.upserts[0].id, saved.id);
  assert.equal(result.upserts[0].updatedAt, saved.updatedAt);
  assert.equal(result.upserts[0].amount, "6");
  assert.deepEqual(result.deleted, []);
});

test("new entries and explicit removals do not affect unloaded history", () => {
  const created = {
    ...saved,
    id: "00000000-0000-4000-8000-000000000003",
    updatedAt: undefined,
  };
  const result = buildExpenseEntryChanges([created], [saved]);
  assert.deepEqual(result.deleted, [
    { id: saved.id, updatedAt: saved.updatedAt },
  ]);
  assert.equal(result.upserts.length, 1);
  assert.equal(result.upserts[0].id, created.id);
  assert.equal(result.upserts[0].updatedAt, undefined);
});
