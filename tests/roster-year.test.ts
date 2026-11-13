import { rosterGenerationPreserves, rosterDayViolation, rosterPrdAllowance, rosterMonthPrdCount, rosterOverLimitWeeks } from "../api/src/roster/roster-week.util.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as rosterLib from "../app/lib/roster.ts";
import { getHolidaySchedule } from "../app/data/cambodia-holidays.ts";

function loadRoster(fetcher?: (...args: any[]) => Promise<any>) {
  const source = readFileSync(
    new URL("../app/composables/useRoster.ts", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const deps: Record<string, unknown> = {
    vue: { ...vue, watch() {} },
    "../lib/roster": rosterLib,
    "../../api/src/roster/roster-week.util": { rosterGenerationPreserves, rosterDayViolation, rosterPrdAllowance, rosterMonthPrdCount, rosterOverLimitWeeks },
    "../data/cambodia-holidays": { getHolidaySchedule },
    "../lib/khmer-calendar": {
      getPhnomPenhToday: () => ({ year: 2026, month: 11, day: 13 }),
    },
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "$fetch", code)(
    (name: string) => {
      assert.ok(name in deps, name);
      return deps[name];
    },
    module,
    module.exports,
    fetcher,
  );
  return module.exports.useRoster;
}

test("guest annual usage spans months and credits stay in their own year", async () => {
  let stored = JSON.stringify({
    preferences: rosterLib.DEFAULT_PREFERENCES,
    shifts: rosterLib.DEFAULT_SHIFTS,
    days: {
      "2026-01-05": {
        entryDate: "2026-01-05",
        leaveCode: "AL",
        status: "CONFIRMED",
      },
      "2026-09-10": {
        entryDate: "2026-09-10",
        leaveCode: "H1",
        status: "CONFIRMED",
      },
      "2026-11-11": {
        entryDate: "2026-11-11",
        leaveCode: "PHL",
        status: "CONFIRMED",
      },
      "2027-01-06": {
        entryDate: "2027-01-06",
        leaveCode: "AL",
        status: "CONFIRMED",
      },
    },
    balances: {
      AL: { opening: 20, earned: 0, adjustment: 0 },
      PHL: { opening: 10, earned: 0, adjustment: 0 },
    },
    transactions: [],
  });
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => stored,
        setItem: (_key: string, value: string) => {
          stored = value;
        },
      },
    },
  });
  try {
    const year = vue.ref(2027);
    const month = vue.ref(11);
    const roster = loadRoster()(year, month, vue.ref(false));
    await roster.loadMonth();
    assert.equal(
      roster.summary.value.alRemaining,
      -1,
      "Legacy credits must not be copied to the selected future year",
    );
    await roster.recordLeaveAdjustment({
      leaveCode: "AL",
      year: 2027,
      kind: "OPENING_BALANCE",
      halfDays: 6,
    });
    assert.equal(roster.summary.value.alRemaining, 2);
    year.value = 2026;
    await roster.loadMonth();
    assert.equal(roster.summary.value.alUsed, 1.5);
    assert.equal(roster.summary.value.phlUsed, 1);
    assert.equal(roster.summary.value.alRemaining, 8.5);
    assert.equal(roster.summary.value.phlRemaining, 4);
    month.value = 2;
    await roster.loadMonth();
    assert.equal(roster.summary.value.alUsed, 1.5);
    year.value = 2027;
    await roster.loadMonth();
    assert.equal(roster.summary.value.alUsed, 1);
    assert.equal(roster.summary.value.alRemaining, 2);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("signed-in settings request the selected year for annual balances", async () => {
  const year = vue.ref(2027);
  const settingsYears: number[] = [];
  const roster = loadRoster(async (url, options) => {
    if (url === "/api/roster/month") return [];
    assert.equal(url, "/api/roster/settings");
    settingsYears.push(options?.query?.year);
    return {
      preferences: rosterLib.DEFAULT_PREFERENCES,
      shifts: rosterLib.DEFAULT_SHIFTS,
      leaveBalances: [],
    };
  })(year, vue.ref(11), vue.ref(true));
  await roster.loadMonth();
  year.value = 2028;
  await roster.loadMonth();
  assert.deepEqual(settingsYears, [2027, 2028]);
});

test("bulk status changes update selected entries once and preserve locked and missing dates", async () => {
  let stored = JSON.stringify({
    annualBalancesVersion: 1,
    preferences: rosterLib.DEFAULT_PREFERENCES,
    shifts: rosterLib.DEFAULT_SHIFTS,
    days: {
      "2026-11-02": {
        entryDate: "2026-11-02",
        leaveCode: "AL",
        status: "DRAFT",
        isLocked: false,
      },
      "2026-11-03": {
        entryDate: "2026-11-03",
        leaveCode: "H1",
        status: "DRAFT",
        isLocked: false,
      },
      "2026-11-04": {
        entryDate: "2026-11-04",
        leaveCode: "AL",
        status: "DRAFT",
        isLocked: true,
      },
    },
    balances: { "2026:AL": { opening: 20, earned: 0, adjustment: 0 } },
    transactions: [],
  });
  let writes = 0;
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => stored,
        setItem: (_key: string, value: string) => {
          stored = value;
          writes++;
        },
      },
    },
  });
  try {
    const roster = loadRoster()(vue.ref(2026), vue.ref(11), vue.ref(false));
    await roster.loadMonth();
    const result = await roster.updateStatuses(
      ["2026-11-02", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"],
      "CONFIRMED",
    );
    assert.equal(result.updated, 2);
    assert.equal(writes, 1);
    assert.equal(JSON.parse(stored).days["2026-11-04"].status, "DRAFT");
    assert.equal(roster.summary.value.alUsed, 1.5);
    assert.equal(roster.summary.value.alRemaining, 8.5);
    assert.equal(
      await roster.updateStatuses(["2026-12-01"], "CANCELLED"),
      null,
    );
    assert.equal(writes, 1);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("flow off immediately confirms saves and edits while flow on preserves chosen status", async () => {
  let stored = JSON.stringify({
    annualBalancesVersion: 1,
    preferences: { ...rosterLib.DEFAULT_PREFERENCES, statusFlowEnabled: false },
    shifts: rosterLib.DEFAULT_SHIFTS,
    days: {},
    balances: { "2026:AL": { opening: 20, earned: 0, adjustment: 0 }, "2026:PHL": { opening: 20, earned: 0, adjustment: 0 } },
    transactions: [],
  });
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: () => stored,
        setItem: (_key: string, value: string) => {
          stored = value;
        },
      },
    },
  });
  try {
    const roster = loadRoster()(vue.ref(2026), vue.ref(11), vue.ref(false));
    await roster.loadMonth();
    await roster.saveDay("2026-11-02", { leaveCode: "AL", status: "DRAFT" });
    assert.equal(roster.days.value[0].status, "CONFIRMED");
    assert.equal(roster.summary.value.alUsed, 1);
    await roster.saveDay("2026-11-02", { leaveCode: "PHL" });
    assert.equal(roster.summary.value.alUsed, 0);
    assert.equal(roster.summary.value.phlUsed, 1);
    await roster.savePreferences({ statusFlowEnabled: true });
    await roster.saveDay("2026-11-03", { leaveCode: "AL", status: "DRAFT" });
    assert.equal(
      roster.days.value.find((day: any) => day.entryDate === "2026-11-03")
        .status,
      "DRAFT",
    );
    assert.equal(roster.summary.value.alUsed, 0);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("guest regeneration applies newly added annual credit once and supports flexible half-days", async () => {
  let stored = JSON.stringify({ annualBalancesVersion: 1, preferences: { ...rosterLib.DEFAULT_PREFERENCES, monthlyPrdAllowance: 0 }, shifts: rosterLib.DEFAULT_SHIFTS, days: {}, balances: {}, transactions: [] });
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; },
  } } });
  try {
    const roster = loadRoster()(vue.ref(2027), vue.ref(1), vue.ref(false));
    await roster.loadMonth();
    assert.equal(await roster.applySmartRoster(await roster.previewSmartRoster()), true);
    for (const leaveCode of ["PHL", "AL"]) {
      assert.equal(await roster.recordLeaveAdjustment({ leaveCode, year: 2027, kind: "OPENING_BALANCE", halfDays: 2 }), true);
    }
    const preview = await roster.previewSmartRoster();
    assert.equal(preview.suggestions.filter((day: any) => day.leaveCode === "PHL").length, 1);
    assert.equal(preview.suggestions.filter((day: any) => day.leaveCode === "AL").length, 1);
    assert.equal(await roster.applySmartRoster(preview), true);
    assert.equal(await roster.applySmartRoster(preview), true);
    assert.equal(roster.phlBalance.value.confirmedUsedHalfDays, 2);
    assert.equal(roster.alBalance.value.confirmedUsedHalfDays, 2);
    await roster.recordLeaveAdjustment({ leaveCode: "AL", year: 2027, kind: "EARNED", halfDays: 1 });
    assert.equal(await roster.saveDay("2027-01-04", { leaveCode: "H1", shiftCode: "K123" }), true);
    assert.equal(roster.daysByDate.value.get("2027-01-04").shiftCode, null);
    assert.equal(roster.alBalance.value.confirmedUsedHalfDays, 3);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
