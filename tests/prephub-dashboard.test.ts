import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as vue from "vue";
import { compileScript, parse } from "@vue/compiler-sfc";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as icons from "lucide-vue-next";
import * as prep from "../app/lib/prephub.ts";
import * as popup from "../app/lib/date-picker-position.ts";
import { createI18nStub } from "./helpers/i18n-stubs.ts";
import {
  ControlNode,
  controlNodes,
  controlRenderer,
  installControlDocument,
} from "./helpers/component-host.ts";
function load(
  file: string,
  hub: any = {},
  inline = false,
  navigations: any[] = [],
  mounted = false,
) {
  const { descriptor } = parse(readFileSync(file, "utf8"), { filename: file });
  const code = ts.transpileModule(
    compileScript(descriptor, { id: "prep-dashboard", inlineTemplate: inline })
      .content,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const globals = {
    ...vue,
    onMounted: mounted ? vue.onMounted : () => {},
    onBeforeUnmount() {},
    definePageMeta() {},
    useSeoMeta() {},
    useAppI18n: createI18nStub,
    usePrepHub: () => hub,
    useProductDomain: () => ({ linkTo: (p: string) => p }),
    navigateTo: async (p: any) => navigations.push(p),
  };
  const mod = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name: string) =>
      name === "vue"
        ? vue
        : name === "lucide-vue-next"
          ? icons
          : name === "~/lib/prephub"
            ? prep
            : name === "~/lib/date-picker-position"
              ? popup
              : name.endsWith("PrepSubjectCard.vue")
                ? {
                    __esModule: true,
                    default: load(
                      "app/components/prephub/PrepSubjectCard.vue",
                      hub,
                      true,
                    ),
                  }
                : name.endsWith(".vue")
                  ? {
                      __esModule: true,
                      default: { setup: () => () => vue.h("span") },
                    }
                  : {},
    mod,
    mod.exports,
    ...Object.values(globals),
  );
  return mod.exports.default;
}
function hub(request: any) {
  const h = {
    request,
    owner: vue.ref("owner"),
    timeZone: vue.ref("Asia/Phnom_Penh"),
    error: vue.ref(""),
    feedback: vue.ref(""),
    busy: vue.ref(false),
    fail: (e: any) => (h.error.value = e.message),
    date: (v: any) => v || "No date",
  };
  return h;
}
test("category counts represent server facets rather than only the visible page", async () => {
  const h = hub(async () => ({
    subjects: [],
    total: 2,
    page: 2,
    limit: 20,
    categoryCounts: { RESEARCH: 25, MEETING: 2 },
  }));
  const page = load("app/pages/prephub/index.vue", h).setup(
    {},
    { expose() {} },
  );
  await page.load();
  assert.deepEqual(page.categoryCounts.value, { RESEARCH: 25, MEETING: 2 });
  assert.equal(page.categoryTotal.value, 27);
  assert.equal(page.total.value, 2);
});
test("the subject Add task shortcut opens the existing capture flow for that subject", () => {
  const page = load(
    "app/pages/prephub/index.vue",
    hub(async () => ({})),
  ).setup({}, { expose() {} });
  const subject = { id: "subject", title: "Offline research" };
  page.captureTask(subject);
  assert.equal(page.captureOpen.value, true);
  assert.equal(page.captureType.value, "CHECKLIST");
  assert.equal(page.captureSubject.value.id, "subject");
  page.quickCapture();
  assert.equal(page.captureSubject.value, null);
  assert.equal(page.captureType.value, "NOTES");
});

test("an outdated dashboard response cannot replace the current account summary", async () => {
  const pending: Array<(value: any) => void> = [];
  const page = load(
    "app/pages/prephub/index.vue",
    hub(() => new Promise((resolve) => pending.push(resolve))),
  ).setup({}, { expose() {} });
  const oldRequest = page.summary();
  const currentRequest = page.summary();
  pending[1]({ counts: { READY: 2 }, timeZone: "Asia/Phnom_Penh" });
  await currentRequest;
  pending[0]({ counts: { READY: 99 }, timeZone: "UTC" });
  await oldRequest;
  assert.equal(page.dashboard.value.counts.READY, 2);
});

