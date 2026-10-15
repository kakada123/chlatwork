import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as tools from "../app/data/creator-tools.ts";
import * as guard from "../app/lib/creator-output-language.ts";

function compile(
  path: string,
  globals: Record<string, unknown>,
  imports: Record<string, unknown> = {},
) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const module = { exports: {} as any };
  new Function(
    "require",
    "module",
    "exports",
    ...Object.keys(globals),
    compiled,
  )(
    (name: string) => {
      if (!(name in imports)) throw new Error(`Unexpected dependency: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  return module.exports;
}

const service = compile("app/services/creator-ai.service.ts", {});

for (const outcome of ["success", "error", "unmount"] as const) {
  test(`a delayed generation ${outcome} cannot update another session's result, credits or history`, async () => {
    const session = vue.ref<any>({ id: "first-account" });
    const balance = vue.ref<number | null>(20);
    const history: unknown[] = [];
    const cleanup: (() => void)[] = [];
    let resolve!: (result: unknown) => void;
    let reject!: (error: unknown) => void;
    let progress!: (stage: string) => void;
    const module = compile(
      "app/composables/useCreatorTool.ts",
      {
        reactive: vue.reactive,
        ref: vue.ref,
        shallowRef: vue.shallowRef,
        computed: vue.computed,
        watch: vue.watch,
        useAuth: () => ({ user: session }),
        useCreatorHistory: () => ({
          add: (entry: unknown) => history.push(entry),
        }),
        useState: () => balance,
        onMounted() {},
        onBeforeUnmount: (fn: () => void) => cleanup.push(fn),
      },
      {
        "~/data/creator-tools": tools,
        "~/lib/creator-output-language": guard,
        "~/services/creator-ai.service": {
          ...service,
          runCreatorGeneration: (
            _tool: unknown,
            _request: unknown,
            context: any,
          ) => {
            progress = context.onVideoStage;
            return new Promise((ok, fail) => {
              resolve = ok;
              reject = fail;
            });
          },
        },
      },
    );
    const scope = vue.effectScope();
    try {
      const tool = tools.CREATOR_TOOLS.find(
        (item) => item.id === "khmer-to-english",
      )!;
      const state = scope.run(() => module.useCreatorTool(tool, "សួស្តី"));
      const pending = state.generate();
      if (outcome === "unmount") cleanup.forEach((fn) => fn());
      else session.value = { id: "second-account" };
      balance.value = 99;
      progress("CREATING");
      if (outcome === "error")
        reject(
          new service.CreatorServiceError(
            "INSUFFICIENT_CREDITS",
            "Private account error",
            1,
            19,
          ),
        );
      else
        resolve({
          generationId: "private-generation",
          data: {
            title: "Private result",
            sections: [{ content: "Private preview" }],
          },
          usage: { creditsCharged: 1, creditsRemaining: 19 },
        });
      await pending;
      assert.equal(state.result.value, null);
      assert.equal(balance.value, 99);
      assert.equal(state.errorMessage.value, "");
      assert.equal(state.activeVideoStage.value, -1);
      assert.equal(history.length, 0);
    } finally {
      scope.stop();
    }
  });
}
