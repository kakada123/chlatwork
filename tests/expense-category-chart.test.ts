import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, compileStyle, parse } from "@vue/compiler-sfc";
import { createRenderer, createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import postcss from "postcss";

async function compileComponent(
  name: string,
  dependencies: Record<string, string> = {},
) {
  const filename = `app/components/expense-tracker/${name}.vue`;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const compiled = compileScript(descriptor, {
    id: name,
    inlineTemplate: true,
  });
  const js = ts
    .transpileModule(compiled.content, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(/from ["']([^"']+)["']/g, (match, path) => {
      if (
        !dependencies[path] &&
        !path.startsWith("~/lib/") &&
        !["vue", "lucide-vue-next"].includes(path)
      )
        return match;
      const resolved =
        dependencies[path] ??
        (path.startsWith("~/lib/")
          ? new URL(`../app/lib/${path.slice(6)}.ts`, import.meta.url).href
          : import.meta.resolve(path));
      return `from ${JSON.stringify(resolved)}`;
    });
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}
const trendUrl = await compileComponent("ExpenseSpendingTrend");
const { default: SummaryCard } = await import(
  await compileComponent("ExpenseTrackerSummaryCard", {
    "./ExpenseSpendingTrend.vue": trendUrl,
  })
);

async function renderChart(
  categories: { category: string; total: number; percent: number }[],
  incomeVisible = false,
) {
  const app = createSSRApp(SummaryCard, {
    currency: "USD",
    rangeLabel: "2026-10-01 – 2026-10-21",
    itemsCount: categories.length,
    totalIncome: 0,
    incomeVisible,
    totalSpent: 100,
    netBalance: -100,
    dailyAvg: 5,
    budgetValue: 200,
    budgetRemaining: 100,
    budgetPercent: 50,
    budgetStatus: { label: "On track", bg: "", text: "", bar: "" },
    budget: { period: "monthly", amount: "200" },
    rangeFrom: "2026-10-01",
    rangeTo: "2026-10-03",
    trendData: [{ date: "2026-10-01", spent: 25, income: 100 }],
    categoryBreakdown: categories,
  });
  app.component("MoneyAmount", {
    props: ["value"],
    setup: (props) => () => h("span", String(props.value)),
  });
  return (await renderToString(app)).replace(/ data-v-[\w-]+(?:="")?/g, "");
}

test("category amounts render proportional pie slices and an accessible color legend", async () => {
  const html = await renderChart([
    { category: "Food", total: 75, percent: 75 },
    { category: "Transport", total: 25, percent: 25 },
  ]);
  assert.match(html, /role="img"/);
  assert.match(html, /Food: 75.0%, Transport: 25.0%/);
  const chart =
    html.match(
      /<svg[^>]*aria-label="Category breakdown chart"[\s\S]*?<\/svg>/,
    )?.[0] ?? "";
  assert.equal((chart.match(/<path /g) ?? []).length, 2);
  assert.match(html, /A 90 90 0 1 1/);
  assert.match(html, /A 90 90 0 0 1/);
  assert.match(html, /fill="#0284c7"/);
  assert.match(html, /background-color:#0284c7/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("a single category renders a full circle", async () => {
  const html = await renderChart([
    { category: "Food", total: 100, percent: 100 },
  ]);
  assert.match(html, /<circle cx="100" cy="100" r="90"/);
  const chart =
    html.match(
      /<svg[^>]*aria-label="Category breakdown chart"[\s\S]*?<\/svg>/,
    )?.[0] ?? "";
  assert.equal((chart.match(/<path /g) ?? []).length, 0);
});

test("empty categories show an empty state without an invalid pie chart", async () => {
  const html = await renderChart([]);
  assert.match(html, /Add expenses to see spending by category/);
  assert.doesNotMatch(
    html,
    /aria-label="Category breakdown chart"|NaN|Infinity/,
  );
});

test("the dashboard renders real trend values and zero-filled days with accessible labels", async () => {
  const html = await renderChart([], true);
  assert.match(html, /daily spending trend from 2026-10-01 to 2026-10-03/);
  assert.match(html, /<caption>\s*Spending trend values\s*<\/caption>/);
  assert.match(html, /2026-10-01<\/th><td>\$25.00<\/td><td>\$100.00/);
  assert.match(html, /2026-10-02<\/th><td>\$0.00<\/td><td>\$0.00/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("selected trend intervals meet text contrast in both account themes", async () => {
  const html = await renderChart([]);
  const selected =
    html.match(/<button[^>]*aria-pressed="true"[^>]*>/)?.[0] ?? "";
  assert.match(selected, /expense-trend-interval/);
  // The global dark theme remaps bg-white to black, so selected tabs must own their colors.
  assert.doesNotMatch(selected, /\bbg-white\b/);
  const { descriptor } = parse(
    readFileSync(
      "app/components/expense-tracker/ExpenseSpendingTrend.vue",
      "utf8",
    ),
  );
  const compiledStyle = compileStyle({
    source: descriptor.styles.map((style) => style.content).join("\n"),
    filename: "ExpenseSpendingTrend.vue",
    id: "data-v-trend",
    scoped: true,
  });
  assert.deepEqual(compiledStyle.errors, []);
  const rules = postcss.parse(compiledStyle.code);
  const selectedColors: Record<string, string> = {};
  const darkSelectedColors: Record<string, string> = {};
  rules.walkRules((rule) => {
    assert.notEqual(
      rule.selector,
      "html.dark",
      "The dark override must target the trend button, not the page",
    );
    if (
      rule.selector.startsWith('.expense-trend-interval[aria-pressed="true"]')
    ) {
      rule.walkDecls((decl) => {
        selectedColors[decl.prop] = decl.value;
      });
    }
    if (
      rule.selector.includes("html.dark") &&
      rule.selector.includes('.expense-trend-interval[aria-pressed="true"]')
    ) {
      rule.walkDecls((decl) => {
        darkSelectedColors[decl.prop] = decl.value;
      });
    }
  });
  const themeRules = postcss.parse(
    readFileSync("app/assets/css/main.css", "utf8"),
  );
  const themes: Record<string, Record<string, string>> = {
    ":root": {},
    "html.dark": {},
  };
  themeRules.walkRules((rule) => {
    if (themes[rule.selector])
      rule.walkDecls((decl) => {
        themes[rule.selector][decl.prop] = decl.value;
      });
  });
  function luminance(hex: string) {
    assert.match(hex, /^#[0-9a-f]{6}$/i);
    return [1, 3, 5]
      .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
      .map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4,
      )
      .reduce(
        (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!,
        0,
      );
  }
  for (const name of [":root", "html.dark"]) {
    const variables = { ...themes[":root"], ...themes[name] };
    const colors =
      name === "html.dark"
        ? { ...selectedColors, ...darkSelectedColors }
        : selectedColors;
    const resolve = (value: string) =>
      value?.replace(/var\((--[\w-]+)\)/g, (_, key) => variables[key]!);
    const foreground = luminance(resolve(colors.color!));
    const background = luminance(resolve(colors["background-color"]!));
    const ratio =
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05);
    assert.ok(
      ratio >= 4.5,
      `${name} selected tab contrast must be at least 4.5:1, received ${ratio}`,
    );
  }
});

test("mobile category expansion reveals every category and collapses without changing the chart", async () => {
  type Element = {
    tag: string;
    props: Record<string, any>;
    children: Element[];
    parent?: Element;
    options: Element[];
    addEventListener: () => void;
  };
  const element = (tag: string): Element => ({
    tag,
    props: {},
    children: [],
    options: [],
    addEventListener() {},
  });
  const renderer = createRenderer<Element, Element>({
    insertStaticContent(_content, parent) {
      const node = element("static");
      parent.children.push(node);
      node.parent = parent;
      return [node, node];
    },
    createElement: element,
    createText: () => element("text"),
    createComment: () => element("comment"),
    insert(child, parent) {
      parent.children.push(child);
      child.parent = parent;
    },
    remove() {},
    setText() {},
    setElementText() {},
    patchProp(node, key, _previous, value) {
      node.props[key] = value;
    },
    parentNode: (node) => node.parent ?? null,
    nextSibling: () => null,
  });
  const categories = Array.from({ length: 6 }, (_, index) => ({
    category: `Category ${index + 1}`,
    total: 10,
    percent: 100 / 6,
  }));
  const root = element("root");
  const app = renderer.createApp(SummaryCard, {
    currency: "USD",
    rangeLabel: "",
    itemsCount: 6,
    totalIncome: 0,
    totalSpent: 60,
    netBalance: -60,
    dailyAvg: 2,
    budgetValue: 100,
    budgetRemaining: 40,
    budgetPercent: 60,
    budgetStatus: { label: "On track", bg: "", text: "", bar: "" },
    budget: { period: "monthly", amount: "100" },
    categoryBreakdown: categories,
  });
  app.component("MoneyAmount", {
    props: ["value"],
    setup: (props) => () => h("span", String(props.value)),
  });
  const walk = (node: Element): Element[] => [
    node,
    ...node.children.flatMap(walk),
  ];
  try {
    app.mount(root);
    const toggle = walk(root).find(
      (node) =>
        node.tag === "button" &&
        node.props["aria-controls"] ===
          walk(root).find((node) => node.tag === "ul")?.props.id,
    );
    assert.ok(toggle);
    const last = walk(root)
      .filter((node) => node.tag === "li")
      .at(-1)!;
    assert.match(last.props.class, /hidden sm:flex/);
    const paths = walk(root)
      .filter((node) => node.tag === "path")
      .map((node) => node.props.d);
    toggle.props.onClick();
    await nextTick();
    assert.equal(toggle.props["aria-expanded"], true);
    assert.equal(last.props.class.includes("hidden"), false);
    assert.deepEqual(
      walk(root)
        .filter((node) => node.tag === "path")
        .map((node) => node.props.d),
      paths,
    );
    toggle.props.onClick();
    await nextTick();
    assert.equal(toggle.props["aria-expanded"], false);
    assert.match(last.props.class, /hidden sm:flex/);
  } finally {
    app.unmount();
  }
});