test("changing a filter from a later page requests the first page only once", async () => {
  const calls: any[] = [];
  const page = load(
    "app/pages/prephub/index.vue",
    hub(async (_: string, options: any) => {
      calls.push(options.query);
      return { subjects: [], total: 0, limit: 20 };
    }),
  ).setup({}, { expose() {} });
  page.page.value = 3;
  await vue.nextTick();
  calls.length = 0;
  page.category.value = "RESEARCH";
  await vue.nextTick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].page, 1);
  assert.equal(calls[0].category, "RESEARCH");
});

test("selecting a clipped category reveals it horizontally without moving a fully visible chip", () => {
  const page = load(
    "app/pages/prephub/index.vue",
    hub(async () => ({ subjects: [], total: 0 })),
  ).setup({}, { expose() {} });
  const scrolls: any[] = [];
  const strip = {
    getBoundingClientRect: () => ({ left: 100, right: 500 }),
    scrollBy: (options: any) => scrolls.push(options),
  };
  let bounds = { left: 440, right: 620 };
  const event = {
    currentTarget: {
      parentElement: strip,
      getBoundingClientRect: () => bounds,
    },
  };
  page.selectCategory("TRAVEL", event);
  assert.equal(page.category.value, "TRAVEL");
  assert.deepEqual(scrolls, [{ left: 128, behavior: "smooth" }]);
  bounds = { left: 60, right: 240 };
  page.selectCategory("", event);
  assert.deepEqual(scrolls[1], { left: -48, behavior: "smooth" });
  bounds = { left: 120, right: 300 };
  page.selectCategory("RESEARCH", event);
  assert.equal(scrolls.length, 2);
});

test("category scrolling respects reduced motion", (context) => {
  const restore = installControlDocument();
  context.after(restore);
  Object.assign(window, { matchMedia: () => ({ matches: true }) });
  const page = load(
    "app/pages/prephub/index.vue",
    hub(async () => ({ subjects: [], total: 0 })),
  ).setup({}, { expose() {} });
  const scrolls: any[] = [];
  page.selectCategory("TRAVEL", {
    currentTarget: {
      getBoundingClientRect: () => ({ left: 280, right: 440 }),
      parentElement: {
        getBoundingClientRect: () => ({ left: 0, right: 320 }),
        scrollBy: (options: any) => scrolls.push(options),
      },
    },
  });
  assert.deepEqual(scrolls, [{ left: 128, behavior: "auto" }]);
});

const subject = {
  id: "research",
  title: "Offline research",
  description: "Prepare technical findings",
  category: "RESEARCH",
  status: "PREPARING",
  priority: "NORMAL",
  updatedAt: "2026-11-16T06:00:00Z",
  progress: { total: 0, completed: 0, percent: 0 },
};

