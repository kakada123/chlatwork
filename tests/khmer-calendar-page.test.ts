import { createI18nStub } from "./helpers/i18n-stubs.ts";
import { translateMessage } from "../app/lib/i18n.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { renderToString } from "vue/server-renderer";
import * as icons from "lucide-vue-next";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as calendar from "../app/lib/khmer-calendar.ts";
import * as holidays from "../app/data/cambodia-holidays.ts";
import * as celebrations from "../app/data/calendar-celebrations.ts";
import { ModernSelect } from "./helpers/load-modern-select.ts";
import * as sharing from "../app/lib/calendar-sharing.ts";
import { loadCalendarComponent } from "./helpers/load-calendar-component.ts";

function loadPage(
  inlineTemplate = false,
  date = { year: 2026, month: 11, day: 4 },
  sourcePath = "../app/pages/tools/khmer-calendar/index.vue",
) {
  const filename = new URL(sourcePath, import.meta.url).pathname;
  const { descriptor, errors } = parse(readFileSync(filename, "utf8"), {
    filename,
  });
  assert.deepEqual(errors, []);
  const script = compileScript(descriptor, {
    id: "khmer-calendar-test",
    inlineTemplate,
  });
  const code = ts.transpileModule(script.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dependencies: Record<string, unknown> = {
    vue,
    "~/composables/useAppI18n": { useAppI18n: createI18nStub },
    "~/lib/i18n": { translateMessage },
    "lucide-vue-next": icons,
    "~/lib/khmer-calendar": calendar,
    "~/lib/calendar-sharing": sharing,
    "~/data/cambodia-holidays": holidays,
    "~/data/calendar-celebrations": celebrations,
  };
  const globals = {
    ...vue,
    definePageMeta() {},
    useSeoMeta() {},
    useHead() {},
    useState: () => vue.ref({ ...date }),
    useRoute: () => ({ query: {} }),
    useProductDomain: () => ({
      config: { mainOrigin: "https://chlatwork.com" },
      destination: (path: string) => new URL(path, "https://chlatwork.com").href,
    }),
    navigateTo() {},
    onMounted() {},
    onBeforeUnmount() {},
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name: string) => {
      if (name === "~/components/khmer-calendar/CelebrationBrowser.vue")
        return {
          __esModule: true,
          default: loadPage(
            inlineTemplate,
            date,
            "../app/components/khmer-calendar/CelebrationBrowser.vue",
          ),
        };
      if (name === "~/components/khmer-calendar/CalendarShareButton.vue")
        return {
          __esModule: true,
          default: loadCalendarComponent(
            "app/components/khmer-calendar/CalendarShareButton.vue",
          ),
        };
      if (!(name in dependencies))
        throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  return module.exports.default;
}

test("changing month clamps the selected day without skipping February", () => {
  const page = loadPage().setup({}, { expose() {} });
  page.selectDate({ year: 2026, month: 1, day: 31 });
  page.changeMonth(1);
  assert.deepEqual(page.selected.value, { year: 2026, month: 2, day: 28 });
  page.changeMonth(-1);
  assert.deepEqual(page.selected.value, { year: 2026, month: 1, day: 28 });
  page.selectDate({ year: 1900, month: 1, day: 1 });
  page.changeMonth(-1);
  assert.deepEqual(page.selected.value, { year: 1900, month: 1, day: 1 });
});

test("fullscreen rejection is handled with usable feedback", async () => {
  const page = loadPage().setup({}, { expose() {} });
  page.calendarRoot.value = {
    requestFullscreen: async () => {
      throw new Error("Denied");
    },
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { fullscreenElement: null },
  });
  try {
    await page.toggleFullscreen();
    assert.ok(page.fullscreenError.value.length > 0);
    assert.equal(page.fullscreen.value, false);
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});

test("calendar renders real Khmer controls, lunar details and source links", async () => {
  const app = vue.createSSRApp(loadPage(true));
  app.component("NuxtLink", { template: "<a><slot /></a>" });
  app.component("ModernSelect", ModernSelect);
  const html = await renderToString(app);
  assert.match(html, /ប្រតិទិនខ្មែរ/);
  assert.match(html, /ថ្ងៃនេះ/);
  assert.match(html, /ព\.ស\./);
  assert.match(html, /lang="km"/);
  assert.match(html, /Asia\/Phnom_Penh/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /<caption/);
  assert.match(
    html,
    /https:\/\/lrc.gov.kh\/en\/annual-holiday-calendar-2026\//,
  );
});

test("keyboard navigation crosses month boundaries and focuses the selected date", async () => {
  const page = loadPage().setup({}, { expose() {} });
  let focused = "";
  page.calendarRoot.value = {
    querySelector: (selector: string) => ({
      focus: () => {
        focused = selector;
      },
    }),
  };
  page.selectDate({ year: 2026, month: 5, day: 1 });
  let prevented = false;
  await page.handleDayKey(
    {
      key: "ArrowLeft",
      preventDefault() {
        prevented = true;
      },
    },
    calendar.getDayDetails(page.selected.value),
  );
  assert.equal(prevented, true);
  assert.deepEqual(page.selected.value, { year: 2026, month: 4, day: 30 });
  assert.equal(focused, '[data-date="2026-04-30"]');
});

test("hiding observances preserves the official holiday on an overlapping date", () => {
  const page = loadPage().setup({}, { expose() {} });
  page.selectDate({ year: 2027, month: 5, day: 20 });
  assert.equal(page.selectedEvents.value.length, 2);
  page.showObservances.value = false;
  assert.deepEqual(
    page.selectedEvents.value.map((event: holidays.CalendarEvent) => event.id),
    ["visak-bochea"],
  );
});

test("unverified years visibly explain missing official holiday coverage", async () => {
  const app = vue.createSSRApp(
    loadPage(true, { year: 2028, month: 1, day: 1 }),
  );
  app.component("NuxtLink", { template: "<a><slot /></a>" });
  app.component("ModernSelect", ModernSelect);
  const html = await renderToString(app);
  assert.match(html, /coverage-notice/);
  assert.match(html, /២០២៦ និង ២០២៧/);
});

test("annual celebration browser filters bilingual searches and emits the chosen date", () => {
  const component = loadPage(
    false,
    undefined,
    "../app/components/khmer-calendar/CelebrationBrowser.vue",
  );
  const emitted: unknown[] = [];
  const browser = component.setup(
    { year: 2026, khmer: true },
    { expose() {}, emit: (...args: unknown[]) => emitted.push(args) },
  );
  browser.search.value = "Christmas";
  assert.deepEqual(
    browser.filteredEvents.value.map(
      (event: holidays.CalendarEvent) => event.id,
    ),
    ["christmas-eve", "christmas"],
  );
  browser.search.value = "ណូអែល";
  assert.deepEqual(
    browser.filteredEvents.value.map(
      (event: holidays.CalendarEvent) => event.id,
    ),
    ["christmas-eve", "christmas", "boxing-day"],
  );
  browser.search.value = "";
  browser.category.value = "muslim";
  assert.ok(browser.filteredEvents.value.length >= 5);
  assert.ok(
    browser.filteredEvents.value.every(
      (event: holidays.CalendarEvent) => event.estimated,
    ),
  );
  browser.openDate("2026-12-25");
  assert.deepEqual(emitted, [["select", { year: 2026, month: 12, day: 25 }]]);
});

test("returning from a detail page restores its month, selected date, and language", () => {
  const component = loadCalendarComponent(
    "app/pages/tools/khmer-calendar/index.vue",
    {
      inlineTemplate: false,
      route: { query: { date: "2027-04-16", lang: "en" } },
    },
  );
  const page = component.setup({}, { expose() {} });
  assert.deepEqual(page.selected.value, { year: 2027, month: 4, day: 16 });
  assert.equal(page.khmer.value, false);
});

test("mobile date activation opens a public detail page while desktop stays inline", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  let mobile = true;
  const navigations: string[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { matchMedia: () => ({ matches: mobile }) },
  });
  try {
    const component = loadCalendarComponent(
      "app/pages/tools/khmer-calendar/index.vue",
      {
        inlineTemplate: false,
        route: { query: { lang: "en" } },
        navigateTo: (path) => {
          navigations.push(path);
        },
      },
    );
    const page = component.setup({}, { expose() {} });
    await page.activateDate({ year: 2026, month: 11, day: 9 });
    assert.deepEqual(navigations, [
      "/tools/khmer-calendar/date/2026-11-09?lang=en",
    ]);
    mobile = false;
    await page.activateDate({ year: 2026, month: 12, day: 25 });
    assert.equal(navigations.length, 1);
    assert.deepEqual(page.selected.value, { year: 2026, month: 12, day: 25 });
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
