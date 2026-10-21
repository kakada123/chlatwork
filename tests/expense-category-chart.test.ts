import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";

const filename = "app/components/expense-tracker/ExpenseTrackerSummaryCard.vue";
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const compiled = compileScript(descriptor, {
  id: "expense-chart-test",
  inlineTemplate: true,
});
const js = ts
  .transpileModule(
    `import { computed, useId } from "vue";\n${compiled.content}`,
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    },
  )
  .outputText.replace(
    /from ["']vue["']/g,
    `from ${JSON.stringify(import.meta.resolve("vue"))}`,
  );
const { default: SummaryCard } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
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
    insights: [],
    categoryBreakdown: categories,
  });
  app.component("MoneyAmount", {
    props: ["value"],
    setup: (props) => () => h("span", String(props.value)),
  });
  return await renderToString(app);
}

test("category amounts render proportional pie slices and an accessible color legend", async () => {
  const html = await renderChart([
    { category: "Food", total: 75, percent: 75 },
    { category: "Transport", total: 25, percent: 25 },
  ]);
  assert.match(html, /role="img"/);
  assert.match(html, /Food: 75.0%, Transport: 25.0%/);
  assert.equal((html.match(/<path /g) ?? []).length, 2);
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
  assert.equal((html.match(/<path /g) ?? []).length, 0);
});

test("empty categories show an empty state without an invalid pie chart", async () => {
  const html = await renderChart([]);
  assert.match(html, /Add expenses to see spending by category/);
  assert.doesNotMatch(html, /<svg|NaN|Infinity/);
});
