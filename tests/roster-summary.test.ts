import assert from "node:assert/strict";
import test from "node:test";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { loadCalendarComponent } from "./helpers/load-calendar-component.ts";
import {
  computeMonthlyRosterSummary,
  DEFAULT_PREFERENCES,
} from "../app/lib/roster.ts";

test("summary figures stay visible as a compact strip without a toggle or heading", async () => {
  const component = loadCalendarComponent(
    "app/components/roster/RosterSummaryBar.vue",
  );
  const html = await renderToString(
    createSSRApp(component, {
      summary: computeMonthlyRosterSummary(
        2026,
        11,
        [],
        DEFAULT_PREFERENCES,
        new Map(),
      ),
      year: 2026,
      khmer: true,
    }),
  );
  assert.doesNotMatch(html, /<(details|summary)\b/);
  assert.ok(!html.includes("សង្ខេបតារាងវេន និងសមតុល្យច្បាប់"));
  assert.ok(html.includes("PHL"));
  assert.ok(html.includes("PRD"));
  assert.ok(html.includes("AL"));
  assert.equal((html.match(/<svg /g) ?? []).length, 7);
});
