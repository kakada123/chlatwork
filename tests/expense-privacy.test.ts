import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, createSSRApp, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";

async function componentUrl(
  name: string,
  dependencies: Record<string, string> = {},
) {
  const filename = `app/components/expense-tracker/${name}.vue`;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const compiled = compileScript(descriptor, {
    id: name,
    inlineTemplate: true,
  });
  const source =
    name === "ExpenseEntryHistory"
      ? `import { computed } from "vue";\n${compiled.content}`
      : compiled.content;
  const js = ts
    .transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(/from ["']([^"']+)["']/g, (match, path) => {
      if (dependencies[path])
        return `from ${JSON.stringify(dependencies[path])}`;
      if (path.startsWith("~/lib/"))
        return `from ${JSON.stringify(new URL(`../app/lib/${path.slice(6)}.ts`, import.meta.url).href)}`;
      if (["vue", "lucide-vue-next"].includes(path))
        return `from ${JSON.stringify(import.meta.resolve(path))}`;
      return match;
    });
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}
const trendUrl = await componentUrl("ExpenseSpendingTrend");
const Summary = (
  await import(
    await componentUrl("ExpenseTrackerSummaryCard", {
      "./ExpenseSpendingTrend.vue": trendUrl,
    })
  )
).default;
const History = (await import(await componentUrl("ExpenseEntryHistory")))
  .default;
const props = {
  currency: "USD",
  rangeLabel: "October",
  rangeFrom: "2026-10-01",
  rangeTo: "2026-10-03",
  itemsCount: 2,
  totalIncome: 9876.54,
  totalSpent: 111.11,
  netBalance: 9765.43,
  dailyAvg: 37.04,
  budgetValue: 500,
  budgetRemaining: 388.89,
  budgetPercent: 22,
  budgetStatus: { label: "On track", bg: "", text: "", bar: "" },
  budget: { period: "monthly", amount: "500" },
  categoryBreakdown: [],
  trendData: [{ date: "2026-10-01", spent: 111.11, income: 9876.54 }],
};
const rows = [
  {
    id: "salary",
    type: "income",
    date: "2026-10-01",
    category: "Salary",
    note: "Monthly salary",
    amount: "9876.54",
  },
  {
    id: "lunch",
    type: "expense",
    date: "2026-10-01",
    category: "Food",
    note: "Lunch",
    amount: "111.11",
  },
];
const historyProps = {
  currency: "USD",
  date: "2026-10-01",
  searchedDate: "2026-10-01",
  rows,
  loading: false,
  busy: false,
  error: "",
};
const Money = {
  props: ["value"],
  setup: (value: any) => () =>
    h(
      "span",
      {
        "data-money": value.value,
        title: String(value.value),
        "aria-label": String(value.value),
      },
      String(value.value),
    ),
};
function register(app: any) {
  app.component("MoneyAmount", Money);
  app.component("ModernDateInput", () => h("span", "Date picker"));
}

test("income and net are masked in initial HTML, chart tooltips, and accessible trend values", async () => {
  const app = createSSRApp(Summary, props);
  register(app);
  const html = await renderToString(app);
  assert.match(html, /Show income/);
  assert.match(html, /Show net balance/);
  assert.doesNotMatch(html, /9,?876\.54|9,?765\.43/);
  assert.doesNotMatch(html, /stroke="var\(--app-color-success-bar\)"/);
  assert.doesNotMatch(html, /<th[^>]*>Income<\/th>/);
  assert.match(
    html,
    /\$120.00/,
    "hidden income must not inflate the expense chart scale",
  );
  assert.match(html, /data-money="111.11"/);
});

test("a masked negative net balance does not expose its sign through status colors", async () => {
  const app = createSSRApp(Summary, { ...props, netBalance: -9765.43 });
  register(app);
  const html = await renderToString(app);
  const card = html.match(
    /<section[^>]*aria-label="Net balance"[\s\S]*?<\/section>/,
  )?.[0];
  assert.ok(card);
  assert.match(card, /Net balance hidden/);
  assert.doesNotMatch(card, /9765|red-/);
});

test("saved income amounts are masked while expense rows and their Edit buttons remain readable", async () => {
  const app = createSSRApp(History, historyProps);
  register(app);
  const html = await renderToString(app);
  assert.doesNotMatch(html, /9,?876\.54/);
  assert.match(html, /Show income amounts/);
  assert.match(html, /Monthly salary|Edit Salary entry/);
  assert.match(html, /data-money="111.11"/);
});

