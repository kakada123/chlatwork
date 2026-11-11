import { appI18nStubUrl } from "./helpers/product-locale-stubs.ts";
import { productCopyStubUrl, languageStubUrl } from "./helpers/product-locale-stubs.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";

async function loadComponent(name: string) {
  const filename = `app/components/expense-tracker/${name}.vue`;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const compiled = compileScript(descriptor, {
    id: name,
    inlineTemplate: true,
  });
  const js = ts
    .transpileModule(
      `import { computed, ref, useId, onMounted, nextTick } from "vue";\n${compiled.content}`,
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      },
    )
    .outputText.replace(/from ["']~\/composables\/useAppI18n["']/g, `from ${JSON.stringify(appI18nStubUrl)}`).replace(/from ["']~\/composables\/useProductCopy["']/g, `from ${JSON.stringify(productCopyStubUrl)}`).replace(/from ["']~\/composables\/useLanguage["']/g, `from ${JSON.stringify(languageStubUrl)}`).replace(
      /from ["']vue["']/g,
      `from ${JSON.stringify(import.meta.resolve("vue"))}`,
    )
    .replace(
      /from ["']lucide-vue-next["']/g,
      `from ${JSON.stringify(import.meta.resolve("lucide-vue-next"))}`,
    )
    .replace(
      /from ["']~\/lib\/expense-tracker["']/g,
      `from ${JSON.stringify(new URL("../app/lib/expense-tracker.ts", import.meta.url).href)}`,
    )
    .replace(
      /from ["']~\/lib\/expense-dashboard-view["']/g,
      `from ${JSON.stringify(new URL("../app/lib/expense-dashboard-view.ts", import.meta.url).href)}`,
    );
  return (
    await import(
      `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
    )
  ).default;
}

const History = await loadComponent("ExpenseEntryHistory");
const QuickForm = await loadComponent("QuickExpenseForm");
const WeeklyBreakdown = await loadComponent("ExpenseWeeklyBreakdown");
const savedEntry = {
  id: "00000000-0000-4000-8000-000000000001",
  updatedAt: "2026-10-01T00:00:00.000Z",
  type: "expense",
  date: "2026-10-01",
  category: "Food",
  amount: "5",
  note: "Lunch",
  showNote: true,
};

test("the expense page resolves the saved-entry list and editor as real components", () => {
  const filename = "app/pages/tools/expense-tracker.vue";
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const compiled = compileScript(descriptor, {
    id: "expense-page-entry-components",
    inlineTemplate: true,
  });
  // Nuxt's folder-prefixed names differ from these tags; unresolved tags render no entry UI.
  for (const name of ["ExpenseEntryHistory", "ExpenseEntryEditDialog"]) {
    assert.ok(compiled.bindings[name], `${name} must be imported by the page`);
    assert.doesNotMatch(
      compiled.content,
      new RegExp(`_resolveComponent\\("${name}"\\)`),
    );
  }
});

test("day search results render read-only text with Edit buttons", async () => {
  const app = createSSRApp(History, {
    currency: "USD",
    rows: [
      savedEntry,
      {
        ...savedEntry,
        id: "other-day",
        date: "2026-10-02",
        note: "Hidden note",
      },
    ],
    date: "2026-10-01",
    searchedDate: "2026-10-01",
    loading: false,
    busy: false,
    error: "",
  });
  app.component("ModernDateInput", () => h("span", "Date picker"));
  app.component("MoneyAmount", {
    props: ["value"],
    setup: (props) => () => h("span", String(props.value)),
  });
  const html = await renderToString(app);
  assert.match(html, /Lunch/);
  assert.match(html, /Edit Food entry for 2026-10-01/);
  assert.doesNotMatch(html, /Hidden note|<input|<textarea|<select/);
});

test("day search results render total row with sum of daily entries", async () => {
  const app = createSSRApp(History, {
    currency: "USD",
    rows: [
      {
        id: "1",
        type: "expense",
        date: "2026-11-11",
        category: "Phone",
        note: "Phone top-up",
        amount: "1.50",
      },
      {
        id: "2",
        type: "expense",
        date: "2026-11-11",
        category: "Coffee",
        note: "Brown Discount 50%",
        amount: "1.97",
      },
      {
        id: "3",
        type: "expense",
        date: "2026-11-11",
        category: "Food",
        note: "Lunch time at Happy Lamb",
        amount: "6.77",
      },
      {
        id: "4",
        type: "expense",
        date: "2026-11-11",
        category: "Food",
        note: "B'bor",
        amount: "1.35",
      },
    ],
    date: "2026-11-11",
    searchedDate: "2026-11-11",
    loading: false,
    busy: false,
    error: "",
  });
  app.component("ModernDateInput", () => h("span", "Date picker"));
  app.component("MoneyAmount", {
    props: ["value"],
    setup: (props: any) => () => h("span", { "data-value": props.value }, String(props.value)),
  });
  const html = await renderToString(app);
  assert.match(html, /Total/);
  assert.match(html, /data-value="11.59"/);
});

test("saved entries show a loading state while the selected day is loading", async () => {
  const app = createSSRApp(History, {
    currency: "USD",
    rows: [savedEntry],
    date: "2026-10-01",
    searchedDate: null,
    loading: true,
    busy: false,
    error: "",
  });
  app.component("ModernDateInput", () => h("span", "Date picker"));
  app.component("MoneyAmount", () => h("span"));
  const html = await renderToString(app);
  assert.match(html, /Loading entries…/);
  assert.doesNotMatch(html, /Lunch|Edit Food entry/);
});

test("weekly expense breakdown displays day-by-day rows, totals, and view detail buttons", async () => {
  const app = createSSRApp(WeeklyBreakdown, {
    currency: "USD",
    data: [
      { date: "2026-11-01", spent: 15, income: 0 },
      { date: "2026-11-02", spent: 34, income: 0 },
    ],
    rows: [
      {
        id: "entry-1",
        date: "2026-11-01",
        category: "Food",
        note: "Pho",
        amount: "15",
      },
    ],
    searchedDate: "2026-11-01",
    loadingEntries: false,
    busy: false,
  });
  app.component("MoneyAmount", {
    props: ["value"],
    setup: (props: any) => () => h("span", { "data-value": props.value }, String(props.value)),
  });
  const html = await renderToString(app);
  assert.match(html, /01-11-2026/);
  assert.match(html, /02-11-2026/);
  assert.match(html, /data-value="15"/);
  assert.match(html, /data-value="34"/);
  assert.match(html, /data-value="49"/);
  assert.match(html, /View detail/);
  assert.match(html, /Pho/);
});

function mountForm(initialRow: typeof savedEntry, submit: (row: any) => void) {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "Document");
  class TestDocument {}
  const documentRoot = Object.assign(new TestDocument(), { activeElement: null });
  Object.defineProperty(globalThis, "Document", { configurable: true, value: TestDocument });
  type Element = {
    tag: string;
    children: Element[];
    props: Record<string, any>;
    parent?: Element;
    value?: string;
    options: Element[];
    addEventListener: () => void;
    focus: () => void;
    open?: boolean;
    text: string;
    getRootNode: () => object;
  };
  const element = (tag: string): Element => ({
    tag,
    children: [],
    props: {},
    options: [],
    addEventListener() {},
    focus() {},
    text: "",
    getRootNode: () => documentRoot,
  });
  const root = element("root");
  const renderer = createRenderer<Element, Element>({
    createElement: element,
    createText: () => element("text"),
    createComment: () => element("comment"),
    insert(child, parent) {
      parent.children.push(child);
      child.parent = parent;
    },
    remove(node) {
      if (node.parent) node.parent.children = node.parent.children.filter((child) => child !== node);
    },
    setText(node, text) { node.text = text; },
    setElementText(node, text) { node.text = text; },
    patchProp(node, key, _previous, value) {
      node.props[key] = value;
    },
    parentNode: (node) => node.parent ?? null,
    nextSibling: () => null,
  });
  const app = renderer.createApp(QuickForm, {
    initialRow,
    currency: "USD",
    submitLabel: "Save changes",
    onSubmit: submit,
  });
  app.component("ModernDateInput", {
    props: ["modelValue"],
    setup: (props) => () => h("span", props.modelValue),
  });
  app.mount(root);
  const walk = (node: Element): Element[] => [
    node,
    ...node.children.flatMap(walk),
  ];
  return {
    app: { unmount() {
      app.unmount();
      if (previousDocument) Object.defineProperty(globalThis, "Document", previousDocument);
      else Reflect.deleteProperty(globalThis, "Document");
    } },
    nodes: () => walk(root),
  };
}

test("the reused Quick Expense form preloads the saved entry and emits only on Save", async () => {
  const emitted: any[] = [];
  const row = { ...savedEntry };
  const { app, nodes } = mountForm(row, (value) => emitted.push(value));
  try {
    const amount = nodes().find(
      (node) => node.tag === "input" && node.props.name === "amount",
    )!;
    assert.equal(amount.value, "5");
    amount.props["onUpdate:modelValue"]("9");
    assert.equal(row.amount, "5");
    assert.deepEqual(emitted, []);
    nodes()
      .find((node) => node.tag === "form")!
      .props.onSubmit({ preventDefault() {} });
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].amount, "9");
    assert.equal(emitted[0].id, savedEntry.id);
    assert.equal(emitted[0].updatedAt, savedEntry.updatedAt);
    assert.equal(emitted[0].date, savedEntry.date);
    assert.equal(emitted[0].note, "Lunch");
  } finally {
    app.unmount();
  }
});

test("editing income preserves its type and category", () => {
  const emitted: any[] = [];
  const { app, nodes } = mountForm(
    { ...savedEntry, type: "income", category: "Salary" },
    (row) => emitted.push(row),
  );
  try {
    nodes()
      .find((node) => node.tag === "form")!
      .props.onSubmit({ preventDefault() {} });
    assert.equal(emitted[0].type, "income");
    assert.equal(emitted[0].category, "Salary");
  } finally {
    app.unmount();
  }
});

test("the Quick Expense form submits the entered custom category name", () => {
  const emitted: any[] = [];
  const customEntry = {
    ...savedEntry,
    category: "__custom__",
    customCategory: "  សត្វចិញ្ចឹម  ",
  };
  const { app, nodes } = mountForm(customEntry, (row) => emitted.push(row));
  try {
    nodes()
      .find((node) => node.tag === "form")!
      .props.onSubmit({ preventDefault() {} });
    assert.equal(emitted[0].category, "__custom__");
    assert.equal(emitted[0].customCategory, "សត្វចិញ្ចឹម");
  } finally {
    app.unmount();
  }
});

test("category search filters without changing the saved selection until a result is chosen", async () => {
  const emitted: any[] = [];
  const { app, nodes } = mountForm(savedEntry, (row) => emitted.push(row));
  try {
    const search = nodes().find((node) => node.props["aria-label"] === "Search categories");
    assert.ok(search, "the category picker must provide a search field");
    search.value = "  coFF  ";
    search.props["onUpdate:modelValue"](search.value);
    await nextTick();
    const results = nodes().find((node) => node.props["aria-label"] === "Category results")!;
    const options = results.children.filter((node) => node.tag === "button");
    assert.equal(options.length, 1);
    assert.equal(options[0].props["aria-label"], "Select Coffee");
    nodes().find((node) => node.tag === "form")!.props.onSubmit({ preventDefault() {} });
    assert.equal(emitted[0].category, "Food");
    await options[0].props.onClick();
    nodes().find((node) => node.tag === "form")!.props.onSubmit({ preventDefault() {} });
    assert.equal(emitted[1].category, "Coffee");
  } finally {
    app.unmount();
  }
});

test("an empty category search keeps custom category entry available", async () => {
  const emitted: any[] = [];
  const { app, nodes } = mountForm(savedEntry, (row) => emitted.push(row));
  try {
    const search = nodes().find((node) => node.props["aria-label"] === "Search categories");
    assert.ok(search, "the category picker must provide a search field");
    search.value = "No matching category";
    search.props["onUpdate:modelValue"](search.value);
    await nextTick();
    assert.ok(nodes().some((node) => node.props.role === "status" && node.text === "No categories found."));
    await nodes().find((node) => node.props["aria-label"] === "Choose custom category")!.props.onClick();
    await nextTick();
    const input = nodes().find((node) => node.tag === "input" && node.props.placeholder === "Enter your category")!;
    input.props["onUpdate:modelValue"]("Pet care");
    nodes().find((node) => node.tag === "form")!.props.onSubmit({ preventDefault() {} });
    assert.equal(emitted[0].customCategory, "Pet care");
  } finally {
    app.unmount();
  }
});
