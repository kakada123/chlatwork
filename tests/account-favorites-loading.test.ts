import { createI18nStub } from "./helpers/i18n-stubs.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness({ server = false, hydratedLoading = "", authReady = true } = {}) {
  const source = readFileSync("app/composables/useAccountFavorites.ts", "utf8").replace(/import\.meta\.server/g, String(server));
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const app = {};
  const user = vue.ref<{ id: string } | null>({ id: "account-a" });
  const ready = vue.ref(authReady);
  const isKhmer = vue.ref(false);
  const states = new Map<string, any>();
  if (hydratedLoading) states.set("account-favorites-loading-user-id", vue.ref(hydratedLoading));
  const loads: ReturnType<typeof deferred<{ toolKeys: string[]; commandIds: string[] }>>[] = [];
  const writes: Array<{ path: string; body: any }> = [];
  const globals = {
    watch: vue.watch,
    computed: vue.computed,
    useLanguage: () => ({ isKhmer }),
    useNuxtApp: () => app,
    useAuth: () => ({ user, isReady: ready, fetchMe: async () => user.value }),
    useRoute: () => ({ fullPath: "/account" }),
    useState: (key: string, initial: () => unknown) => {
      if (!states.has(key)) states.set(key, vue.ref(initial()));
      return states.get(key);
    },
    $fetch: (path: string, options?: { method?: string; body: any }) => {
      assert.equal(path, "/api/favorites");
      if (options?.method === "PUT") {
        writes.push({ path, body: options.body });
        return Promise.resolve({ favorite: options.body.favorite });
      }
      const request = deferred<{ toolKeys: string[]; commandIds: string[] }>();
      loads.push(request);
      return request.promise;
    },
    navigateTo: async () => {},
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), compiled)(
    (name: string) => {
      if (name === "~/composables/useAppI18n") return { useAppI18n: () => createI18nStub(isKhmer) };
      if (name === "~/composables/useLanguage") return { useLanguage: globals.useLanguage };
      throw new Error(`Unexpected dependency ${name}`);
    }, module, module.exports, ...Object.values(globals),
  );
  const scope = vue.effectScope();
  return {
    create: () => scope.run(() => module.exports.useAccountFavorites()),
    loads, writes, user, ready, states, isKhmer,
    async flush() { await vue.nextTick(); await new Promise<void>((resolve) => setImmediate(resolve)); },
    stop: () => scope.stop(),
  };
}

test("SSR never starts a cookie-less favorites request or serializes its in-flight marker", () => {
  const h = harness({ server: true });
  try {
    const favorites = h.create();
    assert.equal(h.loads.length, 0);
    assert.equal(favorites.favoritesReady.value, false);
    assert.equal(h.states.get("account-favorites-loading-user-id")?.value ?? "", "");
  } finally { h.stop(); }
});

test("hydration recovers both favorite lists despite an old serialized loading flag", async () => {
  const h = harness({ hydratedLoading: "account-a" });
  try {
    const favorites = h.create();
    await h.flush();
    assert.equal(h.loads.length, 1);
    h.loads[0].resolve({ toolKeys: ["expense-tracker"], commandIds: ["git-status"] });
    await h.flush();
    assert.deepEqual(favorites.favoriteToolKeys.value, ["expense-tracker"]);
    assert.deepEqual(favorites.favoriteCommandIds.value, ["git-status"]);
    assert.equal(favorites.favoritesReady.value, true);
    assert.equal(favorites.favoriteError.value, "");
  } finally { h.stop(); }
});

test("a favorite click waits for the shared pending list read before saving", async () => {
  const h = harness();
  try {
    const tools = h.create();
    const commands = h.create();
    await h.flush();
    assert.equal(h.loads.length, 1, "all consumers should share one read in this app");
    const save = commands.setFavorite("COMMAND", "git-status", true);
    await h.flush();
    assert.equal(h.writes.length, 0);
    h.loads[0].resolve({ toolKeys: ["expense-tracker"], commandIds: [] });
    assert.equal(await save, true);
    assert.equal(h.writes.length, 1);
    assert.deepEqual(tools.favoriteToolKeys.value, ["expense-tracker"]);
    assert.deepEqual(commands.favoriteCommandIds.value, ["git-status"]);
  } finally { h.stop(); }
});

