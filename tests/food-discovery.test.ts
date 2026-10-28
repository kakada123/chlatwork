import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as maps from "../app/lib/food-maps.ts";
import * as history from "../app/lib/food-history.ts";

function discovery(
  fetcher: (...args: any[]) => Promise<unknown>,
  browser?: unknown,
) {
  function load(path: string): any {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const module = { exports: {} as any };
    new Function("require", "module", "exports", "$fetch", "window", code)(
      (name: string) => {
        if (name === "vue") return vue;
        if (name === "~/lib/food-maps") return maps;
        if (name === "~/lib/food-history") return history;
        if (name === "~/composables/useFoodResults")
          return load("app/composables/useFoodResults.ts");
        throw new Error(`Unexpected Food dependency: ${name}`);
      },
      module,
      module.exports,
      fetcher,
      browser,
    );
    return module.exports;
  }
  return load("app/composables/useFoodDiscovery.ts").useFoodDiscovery();
}

test("Food AI picker posts all current criteria and GPS coordinates instead of the old meal-only random request", async () => {
  const calls: any[][] = [];
  const state = discovery(async (...args) => {
    calls.push(args);
    return { type: "place", selectionSource: "gemini", messageKm: "សាកល្បង" };
  });
  state.mode.value = "dine-out";
  state.mealTime.value = "dinner";
  state.occasion.value = "family";
  state.peopleCount.value = 4;
  state.totalBudget.value = 24;
  state.searchKeyword.value = " គុយទាវ ";
  state.userCoords.value = { lat: 11.55, lng: 104.92 };
  await state.fetchRandomPick();
  assert.equal(calls[0][0], "/api/food/pick");
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(calls[0][1].body, {
    mode: "dine-out",
    mealTime: "dinner",
    occasion: "family",
    peopleCount: 4,
    totalBudget: 24,
    cuisine: "គុយទាវ",
    limit: 20,
    lat: 11.55,
    lng: 104.92,
  });
  assert.equal(state.randomSuggestion.value.selectionSource, "gemini");
});

test("Food AI picker passes the selected district for recipe mode and stops a duplicate paid request", async () => {
  let finish!: (value: unknown) => void;
  const calls: any[][] = [];
  const state = discovery((...args) => {
    calls.push(args);
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  state.mode.value = "cook-at-home";
  state.selectedDistrictId.value = "tuol-kork";
  const pending = state.fetchRandomPick();
  const duplicate = state.fetchRandomPick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].body.mode, "cook-at-home");
  assert.equal(calls[0][1].body.district, "tuol-kork");
  finish({ type: "dish", messageKm: "ម្ហូប" });
  await Promise.all([pending, duplicate]);
  assert.equal(state.isRandomLoading.value, false);
});

test("Food AI failure clears the previous pick and shows an error without fabricating a recipe", async () => {
  const state = discovery(async () => {
    throw new Error("Provider unavailable");
  });
  state.randomSuggestion.value = { type: "dish", messageKm: "Old choice" };
  await state.fetchRandomPick();
  assert.equal(state.randomSuggestion.value, null);
  assert.ok(state.errorMessage.value);
  assert.equal(state.isRandomLoading.value, false);
});

