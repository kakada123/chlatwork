import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ref } from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function compile(
  path: string,
  globals: Record<string, unknown>,
  require: (name: string) => unknown,
  server = false,
) {
  const source = readFileSync(
    new URL(path, import.meta.url),
    "utf8",
  ).replaceAll("import.meta.server", String(server));
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const module = { exports: {} as any };
  new Function(
    "require",
    "module",
    "exports",
    ...Object.keys(globals),
    compiled,
  )(require, module, module.exports, ...Object.values(globals));
  return module.exports;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("availability shares concurrent requests per app, retries failures, and keeps apps isolated", async () => {
  let app = {};
  const states = new WeakMap<object, Map<string, any>>();
  const requests: ReturnType<typeof deferred<{ disabled: string[] }>>[] = [];
  const { useFeatureAvailability } = compile(
    "../app/composables/useFeatureAvailability.ts",
    {
      useNuxtApp: () => app,
      useState(key: string, initial: () => unknown) {
        if (!states.has(app)) states.set(app, new Map());
        const state = states.get(app)!;
        if (!state.has(key)) state.set(key, ref(initial()));
        return state.get(key);
      },
      $fetch: () => {
        const request = deferred<{ disabled: string[] }>();
        requests.push(request);
        return request.promise;
      },
    },
    () => ({ CREATOR_FEATURE_TO_TOOL: {} }),
  );
  const first = useFeatureAvailability();
  const refresh = first.refresh();
  const shared = useFeatureAvailability().refresh();
  assert.equal(requests.length, 1);
  app = {};
  const other = useFeatureAvailability();
  const separate = other.refresh();
  assert.equal(requests.length, 2);
  requests[0].resolve({ disabled: ["website:expense"] });
  requests[1].resolve({ disabled: [] });
  await Promise.all([refresh, shared, separate]);
  assert.equal(first.websiteEnabled("expense"), false);
  assert.equal(other.websiteEnabled("expense"), true);
  assert.equal(first.loaded.value, true);
  const failed = other.refresh();
  requests[2].reject(new Error("offline"));
  await assert.rejects(failed, /offline/);
  const retry = other.refresh();
  assert.equal(requests.length, 4);
  requests[3].resolve({ disabled: ["website:expense"] });
  await retry;
  assert.equal(other.websiteEnabled("expense"), false);

  const outdated = other.refresh();
  const afterSave = other.refresh({ force: true });
  assert.equal(requests.length, 6);
  requests[4].resolve({ disabled: [] });
  let outdatedFinished = false;
  void outdated.then(() => {
    outdatedFinished = true;
  });
  await Promise.resolve();
  assert.equal(outdatedFinished, false);
  assert.equal(other.websiteEnabled("expense"), false);
  const sharedAfterSave = other.refresh();
  assert.equal(requests.length, 6);
  requests[5].resolve({ disabled: [] });
  await Promise.all([outdated, afterSave, sharedAfterSave]);
  assert.equal(other.websiteEnabled("expense"), true);
});

function middleware(availability: any, isHydrating = false, server = false) {
  return compile(
    "../app/middleware/availability.global.ts",
    {
      defineNuxtRouteMiddleware: (handler: unknown) => handler,
      useNuxtApp: () => ({ isHydrating }),
      abortNavigation: (error: Error) => error,
      createError: (details: any) =>
        Object.assign(new Error(details.statusMessage), details),
    },
    (name) => {
      if (name === "~/lib/tool-registry")
        return {
          TOOLS: [{ route: "/expense", key: "expense", enabled: true }],
        };
      if (name === "~/data/creator-tools")
        return {
          getCreatorToolByRoute: (path: string) =>
            path === "/creator/create/post" ? { id: "post" } : undefined,
        };
      return { useFeatureAvailability: () => availability };
    },
    server,
  ).default;
}

test("workspace navigation does not wait for public availability", async () => {
  for (const path of [
    "/account",
    "/admin",
    "/admin/tools",
    "/bot/groups",
    "/bot/groups/123",
    "/moments",
    "/creator",
  ]) {
    const pending = deferred<void>();
    let calls = 0;
    const run = middleware({
      loaded: ref(false),
      refresh: () => {
        calls++;
        return pending.promise;
      },
    });
    assert.equal(await run({ path }), undefined);
    assert.equal(calls, 1);
    // Background failures are handled without an unhandled rejection.
    pending.reject(new Error("offline"));
    await Promise.resolve();
  }
});

test("gated tools still wait for fresh availability and fail closed", async () => {
  for (const path of [
    "/expense",
    "/account/link/edit",
    "/developer-commands",
    "/creator/create/post",
  ]) {
    const pending = deferred<void>();
    let finished = false;
    const run = middleware({
      loaded: ref(true),
      refresh: () => pending.promise,
      websiteEnabled: () => false,
      creatorEnabled: () => false,
    });
    const navigation = run({ path }).then((result: any) => {
      finished = true;
      return result;
    });
    await Promise.resolve();
    assert.equal(finished, false);
    pending.resolve();
    assert.equal((await navigation).statusCode, 503);
  }
  const run = middleware({
    loaded: ref(false),
    refresh: () => Promise.reject(new Error("offline")),
  });
  assert.equal((await run({ path: "/expense" })).statusCode, 503);
});

test("hydration reuses the server availability snapshot but later navigation refreshes", async () => {
  let calls = 0;
  const availability = {
    loaded: ref(true),
    refresh: async () => {
      calls++;
    },
    websiteEnabled: () => true,
  };
  await middleware(availability, true)({ path: "/expense" });
  assert.equal(calls, 0);
  await middleware(availability)({ path: "/expense" });
  assert.equal(calls, 1);
  availability.websiteEnabled = () => false;
  assert.equal(
    (await middleware(availability, true)({ path: "/expense" })).statusCode,
    503,
  );
});

test("SSR skips irrelevant availability reads but keeps public directory snapshots", async () => {
  let calls = 0;
  const run = middleware(
    {
      loaded: ref(false),
      refresh: async () => {
        calls++;
      },
    },
    false,
    true,
  );
  await run({ path: "/account" });
  assert.equal(calls, 0);
  await run({ path: "/tools" });
  assert.equal(calls, 1);
});