test("switching accounts cannot display or overwrite the new owner's favorites", async () => {
  const h = harness();
  try {
    const favorites = h.create();
    h.user.value = { id: "account-b" };
    await h.flush();
    assert.equal(h.loads.length, 2);
    h.loads[1].resolve({ toolKeys: ["qr-generator"], commandIds: ["docker-ps"] });
    await h.flush();
    h.loads[0].resolve({ toolKeys: ["private-account-a"], commandIds: ["private-command-a"] });
    await h.flush();
    assert.deepEqual(favorites.favoriteToolKeys.value, ["qr-generator"]);
    assert.deepEqual(favorites.favoriteCommandIds.value, ["docker-ps"]);
  } finally { h.stop(); }
});

test("failed loading can be retried without leaving the lists permanently pending", async () => {
  const h = harness();
  try {
    const favorites = h.create();
    h.loads[0].reject(new Error("Unavailable"));
    await h.flush();
    assert.equal(favorites.favoritesReady.value, true);
    assert.match(favorites.favoriteError.value, /could not be loaded/);
    const retry = favorites.loadFavorites();
    h.loads[1].resolve({ toolKeys: ["expense-tracker"], commandIds: [] });
    await retry;
    assert.deepEqual(favorites.favoriteToolKeys.value, ["expense-tracker"]);
    assert.equal(favorites.favoriteError.value, "");
  } finally { h.stop(); }
});

test("a main-site startup waits for authentication and then starts one favorites read", async () => {
  const h = harness({ authReady: false });
  try {
    const favorites = h.create();
    h.create();
    assert.equal(h.loads.length, 0);
    h.ready.value = true;
    await h.flush();
    assert.equal(h.loads.length, 1);
    h.loads[0].resolve({ toolKeys: ["expense-tracker"], commandIds: ["git-status"] });
    await h.flush();
    assert.equal(favorites.favoritesReady.value, true);
    assert.deepEqual(favorites.favoriteCommandIds.value, ["git-status"]);
  } finally { h.stop(); }
});

test("signing out and back into the same account ignores its older pending response", async () => {
  const h = harness();
  try {
    const favorites = h.create();
    h.user.value = null;
    await h.flush();
    h.user.value = { id: "account-a" };
    await h.flush();
    assert.equal(h.loads.length, 2);
    h.loads[1].resolve({ toolKeys: ["current"], commandIds: [] });
    await h.flush();
    h.loads[0].resolve({ toolKeys: ["old-session"], commandIds: [] });
    await h.flush();
    assert.deepEqual(favorites.favoriteToolKeys.value, ["current"]);
  } finally { h.stop(); }
});

test("an unrelated response becomes a load error rather than corrupting both favorite lists", async () => {
  const h = harness();
  try {
    const favorites = h.create();
    h.loads[0].resolve({ disabled: ["telegram:kla-klok"] } as never);
    await h.flush();
    assert.deepEqual(favorites.favoriteToolKeys.value, []);
    assert.deepEqual(favorites.favoriteCommandIds.value, []);
    assert.match(favorites.favoriteError.value, /could not be loaded/);
  } finally { h.stop(); }
});


test('an existing favorites error follows language changes without reloading account data', async () => {
  const fixture = harness();
  const favorites = fixture.create();
  try {
    fixture.loads[0].reject(new Error('offline'));
    await fixture.flush();
    assert.match(favorites.favoriteError.value, /could not be loaded/);
    fixture.isKhmer.value = true;
    assert.match(favorites.favoriteError.value, /មិនអាចផ្ទុក/);
    fixture.isKhmer.value = false;
    assert.match(favorites.favoriteError.value, /could not be loaded/);
    assert.equal(fixture.loads.length, 1);
  } finally { fixture.stop(); }
});