test("dashboard refresh keeps category counts and existing cards mounted until replacement data arrives", async (context) => {
  const restore = installControlDocument();
  context.after(restore);
  const pending: Array<{
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = [];
  const h = hub((path: string) =>
    path === "/dashboard"
      ? Promise.resolve({ counts: {}, timeZone: "Asia/Phnom_Penh" })
      : new Promise((resolve, reject) => pending.push({ resolve, reject })),
  );
  const root = new ControlNode("root");
  const app = controlRenderer.createApp(
    load("app/pages/prephub/index.vue", h, true, [], true),
  );
  app.component("ModernSelect", { setup: () => () => vue.h("select") });
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (props: any, { slots }: any) =>
      () =>
        vue.h("a", { href: props.to }, slots.default?.()),
  });
  app.mount(root);
  context.after(() => app.unmount());
  const countSlots = () =>
    controlNodes(root).filter((node) =>
      String(node.props.class).split(" ").includes("prep-category-count"),
    );
  const slots = countSlots();
  assert.equal(slots.length, prep.PREP_CATEGORIES.length + 1);
  assert.ok(slots.every((node) => node.textContent.includes("—")));
  pending.shift()!.resolve({
    subjects: [subject],
    total: 1,
    limit: 20,
    categoryCounts: { RESEARCH: 1001 },
  });
  await vue.nextTick();
  await vue.nextTick();
  const card = controlNodes(root).find((node) => node.tag === "article")!;
  assert.ok(card.textContent.includes("Offline research"));
  assert.equal(slots[0].props.title, "1001");
  assert.ok(slots[0].textContent.includes("999+"));
  const categoryButton = controlNodes(root).find(
    (node) =>
      node.tag === "button" &&
      String(node.props.class).includes("prep-category-chip") &&
      node.textContent.includes("Research"),
  )!;
  categoryButton.dispatchEvent(new Event("click"));
  await vue.nextTick();
  assert.equal(countSlots()[0], slots[0]);
  assert.equal(slots[0].props.title, "1001");
  assert.equal(
    controlNodes(root).find((node) => node.tag === "article"),
    card,
  );
  assert.ok(
    controlNodes(root).some((node) => node.props["aria-busy"] === true),
  );
  pending.shift()!.resolve({
    subjects: [{ ...subject, title: "Updated research" }],
    total: 1,
    limit: 20,
    categoryCounts: { RESEARCH: 999 },
  });
  await vue.nextTick();
  await vue.nextTick();
  assert.equal(countSlots()[0], slots[0]);
  assert.equal(slots[0].props.title, "999");
  assert.ok(card.textContent.includes("Updated research"));

  // A different status starts another refresh without changing the rendered list.
  const statusButton = controlNodes(root).find(
    (node) =>
      node.tag === "button" &&
      String(node.props.class).includes("prep-dashboard-stat") &&
      node.textContent.includes("Upcoming"),
  )!;
  statusButton.dispatchEvent(new Event("click"));
  await vue.nextTick();
  pending.shift()!.reject(new Error("Temporary failure"));
  await vue.nextTick();
  await vue.nextTick();
  assert.equal(
    controlNodes(root).find((node) => node.tag === "article"),
    card,
  );
  assert.equal(slots[0].props.title, "999");
  assert.ok(root.textContent.includes("Temporary failure"));
  h.owner.value = "another-owner";
  await vue.nextTick();
  assert.ok(!root.textContent.includes("Updated research"));
  assert.ok(countSlots().every((node) => node.textContent.includes("—")));
  pending
    .shift()!
    .resolve({ subjects: [], total: 0, limit: 20, categoryCounts: {} });
  await vue.nextTick();
});
async function renderCard(overrides: any = {}) {
  const app = vue.createSSRApp(
    load("app/components/prephub/PrepSubjectCard.vue", {}, true),
    {
      subject: { ...subject, ...overrides },
      timeZone: "Asia/Phnom_Penh",
    },
  );
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (props: any, { slots }: any) =>
      () =>
        vue.h("a", { href: props.to }, slots.default?.()),
  });
  return renderToString(app);
}
test("subject rows show useful empty states instead of zero-denominator progress", async () => {
  const empty = await renderCard({ taskCount: 0 });
  assert.match(empty, /No preparation tasks yet/);
  assert.doesNotMatch(empty, /<progress/);
  const optional = await renderCard({ taskCount: 2 });
  assert.match(optional, /optional/i);
  assert.doesNotMatch(optional, /<progress/);
  const unavailable = await renderCard();
  assert.match(unavailable, /No tracked preparation tasks yet/);
});
test("subject rows preserve real progress, schedule, timezone and workspace actions", async () => {
  const html = await renderCard({
    eventAt: "2026-11-16T06:01:00Z",
    deadlineAt: "2026-11-20T06:01:00Z",
    taskCount: 7,
    progress: { completed: 3, total: 7, percent: 43 },
  });
  assert.match(html, /<progress[^>]*value="3"[^>]*max="7"/);
  assert.match(html, /Time zone: Asia\/Phnom_Penh/);
  assert.match(html, /datetime="2026-11-16T06:01:00Z"/);
  assert.match(html, /datetime="2026-11-20T06:01:00Z"/);
  assert.match(html, /href="\/prephub\/research\/review"/);
  assert.match(html, /Add task/);
  assert.doesNotMatch(html, /Location:/);
});
