import assert from "node:assert/strict";
import test from "node:test";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { loadCalendarComponent } from "./helpers/load-calendar-component.ts";

const component = loadCalendarComponent("app/components/roster/RosterEntryBadge.vue");

test("leave badges retain their codes and localized meaning with decorative icons", async () => {
  for (const [code, description] of [
    ["PRD", "Day off"], ["PHL", "Holiday leave"], ["AL", "Annual leave"], ["H1", "Half-day"], ["H2", "Half-day"],
  ]) {
    const html = await renderToString(createSSRApp(component, { code, leaveCode: code }));
    assert.ok(html.includes(description));
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
    assert.ok(html.includes(`>${code}</span>`));
  }
  const khmer = await renderToString(createSSRApp(component, { code: "AL", leaveCode: "AL", khmer: true }));
  assert.ok(khmer.includes("ច្បាប់ប្រចាំឆ្នាំ"));
});

test("shift badges preserve real overnight hours in the label and tooltip", async () => {
  const html = await renderToString(createSSRApp(component, {
    code: "K234", shift: { startTime: "20:00", endTime: "05:30" },
  }));
  assert.match(html, /title="K234 · 20:00 – 05:30"/);
  assert.match(html, /class="roster-entry-time">20:00 – 05:30</);
});
