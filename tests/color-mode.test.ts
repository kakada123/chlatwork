import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { computed, ref } from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function browser(stored: string | null, systemDark: boolean, blocked = false) {
  const classes = new Set<string>();
  const root = { classList: { toggle(name: string, enabled: boolean) { if (enabled) classes.add(name); else classes.delete(name); } }, dataset: {} as Record<string, string>, style: {} as Record<string, string> };
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const media = { matches: systemDark, addEventListener: (_type: string, callback: any) => listeners.add(callback), removeEventListener: (_type: string, callback: any) => listeners.delete(callback) };
  const storage = { getItem() { if (blocked) throw new Error("denied"); return stored; }, setItem(_key: string, value: string) { if (blocked) throw new Error("denied"); stored = value; } };
  let themeColor = "";
  return {
    root, classes, listeners, media,
    window: { localStorage: storage, matchMedia: () => media, setTimeout: () => 1, clearTimeout() {} },
    document: { documentElement: root, querySelector: () => ({ setAttribute(_name: string, value: string) { themeColor = value; } }) },
    themeColor: () => themeColor,
    stored: () => stored,
  };
}

function composable(client: ReturnType<typeof browser>, server = false) {
  const source = readFileSync(new URL("../app/composables/useColorMode.ts", import.meta.url), "utf8").replaceAll("import.meta.client", String(!server));
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mounted: (() => void)[] = [];
  const unmounted: (() => void)[] = [];
  const bindings = { window: client.window, document: client.document, computed, useState: (_key: string, initial: () => unknown) => ref(initial()), onMounted: (fn: () => void) => mounted.push(fn), onBeforeUnmount: (fn: () => void) => unmounted.push(fn) };
  const module = { exports: {} as any };
  new Function("module", "exports", ...Object.keys(bindings), code)(module, module.exports, ...Object.values(bindings));
  return { state: module.exports.useColorMode(), mount: () => mounted.forEach((fn) => fn()), unmount: () => unmounted.forEach((fn) => fn()) };
}

test("first paint follows the system, including blocked storage, while valid saved choices win", () => {
  const config = readFileSync(new URL("../nuxt.config.ts", import.meta.url), "utf8");
  const script = config.match(/const colorModeScript = `([\s\S]*?)`;/)![1]!;
  for (const [saved, systemDark, blocked, expected] of [
    [null, true, false, "dark"], [null, false, false, "light"],
    ["light", true, false, "light"], ["dark", false, false, "dark"],
    ["invalid", true, false, "dark"], [null, true, true, "dark"],
  ] as const) {
    const client = browser(saved, systemDark, blocked);
    runInNewContext(script, { window: client.window, document: client.document });
    assert.equal(client.root.dataset.theme, expected, JSON.stringify([saved, systemDark, blocked]));
    assert.equal(client.classes.has("dark"), expected === "dark");
    assert.equal(client.root.style.colorScheme, expected);
    assert.equal(client.themeColor(), expected === "dark" ? "#1c1c1e" : "#f9fafb");
    assert.equal(client.stored(), saved, "Automatic defaults must never become saved manual preferences");
  }
});

test("mounted theme follows the system, reacts to changes, and removes its listener", () => {
  const client = browser(null, true);
  const app = composable(client);
  app.mount();
  assert.equal(app.state.colorMode.value, "dark");
  client.listeners.forEach((fn) => fn({ matches: false }));
  assert.equal(app.state.colorMode.value, "light");
  assert.equal(client.stored(), null);
  app.unmount();
  assert.equal(client.listeners.size, 0);
});

test("manual preferences override system changes and persist across initialization", () => {
  const client = browser("light", true);
  const app = composable(client);
  app.mount();
  assert.equal(app.state.colorMode.value, "light");
  client.listeners.forEach((fn) => fn({ matches: true }));
  assert.equal(app.state.colorMode.value, "light");
  app.state.toggleColorMode();
  assert.equal(client.stored(), "dark");
  client.listeners.forEach((fn) => fn({ matches: false }));
  assert.equal(app.state.colorMode.value, "dark");
  app.unmount();
});

test("storage denial still permits a system-derived mounted default and SSR remains stable", () => {
  const client = browser(null, true, true);
  const app = composable(client);
  app.mount();
  assert.equal(app.state.colorMode.value, "dark");
  app.unmount();
  const ssr = composable(client, true);
  assert.equal(ssr.state.colorMode.value, "light", "SSR must not inspect a visitor's browser APIs");
  ssr.unmount();
});
