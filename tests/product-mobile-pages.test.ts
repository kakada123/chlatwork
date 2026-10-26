import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as navigation from "../app/lib/product-mobile-navigation.ts";
import * as profile from "../app/lib/link-profile.ts";
import * as domains from "../app/lib/product-domains.ts";

function component(path: string, globals: Record<string, unknown>, imports: Record<string, unknown> = {}) {
  const filename = new URL(`../${path}`, import.meta.url).pathname;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const script = compileScript(descriptor, { id: "mobile-page-test" });
  const code = ts.transpileModule(script.content.replaceAll("import.meta.client", "false"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const framework = { ...vue, withAsyncContext: (work: () => unknown) => [work(), () => {}] };
  const dependencies: Record<string, unknown> = {
    vue: framework,
    "lucide-vue-next": new Proxy({}, { get: () => ({}) }),
    "~/lib/product-mobile-navigation": navigation,
    "~/lib/link-profile": profile,
    "~/lib/product-domains": domains,
    "~/composables/useAuth": { getAuthErrorMessage: () => "Fixture error" },
    "~/lib/moment-image": {},
    "~/composables/useQuickExpense": { QUICK_EXPENSE_OPEN_EVENT: "expense-fixture", useQuickExpense: () => ({ enabled: vue.ref(true) }) },
    ...imports,
  };
  const bindings = {
    ref: vue.ref, computed: vue.computed, watch: vue.watch, toRaw: vue.toRaw, nextTick: vue.nextTick,
    onMounted() {}, onBeforeUnmount() {}, onBeforeRouteLeave() {}, definePageMeta() {}, useSeoMeta() {},
    ...globals,
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(bindings), code)(
    (name: string) => {
      if (dependencies[name]) return dependencies[name];
      if (name.endsWith(".vue") || name === "vuedraggable") return { __esModule: true, default: {} };
      throw new Error(`Unexpected mobile-page dependency: ${name}`);
    }, module, module.exports, ...Object.values(bindings),
  );
  return module.exports.default;
}

test("game Rules can reopen after the user collapses the current rules anchor", async () => {
  const route = vue.reactive({ path: "/kla-klok", hash: "#kla-klok-rules", query: {} });
  const mounted: (() => void)[] = [];
  const view = component("app/pages/tools/kla-klok.vue", {
    useProductDomain: () => ({ product: "games", canonical: vue.ref("https://games.chlatwork.com/kla-klok") }),
    useRoute: () => route,
    onMounted: (work: () => void) => mounted.push(work),
    navigateTo: async (target: any) => { route.hash = target.hash || ""; },
  });
  const scope = vue.effectScope();
  try {
    const page = scope.run(() => view.setup({}, { expose() {} }));
    mounted.forEach((work) => work());
    await vue.nextTick();
    assert.equal(page.mobileRulesOpen.value, true);
    await page.toggleMobileRules();
    assert.equal(page.mobileRulesOpen.value, false);
    assert.equal(route.hash, "");
    route.hash = "#kla-klok-rules";
    await vue.nextTick();
    assert.equal(page.mobileRulesOpen.value, true);
  } finally { scope.stop(); }
});

test("Link route changes reveal the requested section without discarding an edited draft", async () => {
  const route = vue.reactive({ path: "/account/link", fullPath: "/account/link", params: { section: "profile" } });
  const preview = vue.ref(false);
  const stops: (() => void)[] = [];
  const fixture = profile.createLinkProfile("Demo");
  const view = component("app/pages/account-link.vue", {
    useProductDomain: () => ({ product: "link", destination: (path: string) => `https://link.chlatwork.com${path}` }),
    useRoute: () => route,
    useState: () => preview,
    useAuth: () => ({ user: vue.ref({ name: "Demo" }) }),
    useFetch: async () => ({ data: vue.ref(fixture), error: vue.ref(null) }),
    watch: (...args: any[]) => { const stop = (vue.watch as any)(...args); stops.push(stop); return stop; },
  });
  try {
    const page = await view.setup({}, { expose() {} });
    page.draft.value.displayName = "Unsaved name";
    page.mobilePreviewOpen.value = true;
    route.params.section = "share";
    route.path = "/account/link/share";
    route.fullPath = route.path;
    await vue.nextTick();
    assert.equal(page.mobilePreviewOpen.value, false);
    assert.equal(page.draft.value.displayName, "Unsaved name");
  } finally { stops.forEach((stop) => stop()); }
});

test("reselecting Link Edit on the same URL closes preview without requiring a route change", () => {
  const preview = vue.ref(true);
  const route = { path: "/account/link", fullPath: "/account/link", hash: "" };
  const view = component("app/components/layout/ProductMobileNav.vue", {
    useProductDomain: () => ({ product: "link", config: { mainOrigin: "https://chlatwork.com" } }),
    useRoute: () => route,
    useState: () => preview,
    useLanguage: () => ({ isKhmer: vue.ref(false) }),
    useAuth: () => ({ user: vue.ref(null), isReady: vue.ref(true) }),
    useFeatureAvailability: () => ({ websiteEnabled: () => true }),
  });
  const scope = vue.effectScope();
  try {
    const page = scope.run(() => view.setup({}, { expose() {} }));
    page.focusDestination(navigation.getProductMobileNavigation("link").find((item) => item.key === "edit"));
    assert.equal(preview.value, false);
    assert.equal(route.fullPath, "/account/link");
  } finally { scope.stop(); }
});

test("other products retain opt-in quick expense access with authentication and feature gates", () => {
  for (const product of ["link", "moment", "draw", "games", "creator", "expense"]) {
    const enabled = vue.ref(true);
    const user = vue.ref<any>({ id: "fixture-user" });
    const ready = vue.ref(true);
    const available = vue.ref(true);
    let opened = 0;
    const view = component("app/components/layout/ProductNavigation.vue", {
      useProductDomain: () => ({ product, config: { mainOrigin: "https://chlatwork.com" } }),
      useRoute: () => ({ fullPath: "/" }),
      useState: () => vue.ref(null),
      useLanguage: () => ({ isKhmer: vue.ref(false) }),
      useMomentLanguage: () => ({ isKhmer: vue.ref(false) }),
      useColorMode: () => ({ isDark: vue.ref(false), toggleColorMode() {}, nextColorModeLabel: vue.ref("Dark") }),
      useAuth: () => ({ user, isReady: ready }),
      useFeatureAvailability: () => ({ websiteEnabled: () => available.value }),
    }, {
      "~/composables/useQuickExpense": { useQuickExpense: () => ({ enabled }), openQuickExpense: () => { opened++; } },
    });
    const scope = vue.effectScope();
    try {
      const page = scope.run(() => view.setup({}, { expose() {} }));
      const hasShortcut = !["creator", "expense"].includes(product);
      assert.equal(page.canQuickExpense.value, hasShortcut, product);
      page.openExpense();
      assert.equal(opened, hasShortcut ? 1 : 0);
      for (const setting of [enabled, ready, available]) {
        setting.value = false;
        assert.equal(page.canQuickExpense.value, false);
        page.openExpense();
        assert.equal(opened, hasShortcut ? 1 : 0);
        setting.value = true;
      }
      user.value = null;
      assert.equal(page.canQuickExpense.value, false);
      page.openExpense();
      assert.equal(opened, hasShortcut ? 1 : 0);
    } finally { scope.stop(); }
  }
});
