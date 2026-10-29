import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";

test("Food mobile observer loads only intersecting available pages, follows viewport changes and cleans up", async () => {
  const mounted: Array<() => Promise<void>> = [];
  const unmounted: Array<() => void> = [];
  const canLoad = vue.ref(true);
  let gpsRequests = 0;
  let gpsOptions: unknown;
  let discoveries = 0;
  let resultScrolls = 0;
  let loads = 0,
    observed = 0,
    disconnected = 0;
  let onIntersection!: (entries: Array<{ isIntersecting: boolean }>) => void;
  let onViewport!: () => void;
  const viewport = {
    matches: true,
    addEventListener: (_: string, work: () => void) => {
      onViewport = work;
    },
    removeEventListener: (_: string, work: () => void) =>
      assert.equal(work, onViewport),
  };
  class Observer {
    constructor(work: typeof onIntersection) {
      onIntersection = work;
    }
    observe() {
      observed++;
    }
    disconnect() {
      disconnected++;
    }
  }
  const filename = new URL("../app/pages/food.vue", import.meta.url).pathname;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const script = compileScript(descriptor, { id: "food-mobile" });
  const code = ts.transpileModule(script.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const state = {
    filters: vue.ref({}),
    filterDefinitions: vue.ref([]),
    userCoords: vue.ref(null),
    isLocating: vue.ref(false),
    districts: vue.ref([]),
    selectedDistrictId: vue.ref(""),
    mode: vue.ref("dine-out"),
    mealTime: vue.ref("lunch"),
    peopleCount: vue.ref(3),
    totalBudget: vue.ref(10),
    searchKeyword: vue.ref(""),
    isLoading: vue.ref(false),
    isLoadingMore: vue.ref(false),
    isRandomLoading: vue.ref(false),
    locationQuery: vue.ref(""),
    routeOrigin: vue.ref(""),
    routeDestination: vue.ref(""),
    errorMessage: vue.ref(null),
    canAutoLoadMore: canLoad,
    hasSearched: vue.ref(false),
    fetchDistricts: async () => {},
    fetchFilters: async () => {},
    getRecommendations() {
      discoveries++;
      state.hasSearched.value = true;
    },
    loadMorePlaces: async () => {
      loads++;
    },
    requestGeolocation(options: unknown) {
      gpsOptions = options;
      gpsRequests++;
    },
    setDiscoveryAccount() {},
  };
  const framework = {
    ...vue,
    onMounted: (work: () => Promise<void>) => mounted.push(work),
    onBeforeUnmount: (work: () => void) => unmounted.push(work),
  };
  const module = { exports: {} as any };
  new Function(
    "require",
    "module",
    "exports",
    "definePageMeta",
    "window",
    "IntersectionObserver",
    "document",
    code,
  )(
    (name: string) => {
      if (name === "vue") return framework;
      if (name === "~/composables/useFoodDiscovery")
        return { useFoodDiscovery: () => state };
      if (name === "~/composables/useAuth")
        return {
          useAuth: () => ({
            user: vue.ref(null),
            isReady: vue.ref(true),
            fetchMe: async () => {},
          }),
        };
      if (name === "lucide-vue-next") return new Proxy({}, { get: () => ({}) });
      if (name.endsWith(".vue")) return { default: {} };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    module,
    module.exports,
    () => {},
    { matchMedia: () => viewport, IntersectionObserver: Observer },
    Observer,
    {
      getElementById: () => ({
        scrollIntoView: () => {
          resultScrolls++;
        },
      }),
    },
  );
  const scope = vue.effectScope();
  try {
    const page = scope.run(() =>
      module.exports.default.setup({}, { expose() {} }),
    );
    page.loadMoreSentinel.value = {};
    await mounted[0]();
    await vue.nextTick();
    assert.equal(page.isMobile.value, true);
    assert.equal(
      discoveries,
      0,
      "mobile setup must not submit before the final choice",
    );
    state.filters.value = { locationDiscovery: "near-me" };
    await vue.nextTick();
    assert.equal(gpsRequests, 1);
    assert.deepEqual(gpsOptions, { refresh: false });
    assert.equal(
      observed,
      0,
      "the hidden result list must not load more pages",
    );
    onIntersection([{ isIntersecting: true }]);
    assert.equal(loads, 0);
    page.mobilePanel.value = "results";
    await vue.nextTick();
    assert.ok(observed > 0);
    onIntersection([{ isIntersecting: false }]);
    assert.equal(loads, 0);
    onIntersection([{ isIntersecting: true }]);
    assert.equal(loads, 1);
    page.mobileResultView.value = "map";
    await vue.nextTick();
    onIntersection([{ isIntersecting: true }]);
    assert.equal(loads, 1, "map-only view must not paginate the hidden list");
    page.mobileResultView.value = "list";
    page.mobilePanel.value = "search";
    await vue.nextTick();
    onIntersection([{ isIntersecting: true }]);
    assert.equal(loads, 1, "leaving results stops pending observer callbacks");
    page.changeMobileCriteria({
      keyword: "គុយទាវ",
      mealTime: "breakfast",
      peopleCount: 2,
      totalBudget: 5,
    });
    assert.equal(discoveries, 0, "editing choices must not submit");
    assert.equal(state.searchKeyword.value, "គុយទាវ");
    assert.equal(state.mealTime.value, "breakfast");
    assert.equal(state.peopleCount.value, 2);
    await page.submitDiscovery();
    assert.equal(discoveries, 1);
    assert.equal(page.mobilePanel.value, "results");
    assert.equal(resultScrolls, 1);
    state.filters.value = {
      city: "siem-reap",
      area: "bkk",
      locationDiscovery: "within-1-km",
      dietary: ["vegan"],
    };
    state.locationQuery.value = "old city";
    page.requestMobileLocation();
    assert.deepEqual(state.filters.value, {
      locationDiscovery: "within-1-km",
      dietary: ["vegan"],
    });
    assert.equal(state.locationQuery.value, "");
    assert.equal(discoveries, 1, "the mobile GPS button must not resubmit");
    assert.deepEqual(gpsOptions, { refresh: false });
    canLoad.value = false;
    await vue.nextTick();
    onIntersection([{ isIntersecting: true }]);
    assert.equal(loads, 1);
    viewport.matches = false;
    state.hasSearched.value = false;
    onViewport();
    await vue.nextTick();
    assert.equal(page.isMobile.value, false);
    assert.equal(
      discoveries,
      2,
      "expanding unfinished mobile setup must start desktop discovery",
    );
    state.isLoading.value = true;
    state.mode.value = "cook-at-home";
    await page.submitDiscovery();
    assert.equal(
      discoveries,
      3,
      "desktop mode changes must reach the result queue while a search is running",
    );
    state.isLoading.value = false;
    state.hasSearched.value = true;
    viewport.matches = true;
    onViewport();
    await vue.nextTick();
    viewport.matches = false;
    onViewport();
    await vue.nextTick();
    assert.equal(
      discoveries,
      3,
      "resizing with results must not issue another search",
    );
    state.hasSearched.value = false;
    viewport.matches = true;
    onViewport();
    await vue.nextTick();
    viewport.matches = false;
    onViewport();
    await vue.nextTick();
    assert.equal(discoveries, 3, "resizing unfinished recipe choices must not auto-generate a recipe");
    page.changeDiscoveryMode("cook-at-home");
    assert.equal(discoveries, 3, "opening Cook at Home must never create a recipe");
    state.mode.value = "dine-out";
    page.changeDiscoveryMode("cook-at-home");
    assert.equal(discoveries, 3, "switching from Dine Out to Cook at Home must not submit");
    const previous = disconnected;
    unmounted.forEach((work) => work());
    assert.ok(disconnected > previous);
  } finally {
    scope.stop();
  }
});
