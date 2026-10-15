import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as tools from "../app/data/creator-tools.ts";
import * as guard from "../app/lib/creator-output-language.ts";

function harness() {
  const session = vue.ref<any>({ id: "first-account" });
  const state = new Map<string, any>();
  const pending: ((entries: any[]) => void)[] = [];
  const source = readFileSync(
    new URL("../app/composables/useCreatorHistory.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const module = { exports: {} as any };
  const globals = {
    computed: vue.computed,
    watch: vue.watch,
    useAuth: () => ({ user: session }),
    useState(key: string, initial: () => unknown) {
      if (!state.has(key)) state.set(key, vue.ref(initial()));
      return state.get(key);
    },
  };
  new Function(
    "require",
    "module",
    "exports",
    ...Object.keys(globals),
    compiled,
  )(
    (name: string) => {
      if (name === "~/data/creator-tools") return tools;
      if (name === "~/lib/creator-output-language") return guard;
      if (name === "~/services/creator-ai.service")
        return {
          getCreatorHistory: () =>
            new Promise((resolve) => pending.push(resolve)),
        };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  const scope = vue.effectScope();
  const history = scope.run(() => module.exports.useCreatorHistory());
  return {
    history,
    session,
    pending,
    instance: () => scope.run(() => module.exports.useCreatorHistory()),
    dispose: () => scope.stop(),
  };
}

const localEntry = {
  id: "saved-generation",
  toolId: "khmer-to-english",
  title: "Khmer to English",
  route: "/creator/khmer/khmer-to-english",
  preview: "Hello",
};

test("recent generations retain the server ID used by their detail links", () => {
  const page = harness();
  try {
    page.history.add(localEntry, "first-account");
    assert.equal(page.history.items.value[0].id, "saved-generation");
  } finally {
    page.dispose();
  }
});

test("account changes clear previews immediately and discard another account's pending history", async () => {
  const page = harness();
  try {
    page.history.add(localEntry, "first-account");
    const loading = page.history.refresh();
    page.session.value = { id: "second-account" };
    assert.equal(page.history.items.value.length, 0);
    page.pending.shift()!([
      {
        id: "private-generation",
        feature: "KHMER_TO_ENGLISH",
        result: {
          title: "Private result",
          sections: [{ content: "Private preview" }],
        },
        createdAt: "2026-10-15T00:00:00Z",
      },
    ]);
    await loading;
    assert.equal(page.history.items.value.length, 0);
    page.history.add(localEntry, "second-account");
    page.session.value = null;
    assert.equal(page.history.items.value.length, 0);
    await page.history.refresh();
    assert.equal(page.pending.length, 0);
  } finally {
    page.dispose();
  }
});

test("shared history discards an older instance's refresh and a refresh predating a new result", async () => {
  const page = harness();
  try {
    const second = page.instance();
    const older = page.history.refresh();
    const newer = second.refresh();
    page.pending[1]([]);
    await newer;
    second.add(localEntry, "first-account");
    page.pending[0]([]);
    await older;
    assert.equal(page.history.items.value[0]?.id, "saved-generation");

    const beforeAdd = page.history.refresh();
    second.add({ ...localEntry, id: "latest-generation" }, "first-account");
    page.pending[2]([]);
    await beforeAdd;
    assert.equal(page.history.items.value[0]?.id, "latest-generation");
  } finally {
    page.dispose();
  }
});

test("a delayed history insertion cannot write another account's preview", () => {
  const page = harness();
  try {
    page.session.value = { id: "second-account" };
    page.history.add(localEntry, "first-account");
    assert.equal(page.history.items.value.length, 0);
  } finally {
    page.dispose();
  }
});
