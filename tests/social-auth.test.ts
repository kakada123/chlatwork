import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { renderToString } from "vue/server-renderer";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as i18n from "../app/lib/i18n.ts";
import { createI18nStub } from "./helpers/i18n-stubs.ts";

function socialAuth(locale: "en" | "km", configured = true) {
  const transpile = (source: string) => ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const languageModule = { exports: {} as any };
  const language = vue.ref(locale);
  // Keep the composable's real return contract; only Nuxt's cookie and route context are supplied.
  new Function("require", "module", "exports", "computed", "useRoute", "useCookie",
    transpile(readFileSync("app/composables/useLanguage.ts", "utf8")),
  )(() => i18n, languageModule, languageModule.exports, vue.computed,
    () => ({ path: "/login" }), () => language);

  const filename = "app/components/auth/SocialAuthButtons.vue";
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const script = compileScript(descriptor, { id: "social-auth-test", inlineTemplate: true });
  const dependencies: Record<string, unknown> = {
    vue,
    "~/composables/useLanguage": languageModule.exports,
    "~/composables/useAppI18n": { useAppI18n: createI18nStub },
  };
  const globals = {
    ...vue,
    useRuntimeConfig: () => ({ public: {
      googleClientId: configured ? "dummy-google-client" : "",
      telegramClientId: configured ? "dummy-telegram-client" : "",
    } }),
    useAuth: () => ({}),
    onMounted() {},
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), transpile(script.content))(
    (name: string) => {
      assert.ok(name in dependencies, name);
      return dependencies[name];
    }, module, module.exports, ...Object.values(globals),
  );
  return module.exports.default;
}

test("login controls render with the shared language preference and no locale override", async () => {
  for (const [locale, label] of [["en", "Continue with Telegram"], ["km", "បន្តជាមួយ Telegram"]] as const) {
    const html = await renderToString(vue.createSSRApp(socialAuth(locale)));
    assert.match(html, new RegExp(`<button[^>]*>${label}</button>`));
    assert.doesNotMatch(html, / disabled/);
  }
});

test("unconfigured providers render explanations instead of an empty login card", async () => {
  const html = await renderToString(vue.createSSRApp(socialAuth("en", false)));
  assert.match(html, /Google login is not configured/);
  assert.match(html, /Telegram login is not configured/);
  assert.equal((html.match(/<button[^>]* disabled/g) ?? []).length, 2);
});

test("login dialogs can override the shared language preference", async () => {
  const html = await renderToString(vue.createSSRApp(socialAuth("en"), { locale: "km" }));
  assert.match(html, /បន្តជាមួយ Telegram/);
});
