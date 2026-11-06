import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { MOMENT_COPY } from "../app/data/moment-locales.ts";

function createLanguage(path: string, initialLocale: "en" | "km", lang?: string) {
  const route = vue.reactive({ path, query: {} as Record<string, string> });
  if (lang) route.query.lang = lang;
  const appLocale = vue.ref(initialLocale);
  const cookies = new Map<string, vue.Ref<string>>([["app-locale", appLocale]]);
  const globals = {
    ...vue,
    useRoute: () => route,
    useLanguage: () => ({ locale: appLocale, isKhmer: vue.computed(() => appLocale.value === "km") }),
    useCookie: (name: string, options: any) => {
      if (!cookies.has(name)) cookies.set(name, vue.ref(options.default()));
      return cookies.get(name);
    },
    navigateTo: async ({ query }: any) => { route.query = query; },
  };
  const source = readFileSync("app/composables/useMomentLanguage.ts", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name: string) => name.includes("useLanguage") ? { useLanguage: globals.useLanguage } : { MOMENT_COPY }, module, module.exports, ...Object.values(globals),
  );
  const scope = vue.effectScope();
  const language = scope.run(() => module.exports.useMomentLanguage());
  return { language, appLocale, route, stop: () => scope.stop() };
}

test("Moment editor follows main language immediately and after switching", () => {
  const state = createLanguage("/moments/create", "km", "en");
  try {
    assert.equal(state.language.locale.value, "km");
    assert.equal(state.language.copy.value.creator.title, MOMENT_COPY.km.creator.title);
    state.appLocale.value = "en";
    assert.equal(state.language.locale.value, "en");
    state.appLocale.value = "km";
    assert.equal(state.language.isKhmer.value, true);
  } finally { state.stop(); }
});

test("public Moment links retain an explicit language independently of site preference", () => {
  const state = createLanguage("/m/birthday", "km", "en");
  try {
    assert.equal(state.language.locale.value, "en");
    state.route.query.lang = "km";
    assert.equal(state.language.locale.value, "km");
  } finally { state.stop(); }
});

test("public language controls and generated links keep both language choices explicit", async () => {
  const state = createLanguage("/m/birthday", "km", "km");
  try {
    await state.language.setMomentLocale("en");
    assert.equal(state.language.locale.value, "en");
    assert.match(state.language.localizeMomentPath("/m/birthday?preview=1#gift"), /[?&]lang=en(?:&|#|$)/);
    assert.ok(state.language.localizeMomentPath("/m/birthday?preview=1#gift").endsWith("#gift"));
  } finally { state.stop(); }
});
