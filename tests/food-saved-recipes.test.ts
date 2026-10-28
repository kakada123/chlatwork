import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function saved(
  owner: () => string | null,
  fetcher: (...args: any[]) => Promise<unknown>,
) {
  const source = readFileSync(
    new URL("../app/composables/useSavedFoodRecipes.ts", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "$fetch", code)(
    (name: string) => {
      if (name === "vue") return vue;
      throw new Error(name);
    },
    module,
    module.exports,
    fetcher,
  );
  return module.exports.useSavedFoodRecipes(owner);
}

test("saved recipes clear on account changes and ignore a previous account's late response", async () => {
  const owner = vue.ref<string | null>("account-a");
  let finish!: (value: unknown) => void;
  let calls = 0;
  const scope = vue.effectScope();
  const state = scope.run(() =>
    saved(
      () => owner.value,
      async () => {
        calls++;
        return calls === 1
          ? new Promise((resolve) => {
              finish = resolve;
            })
          : { recipes: [{ id: "recipe-b", savedRecipeId: "saved-b" }] };
      },
    ),
  );
  try {
    const old = state.refresh();
    owner.value = "account-b";
    assert.equal(state.recipes.value.length, 0);
    await state.refresh();
    finish({ recipes: [{ id: "recipe-a", savedRecipeId: "saved-a" }] });
    await old;
    assert.equal(state.recipes.value[0].id, "recipe-b");
    owner.value = null;
    assert.equal(state.recipes.value.length, 0);
    await state.refresh();
    assert.equal(calls, 2);
  } finally {
    scope.stop();
  }
});

test("saved history appends unique records, preserves a failed page and only retries on demand", async () => {
  const calls: any[][] = [];
  let fail = false;
  const state = saved(
    () => "account",
    async (...args) => {
      calls.push(args);
      if (fail) throw new Error("offline");
      return calls.length === 1
        ? { recipes: [{ savedRecipeId: "one" }], nextCursor: "second" }
        : {
            recipes: [{ savedRecipeId: "one" }, { savedRecipeId: "two" }],
            nextCursor: "second",
          };
    },
  );
  await state.refresh();
  fail = true;
  await state.loadMore();
  assert.equal(state.recipes.value.length, 1);
  assert.ok(state.errorMessage.value);
  assert.equal(calls.length, 2);
  fail = false;
  await state.loadMore();
  assert.equal(calls[2][1].query.cursor, "second");
  assert.deepEqual(
    state.recipes.value.map((recipe: any) => recipe.savedRecipeId),
    ["one", "two"],
  );
  assert.equal(state.hasMore.value, false);
});
