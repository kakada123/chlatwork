import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, createSSRApp, h } from "vue";
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
    .outputText.replace(
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
    );
  return (
    await import(
      `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
    )
  ).default;
}

const History = await loadComponent("ExpenseEntryHistory");
const QuickForm = await loadComponent("QuickExpenseForm");
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

test("entry history stays empty until a day search is submitted", async () => {
  const app = createSSRApp(History, {
    currency: "USD",
    rows: [savedEntry],
    date: "2026-10-01",
    searchedDate: null,
    loading: false,
    busy: false,
    error: "",
  });
  app.component("ModernDateInput", () => h("span", "Date picker"));
  app.component("MoneyAmount", () => h("span"));
  const html = await renderToString(app);
  assert.match(html, /Search a day to see its entries/);
  assert.doesNotMatch(html, /Lunch|Edit Food entry/);
});

function mountForm(initialRow: typeof savedEntry, submit: (row: any) => void) {
  type Element = {
    tag: string;
    children: Element[];
    props: Record<string, any>;
    parent?: Element;
    value?: string;
    options: Element[];
    addEventListener: () => void;
  };
  const element = (tag: string): Element => ({
    tag,
    children: [],
    props: {},
    options: [],
    addEventListener() {},
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
    remove() {},
    setText() {},
    setElementText() {},
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
  return { app, nodes: () => walk(root) };
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
