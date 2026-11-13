import assert from "node:assert/strict";
import test from "node:test";
import { createSSRApp, nextTick, reactive } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";
import { loadCalendarComponent } from "./helpers/load-calendar-component.ts";
import { DEFAULT_PREFERENCES, DEFAULT_SHIFTS } from "../app/lib/roster.ts";

test("settings show saving, success, and failure feedback inside the dialog", async () => {
  for (const state of [
    { busy: true, saved: true, error: "", role: "status", message: "Saving…", khmer: false },
    { busy: false, saved: true, error: "", role: "status", message: "Saved successfully.", khmer: false },
    { busy: false, saved: true, error: "Unable to save settings.", role: "alert", message: "Unable to save settings.", khmer: false },
    { busy: false, saved: true, error: "", role: "status", message: "បានរក្សាទុកដោយជោគជ័យ។", khmer: true },
  ]) {
    const context: SSRContext = {};
    await renderToString(createSSRApp(loadCalendarComponent("app/components/roster/RosterSettingsModal.vue"), {
      open: true, preferences: DEFAULT_PREFERENCES, shifts: [], balances: [], transactions: [], year: 2026, ...state,
    }), context);
    const html = context.teleports?.body ?? "";
    assert.ok(html.includes(`role="${state.role}"`));
    assert.ok(html.includes(state.message));
    if (state.busy || state.error) assert.ok(!html.includes("Saved successfully."));
  }
});

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
    saturdayOff: false,
  };
  props.open = true;
  await nextTick();
  settings.handleSavePreferences();
  assert.equal(events[0][1].statusFlowEnabled, true);
  assert.equal(events[0][1].monthlyPrdAllowance, 0);
  assert.equal(events[0][1].saturdayOff, true);
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

test("half-day leave saves without a shift and restores the normal default when cleared", () => {
  const editorComponent = loadCalendarComponent("app/components/roster/RosterDayEditorModal.vue", { inlineTemplate: false });
  const events: any[][] = [];
  const editor = editorComponent.setup({ open: true, dateKey: "2027-01-04", entry: null, day: null, preferences: DEFAULT_PREFERENCES, shifts: DEFAULT_SHIFTS, khmer: false }, { expose() {}, emit: (...args: any[]) => events.push(args) });
  for (const code of ["H1", "H2"]) {
    editor.handleLeaveChange(code);
    editor.handleSave();
    assert.equal(events.at(-1)[1].shiftCode, null);
    assert.equal(events.at(-1)[1].leaveCode, code);
  }
  editor.handleLeaveChange(null);
  editor.handleSave();
  assert.equal(events.at(-1)[1].shiftCode, "K123");
});

test("half-day editor hides fixed shift choices and calculated arrival hours", async () => {
  const context: SSRContext = {};
  await renderToString(createSSRApp(loadCalendarComponent("app/components/roster/RosterDayEditorModal.vue"), {
    open: true, dateKey: "2027-01-04", entry: { shiftCode: "K123", leaveCode: "H1", status: "CONFIRMED" },
    day: null, preferences: DEFAULT_PREFERENCES, shifts: DEFAULT_SHIFTS, khmer: false,
  }), context);
  assert.ok(!context.teleports?.body.includes("Working Shift"));
  assert.ok(!context.teleports?.body.includes("4.75"));
});
