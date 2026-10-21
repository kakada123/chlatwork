import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";

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
) {
  const app = createSSRApp(SummaryCard, {
    currency: "USD",
    rangeLabel: "2026-10-01 – 2026-10-21",
    itemsCount: categories.length,
    totalIncome: 0,
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
  const html = await renderChart([]);
  assert.match(html, /daily spending trend from 2026-10-01 to 2026-10-03/);
  assert.match(html, /<caption>\s*Spending trend values\s*<\/caption>/);
  assert.match(html, /2026-10-01<\/th><td>\$25.00<\/td><td>\$100.00/);
  assert.match(html, /2026-10-02<\/th><td>\$0.00<\/td><td>\$0.00/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
