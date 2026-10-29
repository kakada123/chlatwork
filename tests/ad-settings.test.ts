import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { canShowAdsForUser } from "../app/lib/ad-visibility.ts";
import { compileScript, parse } from "@vue/compiler-sfc";

function visibility() {
  const mounted: Array<() => void> = [];
  const disabled = vue.ref<string[]>([]),
    loaded = vue.ref(false),
    user = vue.ref<{ name: string } | null>(null);
  const route = vue.reactive({ meta: {} as Record<string, unknown> });
  const sourcePath = vue.ref("/food");
  let reads = 0;
  const availability = {
    loaded,
    isEnabled: (key: string) => !disabled.value.includes(key),
    refresh: async () => {
      reads++;
    },
  };
  const source = readFileSync(
    new URL("../app/composables/useAdVisibility.ts", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} as any };
  new Function(
    "require",
    "module",
    "exports",
    "useRoute",
    "useProductDomain",
    "useAuth",
    "useFeatureAvailability",
    "computed",
    "readonly",
    "onMounted",
    code,
  )(
    (name: string) => {
      if (name === "~/lib/ad-visibility") return { canShowAdsForUser };
      if (name === "~/composables/useFeatureAvailability")
        return { useFeatureAvailability: () => availability };
      throw new Error(`Unexpected ads dependency: ${name}`);
    },
    module,
    module.exports,
    () => route,
    () => ({ sourcePath }),
    () => ({ user, isReady: vue.ref(true), fetchMe: async () => {} }),
    () => availability,
    vue.computed,
    vue.readonly,
    (work: () => void) => mounted.push(work),
  );
  return {
    ...module.exports.useAdVisibility(),
    disabled,
    loaded,
    user,
    route,
    sourcePath,
    mount: () => mounted.forEach((work) => work()),
    reads: () => reads,
  };
}

test("no ad placement becomes eligible until the admin policy is known, and disabling removes eligibility reactively", () => {
  const state = visibility();
  assert.equal(state.canShowAds.value, false);
  state.loaded.value = true;
  assert.equal(state.canShowAds.value, true);
  state.disabled.value = ["ads:sitewide"];
  assert.equal(state.canShowAds.value, false);
  state.disabled.value = [];
  assert.equal(state.canShowAds.value, true);
  state.user.value = { name: "Kakada Ngen" };
  assert.equal(state.canShowAds.value, false);
  state.user.value = null;
  state.route.meta.blankCanvas = true;
  assert.equal(state.canShowAds.value, false);
  state.route.meta.blankCanvas = false;
  state.sourcePath.value = "/u/example";
  assert.equal(state.canShowAds.value, false);
});

test("ad policy bootstrap uses availability once and does not add API reads to local-only pages", () => {
  const state = visibility();
  state.mount();
  assert.equal(state.reads(), 1);
  const local = visibility();
  local.route.meta.localOnly = true;
  local.mount();
  assert.equal(local.reads(), 0);
  const hydrated = visibility();
  hydrated.loaded.value = true;
  hydrated.mount();
  assert.equal(hydrated.reads(), 0);
});

