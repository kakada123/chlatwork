import { nextTick, onBeforeUnmount, ref, watch, type Ref } from "vue";
import type { ExpenseRow, ExpenseStoredState } from "../lib/expense-tracker.ts";
import {
  createDefaultBudget,
  getExpenseMonthISO,
  normalizeExpenseStoredState,
} from "../lib/expense-tracker.ts";
import { buildExpenseEntryChanges } from "../lib/expense-entry-changes.ts";

export type ExpenseDashboardSummary = {
  itemsCount: number;
  totalIncome: number;
  totalSpent: number;
  categoryBreakdown: { category: string; total: number; percent: number }[];
};

export function useExpenseDashboard(signedIn: Ref<boolean>) {
  const currency = ref<"USD" | "KHR">("USD");
  const budget = ref(createDefaultBudget());
  const quickExpenseEnabled = ref(false);
  const rows = ref<ExpenseRow[]>([]);
  const summary = ref<ExpenseDashboardSummary | null>(null);
  const month = getExpenseMonthISO();
  const lastDay = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const dateFrom = ref(`${month}-01`);
  const dateTo = ref(`${month}-${lastDay}`);
  const activeRange = ref({ from: dateFrom.value, to: dateTo.value });
  const hasAppliedFilter = ref(false);
  const loading = ref(false);
  const loadingSummary = ref(false);
  const ready = ref(false);
  const saving = ref(false);
  const error = ref("");
  const saveError = ref("");
  let savedRows: ExpenseRow[] = [];
  let savedProfile = "";
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let savePromise: Promise<boolean> | null = null;
  let summaryRequest = 0;
  let disposed = false;
  const pendingSavedEntries: ExpenseRow[] = [];

  const profileBody = () => ({
    currency: currency.value,
    budgetPeriod: budget.value.period,
    budgetAmount: budget.value.amount,
  });
  const inRange = (row: ExpenseRow) =>
    row.date >= activeRange.value.from && row.date <= activeRange.value.to;

  async function refreshSummary() {
    if (!signedIn.value || disposed) return;
    const request = ++summaryRequest;
    loadingSummary.value = true;
    try {
      const result = await $fetch<ExpenseDashboardSummary>(
        "/api/expenses/summary",
        { query: activeRange.value },
      );
      if (request === summaryRequest && !disposed) summary.value = result;
    } catch {
      if (request === summaryRequest && !disposed)
        error.value =
          "Could not load the spending summary. Apply the filter to try again.";
    } finally {
      if (request === summaryRequest && !disposed) loadingSummary.value = false;
    }
  }

  function changes() {
    return buildExpenseEntryChanges(rows.value, savedRows);
  }

  async function persist() {
    if (!signedIn.value || !ready.value) return !signedIn.value;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (savePromise) {
      if (!(await savePromise)) return false;
      return await persist();
    }
    const initialChanges = changes();
    if (
      !initialChanges.upserts.length &&
      !initialChanges.deleted.length &&
      JSON.stringify(profileBody()) === savedProfile
    )
      return true;
    savePromise = (async () => {
      saving.value = true;
      saveError.value = "";
      try {
        // Serialize requests and compare against the submitted snapshot, preserving edits typed during a save.
        while (!disposed) {
          const snapshot = rows.value.map((row) => ({ ...row }));
          const delta = changes();
          const profile = profileBody();
          const profileJSON = JSON.stringify(profile);
          if (
            !delta.upserts.length &&
            !delta.deleted.length &&
            profileJSON === savedProfile
          )
            break;
          if (delta.upserts.length || delta.deleted.length) {
            const result = await $fetch<{ rows: ExpenseRow[] }>(
              "/api/expenses/entries",
              { method: "PATCH", body: delta },
            );
            const versions = new Map(
              result.rows.map((row) => [row.id, row.updatedAt]),
            );
            savedRows = snapshot.map((row) => ({
              ...row,
              updatedAt: versions.get(row.id) ?? row.updatedAt,
            }));
            for (const row of rows.value) {
              if (versions.has(row.id)) row.updatedAt = versions.get(row.id);
            }
          }
          if (profileJSON !== savedProfile) {
            await $fetch("/api/expenses/profile", {
              method: "PUT",
              body: profile,
            });
            savedProfile = profileJSON;
          }
        }
        await refreshSummary();
        return true;
      } catch (caught) {
        const status = caught as { statusCode?: number; status?: number };
        saveError.value =
          (status.statusCode ?? status.status) === 409
            ? "This entry changed elsewhere. Your edits are kept here; reload the page to get the latest version."
            : "Could not save changes. Your edits are kept here. Try saving again.";
        return false;
      } finally {
        saving.value = false;
        savePromise = null;
      }
    })();
    return await savePromise;
  }

  watch(
    [rows, currency, budget],
    () => {
      if (!ready.value || !signedIn.value || loading.value || saveError.value)
        return;
      const delta = changes();
      if (
        !delta.upserts.length &&
        !delta.deleted.length &&
        JSON.stringify(profileBody()) === savedProfile
      )
        return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => void persist(), 700);
    },
    { deep: true },
  );

  async function applyFilter() {
    if (!dateFrom.value || !dateTo.value || dateFrom.value > dateTo.value) {
      error.value = "Choose a valid start and end date.";
      return;
    }
    if (loading.value || !ready.value) return;
    if (signedIn.value && !(await persist())) return;
    const range = { from: dateFrom.value, to: dateTo.value };
    error.value = "";
    loading.value = true;
    summaryRequest += 1;
    loadingSummary.value = false;
    try {
      if (signedIn.value) {
        const [entries, totals] = await Promise.all([
          $fetch<ExpenseRow[]>("/api/expenses/entries", { query: range }),
          $fetch<ExpenseDashboardSummary>("/api/expenses/summary", {
            query: range,
          }),
        ]);
        rows.value = entries;
        savedRows = entries.map((row) => ({ ...row }));
        summary.value = totals;
      }
      activeRange.value = range;
      hasAppliedFilter.value = true;
      await nextTick();
    } catch {
      error.value =
        "Could not load expenses for these dates. Try applying the filter again.";
    } finally {
      loading.value = false;
      for (const row of pendingSavedEntries.splice(0)) acceptSavedEntry(row);
    }
  }

  async function initialize(example?: ExpenseStoredState | null) {
    if (example) {
      currency.value = example.currency;
      budget.value = example.budget;
      rows.value = example.rows.map((row) => ({
        ...row,
        id: crypto.randomUUID(),
      }));
    } else if (signedIn.value) {
      try {
        const profile = normalizeExpenseStoredState(
          await $fetch("/api/expenses/profile"),
        );
        if (!profile) throw new Error("Invalid expense profile");
        currency.value = profile.currency;
        budget.value = profile.budget;
        quickExpenseEnabled.value = profile.quickExpenseEnabled;
      } catch {
        error.value =
          "Could not load your expense dashboard. Reload the page to try again.";
        return;
      }
    }
    savedProfile = JSON.stringify(profileBody());
    await nextTick();
    ready.value = true;
    if (!example) await refreshSummary();
  }

  async function appendRows(entries: ExpenseRow[]) {
    rows.value = [
      ...rows.value,
      ...entries.map((row) => ({
        ...row,
        id: row.id ?? crypto.randomUUID(),
        updatedAt: undefined,
      })),
    ];
    await nextTick();
    return await persist();
  }

  function acceptSavedEntry(row: ExpenseRow) {
    if (saving.value && savePromise) {
      void savePromise.then(() => acceptSavedEntry(row));
      return;
    }
    if (loading.value) {
      pendingSavedEntries.push(row);
      return;
    }
    // Floating quick entry already saved this row; mirroring it must never issue another write.
    if (
      hasAppliedFilter.value &&
      inRange(row) &&
      row.id &&
      !rows.value.some((item) => item.id === row.id)
    ) {
      savedRows.push({ ...row });
      rows.value = [...rows.value, row];
    }
    void refreshSummary();
  }

  onBeforeUnmount(() => {
    disposed = true;
    summaryRequest += 1;
    if (saveTimer) clearTimeout(saveTimer);
  });

  return {
    currency,
    budget,
    quickExpenseEnabled,
    rows,
    summary,
    dateFrom,
    dateTo,
    activeRange,
    hasAppliedFilter,
    loading,
    loadingSummary,
    ready,
    saving,
    error,
    saveError,
    persist,
    applyFilter,
    initialize,
    appendRows,
    acceptSavedEntry,
  };
}
