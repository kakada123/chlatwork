import englishProducts from "../app/locales/en/products.ts";
import khmerProducts from "../app/locales/km/products.ts";
import { createI18nStub } from "./helpers/i18n-stubs.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { computed, ref } from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { CREATOR_CATEGORIES, CREATOR_TOOLS } from "../app/data/creator-tools.ts";
import { FOOD_FILTERS } from "../api/src/food/food-filters.ts";
import { buildExpenseBreakdown, collectExpenseItems, expenseCategories, incomeCategories } from "../app/lib/expense-tracker.ts";

function copyHarness() {
  const isKhmer = ref(false);
  const source = readFileSync(new URL("../app/composables/useProductCopy.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} as { useProductCopy?: (locale?: { readonly value: boolean }) => { productText: (text: string) => string; productCategoryText: (label: string, categoryKey?: string) => string } } };
  new Function("require", "module", "exports", code)(
    () => ({ useAppI18n: (override?: { readonly value: boolean }) => createI18nStub(override ?? isKhmer) }), module, module.exports,
  );
  return { isKhmer, useProductCopy: module.exports.useProductCopy! };
}

test("product UI copy follows live locale changes and preserves unknown text", () => {
  const { isKhmer, useProductCopy } = copyHarness();
  const { productText } = useProductCopy();
  const label = computed(() => productText("Natural"));
  assert.equal(label.value, "Natural");
  isKhmer.value = true;
  assert.equal(label.value, "ធម្មជាតិ");
  for (const text of ["My custom category", "https://example.com", "__proto__", "constructor", ""]) {
    assert.equal(productText(text), text);
  }
  isKhmer.value = false;
  assert.equal(label.value, "Natural");
});

test("Moments product copy can follow its receiver locale independently", () => {
  const { isKhmer, useProductCopy } = copyHarness();
  const receiverKhmer = ref(true);
  const { productText } = useProductCopy(receiverKhmer);
  assert.equal(isKhmer.value, false);
  assert.equal(productText("Short phrases"), "ឃ្លាខ្លីៗ");
  receiverKhmer.value = false;
  assert.equal(productText("Short phrases"), "Short phrases");
});

test("every Creator workflow and food filter label has Khmer interface copy", () => {
  const { isKhmer, useProductCopy } = copyHarness();
  isKhmer.value = true;
  const { productText } = useProductCopy();
  const labels = [
    ...CREATOR_CATEGORIES.flatMap((category) => [category.title, category.description]),
    ...CREATOR_TOOLS.flatMap((tool) => [tool.title, tool.shortTitle, tool.description, tool.inputLabel, tool.submitLabel]),
    ...FOOD_FILTERS.flatMap((field) => field.groups.flatMap((group) => [group.label, ...group.options.map((option) => option.label)])),
    ...expenseCategories,
    ...incomeCategories,
  ];
  isKhmer.value = false;
  for (const label of labels) assert.equal(productText(label), label);
  for (const field of FOOD_FILTERS) assert.match(field.labelKm, /[\u1780-\u17ff]/);
  isKhmer.value = true;
  for (const label of labels) {
    if (/[\u1780-\u17ff]/.test(label) || label === "KHQR" || label === "Facebook → TikTok") continue;
    assert.match(productText(label), /[\u1780-\u17ff]/, `Missing Khmer copy: ${label}`);
  }
});


test("expense category translations require preset provenance and preserve custom collisions", () => {
  const { isKhmer, useProductCopy } = copyHarness();
  isKhmer.value = true;
  const { productCategoryText } = useProductCopy();
  for (const name of ["Food", "Rent"]) {
    const preset = { type: "expense" as const, date: "2026-11-01", category: name, note: "", amount: "1" };
    const custom = { ...preset, category: "__custom__", customCategory: name, amount: "2" };
    const summarize = (rows: typeof preset[]) => buildExpenseBreakdown(collectExpenseItems(rows, "all").items, rows.reduce((sum, row) => sum + Number(row.amount), 0));
    const canonical = summarize([preset])[0]!;
    assert.equal(canonical.categoryKey, name);
    assert.notEqual(productCategoryText(canonical.category, canonical.categoryKey), name);
    const authored = summarize([custom])[0]!;
    assert.equal(authored.categoryKey, undefined);
    assert.equal(productCategoryText(authored.category, authored.categoryKey), name);
    for (const rows of [[preset, custom], [custom, preset]]) {
      const mixed = summarize(rows)[0]!;
      assert.equal(mixed.category, name);
      assert.equal(mixed.total, 3);
      assert.equal(mixed.percent, 100);
      assert.equal(mixed.categoryKey, undefined);
      assert.equal(productCategoryText(mixed.category, mixed.categoryKey), name);
    }
    assert.equal(productCategoryText(name), name); // Older API responses carry no provenance.
  }
});


test("product catalogs have matching semantic keys in both languages", () => {
  assert.deepEqual(Object.keys(englishProducts).sort(), Object.keys(khmerProducts).sort());
  for (const [key, value] of Object.entries(englishProducts)) {
    assert.ok(key.startsWith("products."), key);
    assert.equal(typeof value, "string");
    assert.equal(typeof khmerProducts[key as keyof typeof khmerProducts], "string");
  }
});
