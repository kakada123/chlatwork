import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { compileTemplate, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";

type HostNode = { children: HostNode[]; parent: HostNode | null };
const node = (): HostNode => ({ children: [], parent: null });
const renderer = vue.createRenderer<HostNode, HostNode>({
  createElement: node,
  createText: node,
  createComment: node,
  insert(child, parent, anchor = null) {
    if (child.parent)
      child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(
      index < 0 ? parent.children.length : index,
      0,
      child,
    );
  },
  remove(child) {
    child.parent?.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = null;
  },
  parentNode: (child) => child.parent,
  nextSibling: (child) =>
    child.parent?.children[child.parent.children.indexOf(child) + 1] ?? null,
  setText() {},
  setElementText() {},
  patchProp() {},
});

function pageTemplate(path: string, context: Record<string, unknown>) {
  const { descriptor } = parse(readFileSync(path, "utf8"), { filename: path });
  const compiled = compileTemplate({
    source: descriptor.template!.content,
    filename: path,
    id: path,
  });
  assert.deepEqual(compiled.errors, []);
  const module = { exports: {} as { render: (...args: any[]) => vue.VNode } };
  const code = ts.transpileModule(compiled.code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    () => vue,
    module,
    module.exports,
  );
  return vue.defineComponent({
    render: () => module.exports.render(context, []),
  });
}

const cases = [
  {
    path: "app/pages/admin/index.vue",
    context: {
      ranges: [],
      overviewCards: [],
      data: null,
      error: null,
      isLoading: false,
    },
  },
  {
    path: "app/pages/bot/groups/index.vue",
    context: {
      state: "ready",
      groups: [],
      error: "",
      loading: false,
      page: 1,
      hasMore: false,
    },
  },
  {
    path: "app/pages/bot/groups/[id].vue",
    context: {
      state: "ready",
      groups: [],
      group: null,
      error: "",
      loading: false,
    },
  },
];

for (const { path, context } of cases) {
  test(`leaving ${path} mounts the next account/admin page with out-in transitions`, async () => {
    const source = pageTemplate(path, context);
    const leaving = vue.ref(false);
    let targetMounts = 0;
    const target = vue.defineComponent({
      setup() {
        vue.onMounted(() => targetMounts++);
        return () => vue.h("main", "Next page");
      },
    });
    const app = renderer.createApp({
      render: () =>
        vue.h(
          vue.BaseTransition,
          {
            mode: "out-in",
            // Browser CSS transitions complete after the outgoing patch has finished.
            onLeave: (_element: unknown, done: () => void) =>
              queueMicrotask(done),
          },
          {
            default: () => vue.h(leaving.value ? target : source),
          },
        ),
    });
    const warnings: string[] = [];
    app.config.warnHandler = (message) => {
      if (!message.startsWith("Failed to resolve component:"))
        warnings.push(message);
    };
    try {
      app.mount(node());
      await vue.nextTick();
      leaving.value = true;
      await vue.nextTick();
      await vue.nextTick();
      assert.equal(
        targetMounts,
        1,
        "the outgoing page must not strand the transition before the next page mounts",
      );
      leaving.value = false;
      await vue.nextTick();
      await vue.nextTick();
      leaving.value = true;
      await vue.nextTick();
      await vue.nextTick();
      assert.equal(
        targetMounts,
        2,
        "repeated navigation must keep mounting the next page",
      );
      assert.deepEqual(warnings, []);
    } finally {
      app.unmount();
    }
  });
}
