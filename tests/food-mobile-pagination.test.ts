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
    canAutoLoadMore: canLoad,
    fetchDistricts: async () => {},
    fetchFilters: async () => {},
    getRecommendations() {},
    loadMorePlaces: async () => {
      loads++;
    },
    requestGeolocation() {
      gpsRequests++;
    },
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
    code,
  )(
    (name: string) => {
      if (name === "vue") return framework;
      if (name === "~/composables/useFoodDiscovery")
        return { useFoodDiscovery: () => state };
      if (name === "lucide-vue-next") return new Proxy({}, { get: () => ({}) });
      if (name.endsWith(".vue")) return { default: {} };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    module,
    module.exports,
    () => {},
    { matchMedia: () => viewport, IntersectionObserver: Observer },
    Observer,
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
    state.filters.value = { locationDiscovery: "near-me" };
    await vue.nextTick();
    assert.equal(gpsRequests, 1);
    assert.ok(observed > 0);
    onIntersection([{ isIntersecting: false }]);
    assert.equal(loads, 0);
    onIntersection([{ isIntersecting: true }]);
    assert.equal(loads, 1);
    canLoad.value = false;
    await vue.nextTick();
    onIntersection([{ isIntersecting: true }]);
    assert.equal(loads, 1);
    viewport.matches = false;
    onViewport();
    await vue.nextTick();
    assert.equal(page.isMobile.value, false);
    const previous = disconnected;
    unmounted.forEach((work) => work());
    assert.ok(disconnected > previous);
  } finally {
    scope.stop();
  }
});