test("shown places and generated recipes are excluded on later suggestions and across session reloads", async () => {
  const saved = new Map<string, string>();
  const browser = {
    sessionStorage: {
      getItem: (key: string) => saved.get(key) || null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  };
  const calls: any[][] = [];
  const state = discovery(async (...args) => {
    calls.push(args);
    return {
      mode: "dine-out",
      dataSource: "google",
      places: [{ id: "google:one", name: "First" }],
      recipes: [{ id: "gemini-one", nameKm: "សម្ល", nameEn: "Soup" }],
    };
  }, browser);
  await state.getRecommendations();
  await state.getRecommendations();
  assert.deepEqual(calls[1][1].body.excludePlaceIds, ["google:one"]);
  assert.deepEqual(calls[1][1].body.recentRecipeNames, ["សម្ល", "Soup"]);
  assert.equal(state.places.value.length, 0);
  assert.equal(state.recipes.value.length, 0);
  const reloaded = discovery(async (...args) => {
    calls.push(args);
    return { mode: "dine-out", places: [], dataSource: "google" };
  }, browser);
  await reloaded.getRecommendations();
  assert.deepEqual(calls.at(-1)[1].body.excludePlaceIds, ["google:one"]);
  assert.equal(JSON.stringify([...saved.values()]).includes("district"), false);
});

test("load more appends unique places with the saved cursor, center and filters, and ignores duplicate in-flight requests", async () => {
  const calls: any[][] = [];
  let finish!: (value: unknown) => void;
  const state = discovery((...args) => {
    calls.push(args);
    return calls.length === 1
      ? Promise.resolve({
          mode: "dine-out",
          dataSource: "google",
          places: [{ id: "one" }],
          nextPageToken: "second",
          searchCenter: { lat: 13.36, lng: 103.86 },
        })
      : new Promise((resolve) => {
          finish = resolve;
        });
  });
  state.filters.value = {
    foodTypes: ["kuy-teav"],
    restaurantTypes: ["street-food-stall"],
  };
  await state.getRecommendations();
  assert.equal(state.hasMorePlaces.value, true);
  const pending = state.loadMorePlaces();
  await state.loadMorePlaces();
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1].body.pageToken, "second");
  assert.equal(calls[1][1].body.searchLat, 13.36);
  assert.deepEqual(calls[1][1].body.filters, {
    foodTypes: ["kuy-teav"],
    restaurantTypes: ["street-food-stall"],
  });
  finish({
    mode: "dine-out",
    dataSource: "google",
    places: [{ id: "one" }, { id: "two" }, { id: "two" }],
    nextPageToken: "second",
  });
  await pending;
  assert.deepEqual(
    state.places.value.map((place: any) => place.id),
    ["one", "two"],
  );
  assert.equal(state.hasMorePlaces.value, false);
});

test("a failed next page keeps results and disables automatic retry, while changed filters cannot reuse its cursor", async () => {
  let calls = 0;
  const state = discovery(async () => {
    calls++;
    if (calls > 1) throw new Error("offline");
    return {
      mode: "dine-out",
      dataSource: "google",
      places: [{ id: "one" }],
      nextPageToken: "second",
    };
  });
  await state.getRecommendations();
  await state.loadMorePlaces();
  assert.equal(state.canAutoLoadMore.value, false);
  assert.equal(state.places.value.length, 1);
  state.filters.value = { who: "family" };
  await state.loadMorePlaces();
  assert.equal(calls, 2);
});

test("history reset explicitly permits old choices again and storage failure does not break discovery", async () => {
  const calls: any[][] = [];
  const state = discovery(
    async (...args) => {
      calls.push(args);
      return {
        mode: "dine-out",
        places: [{ id: "one" }],
        dataSource: "google",
      };
    },
    {
      get sessionStorage() {
        throw new Error("unavailable");
      },
    },
  );
  await state.getRecommendations();
  state.clearSuggestionHistory();
  await state.getRecommendations();
  assert.equal(calls[1][1].body.excludePlaceIds, undefined);
  assert.equal(state.places.value.length, 1);
});

test("a new search with the same page token restores paging after criteria change", async () => {
  const state = discovery(async () => ({
    mode: "dine-out",
    places: [],
    dataSource: "google",
    nextPageToken: "same",
  }));
  await state.getRecommendations();
  assert.equal(state.hasMorePlaces.value, true);
  state.filters.value = { who: "family" };
  assert.equal(state.hasMorePlaces.value, false);
  await state.getRecommendations();
  assert.equal(state.hasMorePlaces.value, true);
});

test("the first page deduplicates place IDs and budget summaries respect type and ranges", async () => {
  const state = discovery(async () => ({
    mode: "dine-out",
    places: [{ id: "one" }, { id: "one" }],
    dataSource: "google",
  }));
  await state.getRecommendations();
  assert.equal(state.places.value.length, 1);
  state.filters.value = { budgetType: "per-person" };
  assert.equal(state.budgetPerPerson.value, 10);
  state.filters.value = { budgetRange: "affordable-5-10" };
  assert.equal(state.budgetPerPerson.value, 10);
  state.filters.value = { budgetRange: "fine-dining-100" };
  assert.equal(state.budgetPerPerson.value, null);
  state.filters.value = { budgetType: "flexible-no-fixed-budget" };
  assert.equal(state.budgetPerPerson.value, null);
});
