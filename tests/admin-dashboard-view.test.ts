import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, compileStyle, parse } from "@vue/compiler-sfc";
import postcss from "postcss";
import { createRenderer, defineComponent, h, nextTick } from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";

const modules = new Map<string, string>();
async function loadComponent(filename: string): Promise<string> {
  if (modules.has(filename)) return modules.get(filename)!;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const compiled = compileScript(descriptor, { id: filename, inlineTemplate: true });
  const autoImports = compiled.bindings.computed ? "" : 'import { computed } from "vue";\n';
  let source = ts.transpileModule('const useLanguage = () => ({ isKhmer: ref(false) });\n' + autoImports + compiled.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const match of [...source.matchAll(/from ["']([^"']+\.vue)["']/g)]) {
    const path = match[1].startsWith("~/")
      ? `app/${match[1].slice(2)}`
      : new URL(match[1], new URL(`../${filename}`, import.meta.url)).pathname;
    source = source.replace(match[0], `from ${JSON.stringify(await loadComponent(path))}`);
  }
  source = source.replace(/import \{ useAppI18n \} from ["']~\/composables\/useAppI18n["'];/g, `import { createI18nStub as useAppI18n } from ${JSON.stringify(new URL("./helpers/i18n-stubs.ts", import.meta.url).href)};`);
  source = source.replace(/from ["'](vue|lucide-vue-next)["']/g, (_match, name) =>
    `from ${JSON.stringify(import.meta.resolve(name))}`);
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  modules.set(filename, url);
  return url;
}

type HostNode = {
  tag: string; text: string; children: HostNode[]; parent: HostNode | null;
  props: Record<string, any>; style: Record<string, string>; focus: () => void;
};
const element = (tag: string): HostNode => ({ tag, text: "", children: [], parent: null, props: {}, style: {}, focus() {} });
const renderer = createRenderer<HostNode, HostNode>({
  createElement: element,
  createText: (text) => ({ ...element("text"), text }),
  createComment: () => element("comment"),
  insert(child, parent, anchor) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child);
  },
  remove(child) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = null;
  },
  setText(node, text) { node.text = text; },
  setElementText(node, text) { node.text = text; node.children = []; },
  patchProp(node, key, _previous, value) { node.props[key] = value; },
  parentNode: (node) => node.parent,
  nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});

const fixture = {
  range: "30d", generatedAt: "2026-11-03T02:00:00Z",
  overview: { totalUsers: 150, activeUsers: 32, toolOpens: 80, completions: 20, newUsers: 9 },
  dailyActivity: [
    { date: "2026-11-01", opens: 30, completions: 8, activeUsers: 12 },
    { date: "2026-11-02", opens: 50, completions: 12, activeUsers: 20 },
  ],
  topTools: [{ toolKey: "expense-tracker", opens: 80, completions: 20, uniqueUsers: 32, lastUsedAt: "2026-11-02T08:00:00Z" }],
  topUsers: [{ id: "user-1", name: "Admin Test User", email: "test@example.invalid", avatarUrl: null, activityCount: 12, lastActiveAt: "2026-11-02T08:00:00Z" }],
  recentActivity: [{ id: "event-1", toolKey: "expense-tracker", event: "COMPLETE", createdAt: "2026-11-02T08:00:00Z", user: { id: "user-1", name: "Admin Test User", email: "test@example.invalid", avatarUrl: null } }],
};

async function mountDashboard(extra: Record<string, any> = {}) {
  const component = (await import(await loadComponent("app/components/admin/ActivityDashboard.vue"))).default;
  const events: Array<{ name: string; value?: string }> = [];
  const root = element("root");
  const app = renderer.createApp(component, {
    analytics: fixture, range: "30d", loading: false, failed: false,
    onRangeChange: (value: string) => events.push({ name: "range", value }),
    onRefresh: () => events.push({ name: "refresh" }), ...extra,
  });
  app.component("NuxtLink", defineComponent({
    props: ["to"], setup: (props, { slots }) => () => h("a", { href: props.to }, slots.default?.()),
  }));
  let khqrMounts = 0;
  app.component("AdminMemberKhqrManager", defineComponent({
    setup() { khqrMounts++; return () => h("div", "Member KHQR panel"); },
  }));
  app.mount(root);
  const walk = (node: HostNode): HostNode[] => [node, ...node.children.flatMap(walk)];
  return {
    app, events, nodes: () => walk(root), khqrMounts: () => khqrMounts,
    text: () => walk(root).map((node) => node.text).join(" "),
    async select(label: string) {
      const button = walk(root).find((node) => node.tag === "button" && node.props["aria-label"] === label);
      assert.ok(button, `missing ${label} button`);
      button.props.onClick();
      await nextTick();
    },
  };
}

test("overview renders real analytics charts without mounting member management", async () => {
  const view = await mountDashboard();
  try {
    assert.ok(view.nodes().some((node) => node.tag === "nav" && node.props["aria-label"] === "Admin menu"));
    assert.match(view.text(), /150/);
    assert.ok(view.nodes().some((node) => node.tag === "svg" && node.props["aria-label"] === "Daily activity chart"));
    assert.ok(view.nodes().some((node) => node.props["aria-label"] === "Event mix: 80 tool opens and 20 completed actions"));
    assert.equal(view.khqrMounts(), 0);
    assert.ok(view.nodes().some((node) => node.tag === "a" && node.props.href === "/admin/bots"));
    assert.ok(view.nodes().some((node) => node.tag === "a" && node.props.href === "/admin/tools"));
    assert.doesNotMatch(JSON.stringify(view.nodes().map((node) => node.props)), /NaN|Infinity/);
  } finally { view.app.unmount(); }
});

