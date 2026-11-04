import assert from "node:assert/strict";
import test from "node:test";
import { createSSRApp, h, reactive } from "vue";
import { renderToString } from "vue/server-renderer";
import { createHead, renderSSRHead } from "@unhead/vue/server";
import { loadCalendarComponent } from "./helpers/load-calendar-component.ts";

const filename = "app/pages/tools/khmer-calendar/date/[date].vue";
async function renderDetail(
  date: unknown,
  query: Record<string, unknown> = {},
) {
  const route = reactive({ params: { date }, query });
  const app = createSSRApp(loadCalendarComponent(filename, { route }));
  app.config.warnHandler = (message) => {
    if (!message.startsWith("Unhandled error during execution"))
      throw new Error(message);
  };
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (props: any, { slots }: any) =>
      () =>
        h("a", { href: props.to }, slots.default?.()),
  });
  const head = createHead();
  // Simulate the global application's defaults so the page must override them.
  head.push({
    meta: [
      { property: "og:title", content: "ChlatWork" },
      { property: "og:url", content: "https://chlatwork.com" },
    ],
    link: [{ rel: "canonical", href: "https://chlatwork.com" }],
  });
  app.use(head);
  const html = await renderToString(app);
  return { html, head: (await renderSSRHead(head)).headTags };
}

test("a shared date renders lunar details, every overlapping event, and its own metadata", async () => {
  const { html, head } = await renderDetail("2026-05-01", { lang: "en" });
  assert.match(html, /International Labour Day/);
  assert.match(html, /Visak Bochea/);
  assert.match(html, /Khmer lunar date/);
  assert.match(html, /Back to calendar/);
  assert.match(
    html,
    /href="\/tools\/khmer-calendar\?date=2026-05-01&amp;lang=en"/,
  );
  assert.match(html, /event=labour-day/);
  assert.match(html, /event=visak-bochea/);
  assert.match(head, /1 May 2026/);
  assert.match(
    head,
    /rel="canonical" href="https:\/\/chlatwork.com\/tools\/khmer-calendar\/date\/2026-05-01\?lang=en"/,
  );
});

test("a specific holiday leads the page and social preview without losing the date", async () => {
  const { html, head } = await renderDetail("2026-11-09", {
    event: "independence-day",
    lang: "en",
    private: "discard-me",
  });
  assert.match(html, /<h1[^>]*>National Independence Day<\/h1>/);
  assert.match(html, /Cambodian public holiday/);
  assert.match(html, /2026/);
  assert.match(head, /property="og:title" content="National Independence Day/);
  assert.ok(head.includes("event=independence-day&lang=en"));
  assert.equal((head.match(/rel="canonical"/g) ?? []).length, 1);
  assert.equal((head.match(/property="og:title"/g) ?? []).length, 1);
  assert.doesNotMatch(head, /discard-me/);
});

test("default links render Khmer and unverified years retain the coverage warning", async () => {
  const { html } = await renderDetail("2028-01-01");
  assert.match(html, /lang="km"/);
  assert.match(html, /២០២៨/);
  assert.match(html, /មិនទាន់មានបញ្ជីថ្ងៃឈប់សម្រាកផ្លូវការ/);
});

test("invalid date and mismatched or duplicate event parameters return 404", async () => {
  for (const [date, query] of [
    ["2026-02-29", {}],
    ["2026-11-09", { event: "christmas" }],
    ["2026-11-09", { event: ["independence-day", "christmas"] }],
  ] as const) {
    await assert.rejects(
      renderDetail(date, query),
      (error: any) => error.statusCode === 404,
    );
  }
});

test("same-page navigation updates language and event, and invalid queries show a fatal 404", () => {
  const route = reactive<any>({
    params: { date: "2026-05-01" },
    query: { lang: "en" },
  });
  const component = loadCalendarComponent(filename, {
    route,
    inlineTemplate: false,
  });
  const page = component.setup({}, { expose() {} });
  assert.equal(page.event.value, null);
  route.query.event = "visak-bochea";
  assert.equal(page.event.value.id, "visak-bochea");
  assert.match(page.meta.value.title, /Visak Bochea/);
  route.query.lang = undefined;
  assert.match(page.meta.value.title, /វិសាខបូជា/);
  assert.equal(
    page.path.value,
    "/tools/khmer-calendar/date/2026-05-01?event=visak-bochea",
  );
  route.query.event = ["visak-bochea", "labour-day"];
  assert.throws(
    () => page.detail.value,
    (error: any) => error.statusCode === 404 && error.fatal === true,
  );
});
