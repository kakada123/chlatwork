import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function harness() {
  const route = vue.reactive({ params: { id: "group-a" } });
  const state = vue.ref("ready");
  const epoch = vue.ref(1);
  const requests = {
    details: [] as ReturnType<typeof deferred<any>>[],
    list: [] as ReturnType<typeof deferred<any>>[],
    activity: [] as ReturnType<typeof deferred<any>>[],
    khqr: [] as ReturnType<typeof deferred<any>>[],
    history: [] as ReturnType<typeof deferred<any>>[],
  };
  const api = Object.fromEntries(
    Object.entries(requests).map(([name, queue]) => [
      name,
      () => {
        const request = deferred<any>();
        queue.push(request);
        return request.promise;
      },
    ]),
  );
  const source = readFileSync(
    new URL("../app/pages/bot/groups/[id].vue", import.meta.url),
    "utf8",
  ).match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1];
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  let unmount = () => {};
  const globals = {
    ref: vue.ref,
    shallowRef: vue.shallowRef,
    watch: vue.watch,
    definePageMeta: () => {},
    useRoute: () => route,
    useBotSession: () => ({
      state,
      epoch,
      bot: vue.ref("CHLATWORK"),
      clear: () => {
        state.value = "idle";
      },
    }),
    onBeforeUnmount: (callback: () => void) => {
      unmount = callback;
    },
  };
  const scope = vue.effectScope();
  const page = scope.run(() =>
    new Function(
      "require",
      "exports",
      ...Object.keys(globals),
      `${compiled}\nreturn { group, groups, loading, error, load };`,
    )(() => ({ groupApi: api }), {}, ...Object.values(globals)),
  );
  return {
    page,
    requests,
    route,
    epoch,
    dispose() {
      unmount();
      scope.stop();
    },
  };
}

test("verified group details render while the group switcher and activity are pending", async () => {
  const h = harness();
  try {
    h.requests.details[0].resolve({ workspaceId: "group-a", title: "Lunch" });
    await Promise.resolve();
    assert.equal(h.page.group.value.title, "Lunch");
    assert.equal(h.page.loading.value, true);
    h.requests.list[0].resolve({ items: [{ workspaceId: "group-a" }] });
    h.requests.activity[0].resolve({ items: [] });
    h.requests.khqr[0].resolve({ members: [] });
    h.requests.history[0].resolve({ items: [] });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(h.page.loading.value, false);
    assert.equal(h.page.groups.value.length, 1);
  } finally {
    h.dispose();
  }
});

test("a late details response cannot restore a group after a permission failure", async () => {
  const h = harness();
  try {
    h.requests.activity[0].reject({ statusCode: 403 });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.match(h.page.error.value, /permissions/);
    h.requests.details[0].resolve({ workspaceId: "group-a" });
    await Promise.resolve();
    assert.equal(h.page.group.value, null);
  } finally {
    h.dispose();
  }
});

test("route changes and unmounts discard pending details from an earlier group", async () => {
  const h = harness();
  h.route.params.id = "group-b";
  await vue.nextTick();
  h.requests.details[0].resolve({ workspaceId: "group-a" });
  await Promise.resolve();
  assert.equal(h.page.group.value, null);
  h.requests.details[1].resolve({ workspaceId: "group-b" });
  await Promise.resolve();
  assert.equal(h.page.group.value.workspaceId, "group-b");
  const refresh = h.page.load();
  h.dispose();
  h.requests.details[2].resolve({ workspaceId: "group-b" });
  await Promise.resolve();
  assert.equal(h.page.group.value, null);
  h.requests.list[2].resolve({ items: [] });
  h.requests.activity[2].resolve({ items: [] });
  h.requests.khqr[2].resolve({ members: [] });
  h.requests.history[2].resolve({ items: [] });
  await refresh;
  assert.equal(h.page.group.value, null);
});