test("menu switches details and loads KHQR once while preserving its panel", async () => {
  const view = await mountDashboard();
  try {
    await view.select("Show Users");
    assert.match(view.text(), /Most active users/);
    assert.match(view.text(), /test@example.invalid/);
    assert.equal(view.khqrMounts(), 0);
    await view.select("Show Activity");
    assert.match(view.text(), /Recent activity/);
    await view.select("Show Tools");
    assert.match(view.text(), /Most used tools/);
    await view.select("Show Member KHQR");
    assert.equal(view.khqrMounts(), 1);
    await view.select("Show Overview");
    await view.select("Show Member KHQR");
    assert.equal(view.khqrMounts(), 1, "switching menus must preserve an upload draft");
  } finally { view.app.unmount(); }
});

test("range and refresh controls emit requests without rewriting analytics", async () => {
  const view = await mountDashboard();
  try {
    await view.select("Show 7 days");
    await view.select("Refresh dashboard");
    assert.deepEqual(view.events, [{ name: "range", value: "7d" }, { name: "refresh" }]);
    assert.equal(fixture.overview.toolOpens, 80);
  } finally { view.app.unmount(); }
});

test("a pending new range does not display analytics from the previous range", async () => {
  const view = await mountDashboard({ range: "7d", loading: true });
  try {
    assert.doesNotMatch(view.text(), /Admin Test User|150/);
    assert.match(view.text(), /Loading activity/);
  } finally { view.app.unmount(); }
});

test("zero activity and failed requests have distinct truthful states", async () => {
  const empty = await mountDashboard({ analytics: { ...fixture, overview: { totalUsers: 0, activeUsers: 0, toolOpens: 0, completions: 0, newUsers: 0 }, dailyActivity: [], topTools: [], topUsers: [], recentActivity: [] } });
  try {
    assert.match(empty.text(), /No activity in this period/);
    assert.doesNotMatch(JSON.stringify(empty.nodes().map((node) => node.props)), /NaN|Infinity/);
  } finally { empty.app.unmount(); }
  const failed = await mountDashboard({ analytics: null, failed: true });
  try {
    assert.ok(failed.nodes().some((node) => node.props.role === "alert"));
    assert.doesNotMatch(failed.text(), /No activity in this period/);
  } finally { failed.app.unmount(); }
});

test("compiled dark-mode rules target the dashboard without leaking styles onto the document", () => {
  const filename = "app/components/admin/ActivityDashboard.vue";
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const compiled = compileStyle({ source: descriptor.styles[0].content, filename, id: "data-v-test", scoped: true });
  const rules: string[] = [];
  postcss.parse(compiled.code).walkRules((rule) => {
    if (rule.selector.includes("html.dark")) rules.push(rule.selector);
  });
  assert.equal(rules.length, 2);
  assert.ok(rules.every((selector) => selector.includes(" .dashboard-error") || selector.includes(" .admin-dashboard")), "dark rules must retain their component target after compilation");
});

test("single-day and 90-day charts retain finite geometry", async () => {
  for (const length of [1, 90]) {
    const view = await mountDashboard({ analytics: {
      ...fixture,
      dailyActivity: Array.from({ length }, (_, index) => ({
        date: new Date(Date.UTC(2026, 7, 1 + index)).toISOString().slice(0, 10),
        opens: index + 1, completions: index % 4, activeUsers: index % 7,
      })),
    } });
    try {
      const bars = view.nodes().filter((node) => node.tag === "rect" && node.props.class === "trend-bar");
      assert.equal(bars.length, length);
      assert.ok(bars.every((node) => node.props.width > 0 && node.props.height >= 0));
      assert.doesNotMatch(JSON.stringify(view.nodes().map((node) => node.props)), /NaN|Infinity/);
    } finally { view.app.unmount(); }
  }
});

test("chart coordinates resize to the available panel so mobile labels retain their font size", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class {
      callback: (entries: any[]) => void;
      constructor(callback: (entries: any[]) => void) { this.callback = callback; }
      observe() { this.callback([{ contentRect: { width: 270, height: 190 } }]); }
      unobserve() {}
      disconnect() {}
    },
  });
  const view = await mountDashboard();
  try {
    await nextTick();
    const chart = view.nodes().find((node) => node.props["aria-label"] === "Daily activity chart")!;
    assert.equal(chart.props.viewBox, "0 0 270 190");
    const bars = view.nodes().filter((node) => node.tag === "rect" && node.props.class === "trend-bar");
    assert.ok(bars.every((bar) => bar.props.x >= 0 && bar.props.x + bar.props.width <= 270));
  } finally {
    view.app.unmount();
    if (previous) Object.defineProperty(globalThis, "ResizeObserver", previous);
    else Reflect.deleteProperty(globalThis, "ResizeObserver");
  }
});