type Element = {
  tag: string;
  text: string;
  props: Record<string, any>;
  children: Element[];
  parent?: Element;
  options: Element[];
  addEventListener: () => void;
};
function mount() {
  const element = (tag: string, text = ""): Element => ({
    tag,
    text,
    props: {},
    children: [],
    options: [],
    addEventListener() {},
  });
  const remove = (node: Element) => {
    if (node.parent) {
      const index = node.parent.children.indexOf(node);
      if (index >= 0) node.parent.children.splice(index, 1);
    }
  };
  const renderer = createRenderer<Element, Element>({
    insertStaticContent(text, parent) {
      const node = element("static", text);
      node.parent = parent;
      parent.children.push(node);
      return [node, node];
    },
    createElement: element,
    createText: (text) => element("text", text),
    createComment: () => element("comment"),
    insert(node, parent, anchor) {
      remove(node);
      node.parent = parent;
      const index = anchor ? parent.children.indexOf(anchor) : -1;
      if (index < 0) parent.children.push(node);
      else parent.children.splice(index, 0, node);
    },
    remove,
    setText(node, text) {
      node.text = text;
    },
    setElementText(node, text) {
      node.text = text;
      node.children = [];
    },
    patchProp(node, key, _previous, value) {
      node.props[key] = value;
    },
    parentNode: (node) => node.parent ?? null,
    nextSibling: (node) =>
      node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
  });
  const incomeVisible = ref(false);
  const netBalanceVisible = ref(false);
  const root = element("root");
  const app = renderer.createApp({
    setup: () => () =>
      h(
        Summary,
        {
          ...props,
          incomeVisible: incomeVisible.value,
          netBalanceVisible: netBalanceVisible.value,
          "onUpdate:incomeVisible": (value: boolean) => {
            incomeVisible.value = value;
          },
          "onUpdate:netBalanceVisible": (value: boolean) => {
            netBalanceVisible.value = value;
          },
        },
        {
          entries: () =>
            h(History, {
              ...historyProps,
              incomeVisible: incomeVisible.value,
              onToggleIncome: () => {
                incomeVisible.value = !incomeVisible.value;
              },
            }),
        },
      ),
  });
  register(app);
  app.mount(root);
  const walk = (node: Element): Element[] => [
    node,
    ...node.children.flatMap(walk),
  ];
  return { app, nodes: () => walk(root), incomeVisible, netBalanceVisible };
}

test("each eye reveals only its chosen metric and income visibility stays consistent across the dashboard", async () => {
  const { app, nodes, incomeVisible, netBalanceVisible } = mount();
  const button = (label: string) => {
    const node = nodes().find(
      (node) => node.tag === "button" && node.props["aria-label"] === label,
    );
    assert.ok(node, `${label} control must exist`);
    return node;
  };
  const amounts = () =>
    nodes()
      .filter((node) => node.props["data-money"] !== undefined)
      .map((node) => node.props["data-money"]);
  try {
    assert.ok(!amounts().includes(9876.54));
    assert.ok(!amounts().includes(9765.43));
    button("Show income").props.onClick();
    await nextTick();
    assert.equal(incomeVisible.value, true);
    assert.equal(netBalanceVisible.value, false);
    assert.ok(amounts().includes(9876.54));
    assert.ok(!amounts().includes(9765.43));
    assert.ok(
      nodes().some(
        (node) => node.props.stroke === "var(--app-color-success-bar)",
      ),
    );
    button("Show net balance").props.onClick();
    await nextTick();
    assert.ok(amounts().includes(9765.43));
    button("Hide income amounts").props.onClick();
    await nextTick();
    assert.equal(incomeVisible.value, false);
    assert.ok(!amounts().includes(9876.54));
    assert.ok(amounts().includes(9765.43));
    assert.ok(
      !nodes().some(
        (node) => node.props.stroke === "var(--app-color-success-bar)",
      ),
    );
    button("Hide net balance").props.onClick();
    await nextTick();
    assert.ok(!amounts().includes(9765.43));
    assert.ok(amounts().includes(111.11));
  } finally {
    app.unmount();
  }
});
