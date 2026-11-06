import { createI18nStub } from "./helpers/i18n-stubs.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { renderToString } from "vue/server-renderer";
import { compileStyle, compileTemplate, parse } from "@vue/compiler-sfc";
import postcss from "postcss";
import ts from "../api/node_modules/typescript/lib/typescript.js";

async function renderShell(path: string, canShowAds: boolean) {
  const filename = "app/app.vue";
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const compiled = compileTemplate({ source: descriptor.template!.content, filename, id: "app-shell-test" });
  assert.deepEqual(compiled.errors, []);
  const module = { exports: {} as any };
  const code = ts.transpileModule(compiled.code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)(() => vue, module, module.exports);
  const context = { route: { path, meta: {} }, canShowAds, isKhmer: false, t: createI18nStub().t };
  const app = vue.createSSRApp({ render: () => module.exports.render(context, []) });
  for (const name of ["Analytics", "AdsDesktopAd", "AdsSmartLinkAd", "CookieConsent"]) app.component(name, () => null);
  app.component("AdsBannerAd", () => vue.h("div", { class: "test-banner" }, "Advertisement"));
  app.component("NuxtLayout", { setup: (_props, { slots }) => () => vue.h("div", { class: "account-layout" }, slots.default?.()) });
  app.component("NuxtPage", () => vue.h("main", "Account content"));
  return renderToString(app);
}

test("Account viewport scope is applied with or without ads without changing the ad policy", async () => {
  const withAds = await renderShell("/account", true);
  const withoutAds = await renderShell("/account", false);
  assert.match(withAds, /data-account-workspace/);
  assert.match(withoutAds, /data-account-workspace/);
  assert.match(withAds, /Advertisement/);
  assert.doesNotMatch(withoutAds, /Advertisement/);
  assert.doesNotMatch(await renderShell("/tools", true), /data-account-workspace/);
});

test("compiled desktop shell gives the Account layout remaining height beneath its banner", () => {
  const filename = "app/app.vue";
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  assert.ok(descriptor.styles.length, "the parent shell must own desktop Account viewport containment");
  const style = descriptor.styles[0];
  const compiled = compileStyle({ source: style.content, filename, id: "data-v-shell", scoped: true });
  assert.deepEqual(compiled.errors, []);
  const layoutRules: string[] = [];
  postcss.parse(compiled.code).walkRules((rule) => {
    if (rule.selector.includes(".account-layout")) {
      assert.match(rule.selector, /data-account-workspace/);
      rule.walkDecls((decl) => { if (decl.prop === "height") layoutRules.push(decl.value); });
    }
  });
  assert.ok(layoutRules.includes("auto"), "a nested 100dvh layout would add the banner height to the page");
});
