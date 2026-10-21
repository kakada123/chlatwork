import type { ExpenseRow } from "./expense-tracker.ts";

export function buildQuickExpenseRequest(row: ExpenseRow) {
  return {
    amount: row.amount,
    category: row.category,
    customCategory:
      row.category === "__custom__" ? row.customCategory?.trim() : undefined,
    date: row.date,
    note: row.note,
  };
}

export function expenseEntryData(row: ExpenseRow) {
  return {
    type: row.type ?? "expense",
    date: row.date,
    category: row.category,
    customCategory: row.customCategory || undefined,
    note: row.note,
    showNote: row.showNote ?? false,
    amount: row.amount,
  };
}

export function buildExpenseEntryChanges(
  rows: ExpenseRow[],
  saved: ExpenseRow[],
) {
  const previous = new Map(saved.map((row) => [row.id, row]));
  const currentIds = new Set(rows.map((row) => row.id));
  return {
    upserts: rows.flatMap((row) => {
      if (!row.id) throw new Error("Expense entry is missing its ID");
      const before = previous.get(row.id);
      if (
        before &&
        JSON.stringify(expenseEntryData(before)) ===
          JSON.stringify(expenseEntryData(row))
      )
        return [];
      return [
        { id: row.id, updatedAt: before?.updatedAt, ...expenseEntryData(row) },
      ];
    }),
    deleted: saved
      .filter((row) => row.id && row.updatedAt && !currentIds.has(row.id))
      .map((row) => ({ id: row.id!, updatedAt: row.updatedAt! })),
  };
}
