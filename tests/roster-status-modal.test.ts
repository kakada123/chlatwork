import assert from "node:assert/strict";
import test from "node:test";
import { loadCalendarComponent } from "./helpers/load-calendar-component.ts";
import {
  DEFAULT_PREFERENCES,
  computeMonthlyRosterSummary,
} from "../app/lib/roster.ts";

test("status popup defaults to the whole month and supports choosing individual dates", () => {
  const component = loadCalendarComponent(
    "app/components/roster/RosterBulkStatusModal.vue",
    { inlineTemplate: false },
  );
  const days = [
    {
      entryDate: "2026-11-02",
      shiftCode: "K123",
      leaveCode: null,
      status: "DRAFT",
      isLocked: false,
    },
    {
      entryDate: "2026-11-03",
      shiftCode: null,
      leaveCode: "PRD",
      status: "DRAFT",
      isLocked: false,
    },
    {
      entryDate: "2026-11-04",
      shiftCode: "K123",
      leaveCode: null,
      status: "DRAFT",
      isLocked: true,
    },
  ];
  const events: any[][] = [];
  const popup = component.setup(
    {
      open: false,
      days,
      year: 2026,
      month: 11,
      monthTitle: "November",
      summary: computeMonthlyRosterSummary(
        2026,
        11,
        [],
        DEFAULT_PREFERENCES,
        new Map(),
      ),
      busy: false,
      khmer: false,
      statusFlowEnabled: false,
    },
    { expose() {}, emit: (...args: any[]) => events.push(args) },
  );
  popup.apply();
  assert.deepEqual(events[0], [
    "apply",
    { dates: ["2026-11-02", "2026-11-03"], status: "CONFIRMED" },
  ]);
  popup.scope.value = "dates";
  popup.toggle("2026-11-03");
  popup.toggle("2026-11-04");
  popup.apply();
  assert.deepEqual(events[1], [
    "apply",
    { dates: ["2026-11-03"], status: "CONFIRMED" },
  ]);
});
