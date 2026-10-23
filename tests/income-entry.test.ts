import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, h, nextTick } from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";

const moduleURL = (source: string) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const vueURL = import.meta.resolve("vue");
const settingsURL = moduleURL(`
  import { ref } from ${JSON.stringify(vueURL)};
  export const QUICK_EXPENSE_OPEN_EVENT = "chlatwork:open-quick-expense";
  export const QUICK_INCOME_OPEN_EVENT = "chlatwork:open-quick-income";
  export function useQuickExpense() {
    return { currency: ref("USD"), enabled: ref(false), refreshSettings: async () => {} };
  }
`);
const authURL = moduleURL(`
  import { ref } from ${JSON.stringify(vueURL)};
  export function useAuth() { return { user: ref({ id: "test-user" }) }; }
`);

function resolveImports(source: string) {
  return source
    .replace(/import\.meta\.client/g, "true")
    .replace(/from ["']vue["']/g, `from ${JSON.stringify(vueURL)}`)
    .replace(
      /from ["']lucide-vue-next["']/g,
      `from ${JSON.stringify(import.meta.resolve("lucide-vue-next"))}`,
    )
    .replace(
      /from ["']~\/composables\/useAuth["']/g,
      `from ${JSON.stringify(authURL)}`,
    )
    .replace(
      /from ["']~\/lib\/([^"']+)["']/g,
      (_match, name) =>
        `from ${JSON.stringify(new URL(`../app/lib/${name}.ts`, import.meta.url).href)}`,
    );
}

async function loadComponent(name: string) {
  const filename = `app/components/expense-tracker/${name}.vue`;
  // The custom host exercises the real form and dialog without DOM animation hooks.
  const sourceFile = readFileSync(filename, "utf8").replace(
    /<Transition\b[^>]*>|<\/Transition>/g,
    "",
  );
  const { descriptor } = parse(sourceFile, { filename });
  const compiled = compileScript(descriptor, { id: name, inlineTemplate: true });
  let source = compiled.content;
  if (name === "QuickExpenseFab") {
    source = source.replace(
      /from ["']~\/composables\/useQuickExpense["']/g,
      `from ${JSON.stringify(settingsURL)}`,
    );
    source = source.replace(
      /from ["']~\/components\/expense-tracker\/QuickExpenseForm.vue["']/g,
      `from ${JSON.stringify(await loadComponent("QuickExpenseForm"))}`,
    );
  }
  return moduleURL(resolveImports(ts.transpileModule(
    `import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick, useId } from "vue";\n${source}`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
  ).outputText));
}

const Fab = (await import(await loadComponent("QuickExpenseFab"))).default;
const controls = await import(moduleURL(resolveImports(ts.transpileModule(
  readFileSync("app/composables/useQuickExpense.ts", "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText)));

function mountEntry(fetcher: (path: string, options: any) => Promise<unknown>) {
  const globals = [
    "window", "document", "Document", "requestAnimationFrame", "$fetch",
  ] as const;
  const previous = globals.map((name) =>
    Object.getOwnPropertyDescriptor(globalThis, name),
  );
  const events = new EventTarget();
  Object.defineProperty(globalThis, "window", { configurable: true, value: Object.assign(events, {
    innerHeight: 800, scrollY: 0, scrollTo() {},
  }) });
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    body: { style: {} }, activeElement: null,
  } });
  Object.defineProperty(globalThis, "Document", { configurable: true, value: class {} });
  Object.setPrototypeOf(document, Document.prototype);
  Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: (fn: () => void) => fn() });
  Object.defineProperty(globalThis, "$fetch", { configurable: true, value: fetcher });
  type Element = {
    tag: string;
    children: Element[];
    props: Record<string, any>;
    parent?: Element;
    value?: string;
    text: string;
    options: Element[];
    focus: () => void;
    scrollTo: () => void;
    addEventListener: () => void;
    getRootNode: () => Document;
  };
  const element = (tag: string): Element => ({
    tag, children: [], props: {}, text: "", options: [],
    focus() {}, scrollTo() {}, addEventListener() {},
    getRootNode: () => document,
  });
  const root = element("root");
  const body = element("body");
  const renderer = createRenderer<Element, Element>({
    createElement: element,
    createText: () => element("text"),
    createComment: () => element("comment"),
    insert(child, parent, anchor) {
      const index = anchor ? parent.children.indexOf(anchor) : -1;
      if (index < 0) parent.children.push(child);
      else parent.children.splice(index, 0, child);
      child.parent = parent;
    },
    remove(child) {
      if (child?.parent)
        child.parent.children = child.parent.children.filter((node) => node !== child);
    },
    setText(node, text) { node.text = text; },
    setElementText(node, text) { node.text = text; },
    patchProp(node, key, _previous, value) { node.props[key] = value; },
    parentNode: (node) => node.parent ?? null,
    nextSibling: (node) =>
      node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
    querySelector: () => body,
  });
  const app = renderer.createApp(Fab);
  app.component("ModernDateInput", {
    props: ["modelValue"],
    setup: (props) => () => h("span", props.modelValue),
  });
  app.mount(root);
  const walk = (node: Element): Element[] => [node, ...node.children.flatMap(walk)];
  return {
    nodes: () => [...walk(root), ...walk(body)],
    events,
    async flush() {
      await nextTick();
      await nextTick();
      await nextTick();
    },
    unmount() {
      app.unmount();
      globals.forEach((name, index) => {
        if (previous[index])
          Object.defineProperty(globalThis, name, previous[index]!);
        else delete (globalThis as any)[name];
      });
    },
  };
}

test("income opens while the floating shortcut is off and saves as income", async () => {
  const writes: any[] = [];
  const saved: any[] = [];
  const view = mountEntry(async (path, options) => {
    writes.push({ path, ...options });
    return { rows: [{ ...options.body.upserts[0], updatedAt: "2026-10-23T00:00:00.000Z" }] };
  });
  try {
    assert.equal(
      typeof controls.openQuickIncome, "function", "income needs an entry control",
    );
    view.events.addEventListener("chlatwork:quick-expense-saved", (event) =>
      saved.push((event as CustomEvent).detail),
    );
    controls.openQuickIncome();
    await view.flush();
    assert.ok(view.nodes().some((node) => node.tag === "h2" && node.text === "Add income"));
    assert.ok(view.nodes().some((node) => node.tag === "option" && node.props.value === "Salary"));
    const amount = view.nodes().find((node) => node.tag === "input" && node.props.name === "amount")!;
    amount.props["onUpdate:modelValue"]("750");
    view.nodes().find((node) => node.tag === "form")!.props.onSubmit({ preventDefault() {} });
    await view.flush();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, "/api/expenses/entries");
    assert.equal(writes[0].method, "PATCH");
    assert.equal(writes[0].body.upserts[0].type, "income");
    assert.equal(writes[0].body.upserts[0].category, "Salary");
    assert.equal(writes[0].body.upserts[0].amount, "750");
    assert.deepEqual(writes[0].body.deleted, []);
    assert.equal(saved[0].type, "income");
    assert.ok(view.nodes().some((node) => node.text === "Income saved"));
  } finally {
    view.unmount();
  }
});

test("income failures keep the form and reuse the entry ID on retry", async () => {
  const writes: any[] = [];
  const view = mountEntry(async (_path, options) => {
    writes.push(options.body);
    if (writes.length === 1) throw new Error("Network unavailable");
    return { rows: [{ ...options.body.upserts[0], updatedAt: "2026-10-23T00:00:00.000Z" }] };
  });
  try {
    assert.equal(typeof controls.openQuickIncome, "function");
    controls.openQuickIncome();
    await view.flush();
    view.nodes().find((node) => node.tag === "input" && node.props.name === "amount")!.props["onUpdate:modelValue"]("50");
    const submit = () => view.nodes().find((node) => node.tag === "form")!.props.onSubmit({ preventDefault() {} });
    submit();
    await view.flush();
    assert.ok(view.nodes().some((node) => node.props.role === "alert" && /income/.test(node.text)));
    assert.equal(view.nodes().find((node) => node.tag === "input" && node.props.name === "amount")!.value, "50");
    submit();
    await view.flush();
    assert.equal(writes.length, 2);
    assert.equal(writes[0].upserts[0].id, writes[1].upserts[0].id);
  } finally {
    view.unmount();
  }
});

test("the expense shortcut retains its expense endpoint and categories", async () => {
  const writes: any[] = [];
  const view = mountEntry(async (path, options) => {
    writes.push({ path, ...options });
    return { row: { ...options.body, id: "saved-expense", type: "expense" } };
  });
  try {
    controls.openQuickExpense();
    await view.flush();
    view.nodes().find((node) => node.tag === "input" && node.props.name === "amount")!.props["onUpdate:modelValue"]("5");
    view.nodes().find((node) => node.tag === "form")!.props.onSubmit({ preventDefault() {} });
    await view.flush();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, "/api/expenses/quick-entry");
    assert.equal(writes[0].method, "POST");
    assert.equal(writes[0].body.category, "Food");
  } finally {
    view.unmount();
  }
});