test("the admin proxy forwards the exact ad setting with verified auth and rejects other ad keys", async () => {
  let key = "ads:sitewide",
    authCalls = 0;
  const forwarded: any[][] = [];
  const source = readFileSync(
    new URL(
      "../server/api/feature-availability/admin/[key].put.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "defineEventHandler", code)(
    (name: string) => {
      if (name === "h3")
        return {
          getRouterParam: () => key,
          setResponseHeader() {},
          createError: (value: unknown) => value,
          proxyRequest: (...args: any[]) => {
            forwarded.push(args);
          },
        };
      if (name === "../../../utils/auth")
        return {
          apiBaseUrl: () => "https://api.example.test",
          getFreshAccessToken: async () => {
            authCalls++;
            return "dummy-access";
          },
        };
      throw new Error(name);
    },
    module,
    module.exports,
    (handler: unknown) => handler,
  );
  await module.exports.default({});
  assert.equal(authCalls, 1);
  assert.equal(
    forwarded[0][1],
    "https://api.example.test/feature-availability/admin/ads%3Asitewide",
  );
  assert.deepEqual(forwarded[0][2].headers, {
    Authorization: "Bearer dummy-access",
    Cookie: "",
  });
  key = "ads:arbitrary";
  await assert.rejects(
    module.exports.default({}),
    (error: any) => error.statusCode === 404,
  );
  assert.equal(authCalls, 1);
  assert.equal(forwarded.length, 1);
});

test("the app rechecks ad policy on focus and polling, reloads only after revocation, and cleans up", async () => {
  const filename = new URL("../app/app.vue", import.meta.url).pathname;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const code = ts.transpileModule(
    compileScript(descriptor, { id: "app-ad-policy" }).content,
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  const allowed = vue.ref(true),
    enabled = vue.ref(true);
  const route = vue.reactive({ path: "/food", meta: { localOnly: false } });
  let reads = 0,
    reloads = 0,
    now = 10000,
    cleared = 0;
  let tick!: () => void;
  const mounted: Array<() => void> = [],
    unmounted: Array<() => void> = [];
  const focusListeners = new Set<() => void>(),
    visibilityListeners = new Set<() => void>();
  const browser = {
    location: {
      reload: () => {
        reloads++;
      },
    },
    addEventListener: (_: string, callback: () => void) =>
      focusListeners.add(callback),
    removeEventListener: (_: string, callback: () => void) =>
      focusListeners.delete(callback),
  };
  const document = {
    visibilityState: "visible",
    addEventListener: (_: string, callback: () => void) =>
      visibilityListeners.add(callback),
    removeEventListener: (_: string, callback: () => void) =>
      visibilityListeners.delete(callback),
  };
  const globals = {
    useLanguage: () => ({
      copy: vue.ref({ metaTitle: "Food", metaDescription: "Food" }),
      isKhmer: vue.ref(false),
    }),
    useColorMode() {},
    useRoute: () => route,
    useProductDomain: () => ({
      config: { mainOrigin: "https://chlatwork.com", canonical: [] },
      canonical: vue.ref("https://chlatwork.com/food"),
      sourcePath: vue.ref("/food"),
      context: { kind: "main" },
    }),
    useAdVisibility: () => ({ canShowAds: allowed, adsEnabled: enabled }),
    useFeatureAvailability: () => ({
      refresh: async () => {
        reads++;
      },
    }),
    useAuth: () => ({ user: vue.ref(null), isReady: vue.ref(true) }),
    onMounted: (work: () => void) => mounted.push(work),
    onBeforeUnmount: (work: () => void) => unmounted.push(work),
    computed: vue.computed,
    watch: vue.watch,
    useSeoMeta() {},
    useHead() {},
    window: browser,
    document,
    Date: { now: () => now },
    setInterval: (work: () => void, delay: number) => {
      assert.equal(delay, 60000);
      tick = work;
      return 7;
    },
    clearInterval: (timer: number) => {
      cleared = timer;
    },
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name: string) => {
      if (name === "vue") return vue;
      if (name === "~/lib/ad-visibility") return { canShowAdsForUser };
      if (name === "~/data/site-routes")
        return { getPublisherRobots: () => "index, follow" };
      if (name === "@vercel/analytics/nuxt") return { Analytics: {} };
      throw new Error(name);
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  const scope = vue.effectScope();
  try {
    scope.run(() => {
      module.exports.default.setup({}, { expose() {} });
      mounted.forEach((work) => work());
    });
    focusListeners.forEach((work) => work());
    visibilityListeners.forEach((work) => work());
    assert.equal(
      reads,
      1,
      "focus and visibility events share a short throttle",
    );
    now = 80000;
    route.meta.localOnly = true;
    tick();
    assert.equal(reads, 1, "local-only tools do not poll the API");
    now = 90000;
    route.meta.localOnly = false;
    document.visibilityState = "hidden";
    tick();
    assert.equal(reads, 1, "background tabs do not poll");
    now = 100000;
    document.visibilityState = "visible";
    tick();
    assert.equal(reads, 2);
    allowed.value = false;
    await vue.nextTick();
    assert.equal(
      reloads,
      0,
      "ordinary route exclusions must not reload the tool",
    );
    allowed.value = true;
    await vue.nextTick();
    enabled.value = false;
    allowed.value = false;
    await vue.nextTick();
    assert.equal(
      reloads,
      1,
      "disabling clears provider content injected outside Vue",
    );
    unmounted.forEach((work) => work());
    assert.equal(cleared, 7);
    assert.equal(focusListeners.size, 0);
    assert.equal(visibilityListeners.size, 0);
  } finally {
    scope.stop();
  }
});
