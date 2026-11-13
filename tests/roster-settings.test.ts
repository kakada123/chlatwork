import assert from "node:assert/strict";
import test from "node:test";
import { nextTick, reactive } from "vue";
import { loadCalendarComponent } from "./helpers/load-calendar-component.ts";
import { DEFAULT_PREFERENCES, DEFAULT_SHIFTS } from "../app/lib/roster.ts";

test("settings refresh loaded preferences on open and save the status-flow setting", async () => {
  const component = loadCalendarComponent(
    "app/components/roster/RosterSettingsModal.vue",
    { inlineTemplate: false },
  );
  const props = reactive({
    open: false,
    preferences: { ...DEFAULT_PREFERENCES },
    shifts: [],
    balances: [],
    transactions: [],
    khmer: false,
    busy: false,
    year: 2027,
  });
  const events: any[][] = [];
  const settings = component.setup(props, {
    expose() {},
    emit: (...args: any[]) => events.push(args),
  });
  props.preferences = {
    ...DEFAULT_PREFERENCES,
    statusFlowEnabled: true,
    monthlyPrdAllowance: 0,
  };
  props.open = true;
  await nextTick();
  settings.handleSavePreferences();
  assert.equal(events[0][1].statusFlowEnabled, true);
  assert.equal(events[0][1].monthlyPrdAllowance, 0);
  settings.submitAdjustment();
  assert.equal(events[1][1].year, 2027);
});

test("day edits immediately confirm with status flow off", () => {
  const component = loadCalendarComponent(
    "app/components/roster/RosterDayEditorModal.vue",
    { inlineTemplate: false },
  );
  const events: any[][] = [];
  const props = {
    open: true,
    dateKey: "2026-11-02",
    entry: null,
    day: null,
    preferences: { ...DEFAULT_PREFERENCES },
    shifts: DEFAULT_SHIFTS,
    khmer: false,
  };
  const editor = component.setup(props, {
    expose() {},
    emit: (...args: any[]) => events.push(args),
  });
  editor.selectedStatus.value = "DRAFT";
  editor.handleSave();
  assert.equal(events[0][1].status, "CONFIRMED");
  props.preferences.statusFlowEnabled = true;
  editor.handleSave();
  assert.equal(events[1][1].status, "DRAFT");
});
