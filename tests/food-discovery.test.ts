import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as maps from "../app/lib/food-maps.ts";
import * as history from "../app/lib/food-history.ts";
import * as presets from "../app/lib/food-quick-presets.ts";

function discovery(
  fetcher: (...args: any[]) => Promise<unknown>,
  browser?: unknown,
  waitForAccount = false,
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
    new Function(
      "require",
      "module",
      "exports",
      "$fetch",
      "window",
      "navigator",
      code,
    )(
      (name: string) => {
        if (name === "vue") return vue;
        if (name === "~/lib/food-maps") return maps;
        if (name === "~/lib/food-history") return history;
        if (name === "~/lib/food-quick-presets") return presets;
        if (name === "~/composables/useFoodResults")
          return load("app/composables/useFoodResults.ts");
        throw new Error(`Unexpected Food dependency: ${name}`);
      },
      module,
      module.exports,
      fetcher,
      browser,
      (browser as { navigator?: unknown } | undefined)?.navigator || {},
    );
    return module.exports;
  }
  return load("app/composables/useFoodDiscovery.ts").useFoodDiscovery({
    waitForAccount,
  });
}

test("the page can wait for initial account resolution before starting paid generation", async () => {
  let calls = 0;
  const state = discovery(
    async () => {
      calls++;
      return { mode: "dine-out", places: [], dataSource: "google" };
    },
    undefined,
    true,
  );
  await state.getRecommendations();
  await state.fetchRandomPick();
  assert.equal(calls, 0);
  state.setDiscoveryAccount(null);
  await state.getRecommendations();
  assert.equal(calls, 1);
});

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

test("Cook at Home requests one complete recipe at a time to reduce inference latency", async () => {
  const calls: any[][] = [];
  const state = discovery(async (...args) => {
    calls.push(args);
    return {
      mode: "cook-at-home",
      places: [],
      recipes: [],
      dataSource: "gemini",
    };
  });
  state.mode.value = "cook-at-home";
  await state.getRecommendations();
  assert.equal(calls[0][1].body.limit, 1);
  assert.equal(calls[0][1].retry, 0);
});

test("quick presets fill editable criteria without triggering hidden paid requests", () => {
  let calls = 0;
  const state = discovery(async () => {
    calls++;
    return {};
  });
  state.filters.value = { dietary: ["allergies"], city: "siem-reap" };
  state.minimumRating.value = 4.5;
  state.allergies.value = "peanuts";
  state.selectQuickPreset("solo-lunch");
  assert.equal(state.peopleCount.value, 1);
  assert.equal(state.activeQuickPreset.value, "solo-lunch");
  assert.equal(state.filters.value.city, "siem-reap");
  assert.equal(state.allergies.value, "peanuts");
  assert.equal(calls, 0);
  assert.equal(state.minimumRating.value, 0);
  state.peopleCount.value = 2;
  assert.equal(state.activeQuickPreset.value, null);
});

test("an account switch clears private recipe/modals and rejects a late generation from the old account", async () => {
  let finish!: (value: unknown) => void;
  const state = discovery(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  state.setDiscoveryAccount("account-a");
  state.mode.value = "cook-at-home";
  const pending = state.getRecommendations();
  state.selectedRecipe.value = { id: "private-open" };
  state.allergies.value = "private allergy";
  state.setDiscoveryAccount("account-b");
  assert.equal(state.selectedRecipe.value, null);
  assert.equal(state.allergies.value, "");
  finish({
    mode: "cook-at-home",
    places: [],
    recipes: [
      {
        id: "private-a",
        nameKm: "សម្ល",
        nameEn: "Private A",
        savedRecipeId: "saved-a",
      },
    ],
    dataSource: "gemini",
  });
  await pending;
  assert.equal(state.recipes.value.length, 0);
  assert.equal(state.randomSuggestion.value, null);
});

test("an old account's GPS callback cannot restore private coordinates or trigger discovery for the next account", () => {
  const requests: Array<{
    success: (value: unknown) => void;
    failure: (value: unknown) => void;
  }> = [];
  let calls = 0;
  const state = discovery(
    async () => {
      calls++;
      return { mode: "dine-out", places: [], dataSource: "google" };
    },
    {
      navigator: {
        geolocation: {
          getCurrentPosition: (
            success: (value: unknown) => void,
            failure: (value: unknown) => void,
          ) => requests.push({ success, failure }),
        },
      },
    },
  );
  state.setDiscoveryAccount("account-a");
  state.requestGeolocation();
  state.setDiscoveryAccount("account-b");
  assert.equal(state.isLocating.value, false);
  state.requestGeolocation();
  requests[0].success({ coords: { latitude: 11.55, longitude: 104.92 } });
  requests[0].failure({ code: 1, PERMISSION_DENIED: 1 });
  assert.equal(state.userCoords.value, null);
  assert.equal(state.errorMessage.value, null);
  assert.equal(state.isLocating.value, true);
  assert.equal(calls, 0);
  requests[1].success({ coords: { latitude: 13.36, longitude: 103.86 } });
  assert.equal(state.userCoords.value.lat, 13.36);
  assert.equal(calls, 1);
});

test("recent recipe names are scoped to an account and survive reloads for that same account", async () => {
  const saved = new Map<string, string>();
  const browser = {
    sessionStorage: {
      getItem: (key: string) => saved.get(key) || null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  };
  const calls: any[][] = [];
  const fetcher = async (...args: any[]) => {
    calls.push(args);
    return {
      mode: "cook-at-home",
      places: [],
      recipes: [{ id: "recipe-a", nameKm: "សម្ល", nameEn: "Soup" }],
      dataSource: "gemini",
    };
  };
  const state = discovery(fetcher, browser);
  state.setDiscoveryAccount("account-a");
  state.mode.value = "cook-at-home";
  await state.getRecommendations();
  state.setDiscoveryAccount("account-b");
  await state.getRecommendations();
  assert.equal(calls[1][1].body.recentRecipeNames, undefined);
  const reload = discovery(fetcher, browser);
  reload.setDiscoveryAccount("account-a");
  await reload.getRecommendations();
  assert.deepEqual(calls[2][1].body.recentRecipeNames, ["សម្ល", "Soup"]);
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
