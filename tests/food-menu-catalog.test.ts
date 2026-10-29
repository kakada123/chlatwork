import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { compileScript, parse } from "@vue/compiler-sfc";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function catalog(fetcher: (...args: any[]) => Promise<unknown>) {
  const source = readFileSync(
    new URL("../app/composables/useFoodMenuCatalog.ts", import.meta.url),
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
  return module.exports.useFoodMenuCatalog();
}
const response = (slugs: string[], extra = {}) => ({
  items: slugs.map((slug) => ({ slug, nameKm: "ម្ហូប", nameEn: slug })),
  total: 1000,
  categories: [],
  cuisines: [],
  mealTimes: [],
  tags: [],
  source: "AI_ASSISTED",
  ...extra,
});

test("food ideas show cooking instructions only for matched recipes and retain both existing actions", async () => {
  const state = catalog(async () =>
    response([], {
      items: [
        {
          slug: "matched",
          nameKm: "ម្ហូប",
          nameEn: "Matched",
          category: "RICE",
          mealTimes: ["lunch"],
          ingredients: [],
          recipeId: "saved-id",
        },
        {
          slug: "unmatched",
          nameKm: "ម្ហូបផ្សេង",
          nameEn: "Unmatched",
          category: "RICE",
          mealTimes: ["lunch"],
          ingredients: [],
        },
      ],
    }),
  );
  await state.search();
  const filename = "app/components/food/FoodMenuCatalog.vue";
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const compiled = compileScript(descriptor, {
    id: "food-catalog",
    inlineTemplate: true,
  });
  const code = ts.transpileModule(compiled.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (name === "vue") return vue;
      if (name === "~/composables/useFoodMenuCatalog")
        return { useFoodMenuCatalog: () => state };
      throw new Error(name);
    },
    module,
    module.exports,
  );
  const html = await renderToString(
    vue.createSSRApp(module.exports.default, { initiallyExpanded: true }),
  );
  const articles = html.match(/<article\b[\s\S]*?<\/article>/g) || [];
  assert.equal(articles.length, 2);
  assert.match(articles[0], /View how to cook/);
  assert.doesNotMatch(articles[1], /View how to cook/);
  for (const article of articles) {
    assert.match(article, /រកហាងនៅជិត/);
    assert.match(article, /បង្កើតរូបមន្ត AI/);
  }
});

test("menu catalog freezes filters across pages and deduplicates appended items", async () => {
  const calls: any[][] = [];
  const state = catalog(async (...args) => {
    calls.push(args);
    return calls.length === 1
      ? response(["one"], { nextCursor: "one" })
      : response(["one", "two"], { nextCursor: "one" });
  });
  state.q.value = " បាយ ";
  state.category.value = "RICE";
  await state.search();
  await state.loadMore();
  assert.equal(calls[0][0], "/api/food/menu-catalog");
  assert.equal(calls[1][1].query.after, "one");
  assert.equal(calls[1][1].query.q, "បាយ");
  assert.equal(calls[1][1].query.category, "RICE");
  assert.deepEqual(
    state.items.value.map((item: any) => item.slug),
    ["one", "two"],
  );
  assert.equal(state.hasMore.value, false);
  assert.equal(state.total.value, 1000);
});

test("a newly generated recipe refreshes catalog availability even during an earlier search", async () => {
  let finish!: (value: unknown) => void;
  let calls = 0;
  const state = catalog(async () => {
    calls++;
    return calls === 1
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : response(["new"]);
  });
  const pending = state.search();
  state.refresh();
  finish(response(["old"]));
  await pending;
  await vue.nextTick();
  assert.equal(calls, 2);
  assert.equal(state.items.value[0].slug, "new");
});

test("catalog changes queue a fresh search and never apply an old response", async () => {
  let finish!: (value: unknown) => void;
  let calls = 0;
  const state = catalog(async () => {
    calls++;
    return calls === 1
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : response(["new"]);
  });
  const first = state.search();
  state.q.value = "new";
  await state.search();
  finish(response(["old"]));
  await first;
  await vue.nextTick();
  assert.equal(calls, 2);
  assert.equal(state.items.value[0].slug, "new");
});

test("failed catalog pages preserve results and disable infinite retry until an explicit action", async () => {
  let calls = 0;
  const state = catalog(async () => {
    calls++;
    if (calls > 1) throw new Error("offline");
    return response(["one"], { nextCursor: "one" });
  });
  await state.search();
  await state.loadMore();
  assert.equal(state.items.value.length, 1);
  assert.equal(state.canAutoLoadMore.value, false);
  assert.ok(state.errorMessage.value);
  state.category.value = "NOODLES";
  await state.loadMore();
  assert.equal(calls, 2);
});
