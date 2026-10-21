import assert from "node:assert/strict";
import test from "node:test";
import { createRenderer, nextTick, ref } from "vue";
import { useExpenseDashboard } from "../app/composables/useExpenseDashboard.ts";

const entry = {
  id: "00000000-0000-4000-8000-000000000001",
  updatedAt: "2026-10-01T00:00:00.000Z",
  type: "expense" as const,
  date: "2026-10-01",
  category: "Food",
  amount: "5",
  note: "",
  showNote: false,
};
const totals = {
  itemsCount: 1,
  totalIncome: 0,
  totalSpent: 5,
  categoryBreakdown: [{ category: "Food", total: 5, percent: 100 }],
};

function mountDashboard(
  fetcher: (path: string, options?: any) => Promise<unknown>,
) {
  (globalThis as any).$fetch = fetcher;
  // A minimal Vue host exercises real reactivity and lifecycle without a browser or Nuxt server.
  const renderer = createRenderer<any, any>({
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    insert() {},
    remove() {},
    setText() {},
    setElementText() {},
    patchProp() {},
    parentNode: () => null,
    nextSibling: () => null,
  });
  let dashboard!: ReturnType<typeof useExpenseDashboard>;
  const app = renderer.createApp({
    setup() {
      dashboard = useExpenseDashboard(ref(true));
      return () => null;
    },
  });
  app.mount({});
  return { dashboard, unmount: () => app.unmount() };
}

test("opening the dashboard loads totals but no entry history or writes", async () => {
  const calls: string[] = [];
  const { dashboard, unmount } = mountDashboard(async (path) => {
    calls.push(path);
    if (path.endsWith("profile"))
      return {
        currency: "USD",
        budget: { period: "monthly", amount: "100" },
        rows: [],
      };
    if (path.endsWith("summary")) return totals;
    throw new Error("Unexpected history request or write");
  });
  try {
    await dashboard.initialize();
    assert.deepEqual(calls, ["/api/expenses/profile", "/api/expenses/summary"]);
    assert.equal(dashboard.hasAppliedFilter.value, false);
    assert.deepEqual(dashboard.rows.value, []);
    assert.equal(dashboard.summary.value?.totalSpent, 5);
  } finally {
    unmount();
  }
});

test("applying dates fetches matching entries and switching dates never saves unchanged rows", async () => {
  const writes: unknown[] = [];
  const ranges: unknown[] = [];
  const { dashboard, unmount } = mountDashboard(async (path, options) => {
    if (options?.method) writes.push(options);
    if (path.endsWith("entries")) {
      ranges.push(options.query);
      return [entry];
    }
    if (path.endsWith("summary")) return totals;
    return { currency: "USD", rows: [] };
  });
  try {
    await dashboard.initialize();
    dashboard.dateFrom.value = "2026-10-01";
    dashboard.dateTo.value = "2026-10-21";
    await dashboard.applyFilter();
    assert.equal(dashboard.hasAppliedFilter.value, true);
    assert.equal(dashboard.rows.value[0].id, entry.id);
    assert.deepEqual(ranges, [{ from: "2026-10-01", to: "2026-10-21" }]);
    dashboard.dateTo.value = "2026-10-31";
    await dashboard.applyFilter();
    assert.deepEqual(writes, []);
  } finally {
    unmount();
  }
});

test("new expense saves only itself without revealing history", async () => {
  const writes: any[] = [];
  const { dashboard, unmount } = mountDashboard(async (path, options) => {
    if (options?.method) {
      writes.push({ path, ...options });
      return { rows: [entry] };
    }
    if (path.endsWith("summary")) return totals;
    return { currency: "USD", rows: [] };
  });
  try {
    await dashboard.initialize();
    assert.equal(
      await dashboard.appendRows([{ ...entry, updatedAt: undefined }]),
      true,
    );
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, "/api/expenses/entries");
    assert.equal(writes[0].body.upserts.length, 1);
    assert.deepEqual(writes[0].body.deleted, []);
    assert.equal(dashboard.hasAppliedFilter.value, false);
    dashboard.acceptSavedEntry({
      ...entry,
      id: "00000000-0000-4000-8000-000000000002",
    });
    await nextTick();
    assert.equal(writes.length, 1);
  } finally {
    unmount();
  }
});

test("edits made during a save use the returned version and are not lost", async () => {
  let completeFirst!: (value: unknown) => void;
  const writes: any[] = [];
  const { dashboard, unmount } = mountDashboard(async (path, options) => {
    if (options?.method) {
      writes.push(options.body);
      if (writes.length === 1)
        return await new Promise((resolve) => {
          completeFirst = resolve;
        });
      return {
        rows: [
          { ...entry, amount: "7", updatedAt: "2026-10-21T00:00:02.000Z" },
        ],
      };
    }
    if (path.endsWith("entries")) return [entry];
    if (path.endsWith("summary")) return totals;
    return { currency: "USD", rows: [] };
  });
  try {
    await dashboard.initialize();
    await dashboard.applyFilter();
    dashboard.rows.value[0].amount = "6";
    const saving = dashboard.persist();
    dashboard.rows.value[0].amount = "7";
    completeFirst({
      rows: [{ ...entry, amount: "6", updatedAt: "2026-10-21T00:00:01.000Z" }],
    });
    assert.equal(await saving, true);
    assert.equal(writes.length, 2);
    assert.equal(writes[1].upserts[0].amount, "7");
    assert.equal(writes[1].upserts[0].updatedAt, "2026-10-21T00:00:01.000Z");
    assert.equal(dashboard.rows.value[0].amount, "7");
  } finally {
    unmount();
  }
});

test("a failed save keeps edits and blocks changing the active filter", async () => {
  const { dashboard, unmount } = mountDashboard(async (path, options) => {
    if (options?.method) throw { statusCode: 409 };
    if (path.endsWith("entries")) return [entry];
    if (path.endsWith("summary")) return totals;
    return { currency: "USD", rows: [] };
  });
  try {
    await dashboard.initialize();
    await dashboard.applyFilter();
    const previous = { ...dashboard.activeRange.value };
    dashboard.rows.value[0].amount = "6";
    dashboard.dateFrom.value = "2026-09-01";
    await dashboard.applyFilter();
    assert.deepEqual(dashboard.activeRange.value, previous);
    assert.equal(dashboard.rows.value[0].amount, "6");
    assert.match(dashboard.saveError.value, /changed elsewhere/);
  } finally {
    unmount();
  }
});
