import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as vue from "vue";
import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function runModule(
  source: string,
  dependencies: Record<string, unknown>,
  globals: Record<string, unknown> = {},
) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), output)(
    (name: string) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import ${name}`);
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  return module.exports;
}
const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

test("group proxy rejects traversal, unsupported actions and form mutations before auth", async () => {
  let auth = 0;
  const calls: any[] = [];
  const h3 = {
    createError: (data: object) => Object.assign(new Error("denied"), data),
    getMethod: (e: any) => e.method,
    getRouterParam: (e: any) => e.path,
    getHeader: (e: any, name: string) => e.headers?.[name],
    getRequestURL: () =>
      new URL("https://example.test/api/bot/groups?bot=CHLATWORK"),
    setResponseHeader: () => {},
    proxyRequest: (...args: any[]) => calls.push(args),
  };
  const handler = runModule(
    source("server/api/bot/groups/[...path].ts"),
    {
      h3,
      "../../../utils/auth": {
        apiBaseUrl: () => "https://api.test",
        getFreshAccessToken: async () => {
          auth++;
          return "dummy";
        },
      },
    },
    { defineEventHandler: (fn: unknown) => fn },
  ).default;
  for (const e of [
    { method: "GET", path: "../admin" },
    { method: "POST", path: "session" },
    { method: "DELETE", path: "00000000-0000-4000-8000-000000000001" },
  ])
    await assert.rejects(handler(e), { statusCode: 404 });
  await assert.rejects(handler({ method: "POST", path: "connections" }), {
    statusCode: 403,
  });
  assert.equal(auth, 0);
  await handler({ method: "GET", path: "" });
  assert.equal(calls[0][1], "https://api.test/bot/groups?bot=CHLATWORK");
  assert.equal(calls[0][2].headers.Cookie, "");
  await handler({
    method: "POST",
    path: "connections",
    headers: { "x-group-workspace": "1" },
  });
  assert.equal(auth, 2);
});

test("Mini App exchanges current Telegram initData and ignores a late login after clearing", async () => {
  const states = new Map<string, any>();
  const user = vue.ref<any>(null);
  const login = deferred<any>();
  let sessionCalls = 0;
  const auth = {
    user,
    loginWithTelegram: async (_data: string, accept: () => boolean) => {
      const u = await login.promise;
      if (accept()) user.value = u;
      return u;
    },
  };
  const globals = {
    useAuth: () => auth,
    useState: (key: string, init: () => unknown) => {
      if (!states.has(key)) states.set(key, vue.ref(init()));
      return states.get(key);
    },
    computed: vue.computed,
    watch: vue.watch,
    getTelegramMiniApp: () => ({ initData: "signed-current" }),
  };
  const mod = runModule(
    source("app/composables/useBotSession.ts"),
    {
      "~/services/group-workspaces.service": {
        groupApi: {
          session: async () => {
            sessionCalls++;
            return {};
          },
        },
      },
    },
    globals,
  );
  const session = mod.useBotSession();
  const pending = session.initialize("CHLATWORK");
  session.clear();
  login.resolve({ id: "old" });
  await pending;
  assert.equal(sessionCalls, 0);
  assert.equal(session.session.value, null);
  assert.equal(user.value, null);
});

function pageHarness(api: object) {
  const filename = "app/pages/bot/groups/[id].vue";
  const { descriptor } = parse(source(filename));
  const script = compileScript(descriptor, { id: filename });
  const session = {
    state: vue.ref("ready"),
    bot: vue.ref("CHLATWORK"),
    epoch: vue.ref(1),
    clear: () => {
      session.state.value = "error";
      session.epoch.value++;
    },
  };
  const route = vue.reactive({ params: { id: "A" } });
  const stops: Array<() => void> = [];
  const globals = {
    ...vue,
    useRoute: () => route,
    useBotSession: () => session,
    definePageMeta: () => {},
    onBeforeUnmount: () => {},
    watch: (...args: any[]) => {
      const stop = (vue.watch as any)(...args);
      stops.push(stop);
      return stop;
    },
  };
  const page = runModule(
    script.content,
    { vue, "~/services/group-workspaces.service": { groupApi: api } },
    globals,
  ).default.setup({}, { expose() {} });
  return { page, session, route, close: () => stops.forEach((stop) => stop()) };
}

test("late group A data cannot restore A after switching to B or losing access", async () => {
  const a = deferred<any>();
  const b = deferred<any>();
  const api = {
    details: (id: string) => (id === "A" ? a.promise : b.promise),
    list: async () => ({ items: [] }),
    activity: async () => ({ items: [] }),
    khqr: async () => ({ items: [] }),
    history: async () => ({ items: [] }),
  };
  const h = pageHarness(api);
  try {
    h.route.params.id = "B";
    await vue.nextTick();
    b.resolve({ workspaceId: "B", title: "B" });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(h.page.group.value.workspaceId, "B");
    a.resolve({ workspaceId: "A", title: "A" });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(h.page.group.value.workspaceId, "B");
    h.session.clear();
    await vue.nextTick();
    assert.equal(h.page.group.value, null);
    assert.equal(h.page.directory.value, null);
  } finally {
    h.close();
  }
});

test("all Mini App and oversight Vue scripts and templates compile", () => {
  const paths = [
    "app/layouts/bot.vue",
    "app/pages/bot/groups/index.vue",
    "app/pages/bot/groups/[id].vue",
    "app/pages/bot/account.vue",
    "app/components/admin/BotGroupWorkspaces.vue",
    ...[
      "GroupSwitcher",
      "GroupOverview",
      "GroupVoteSettings",
      "GroupFeatureSettings",
      "GroupKhqrDirectory",
      "GroupActivity",
      "GroupConnect",
    ].map((name) => `app/components/bot/${name}.vue`),
  ];
  for (const filename of paths) {
    const { descriptor, errors } = parse(source(filename), { filename });
    assert.deepEqual(errors, [], filename);
    compileScript(descriptor, { id: filename });
    const result = compileTemplate({
      source: descriptor.template?.content ?? "",
      filename,
      id: filename,
    });
    assert.deepEqual(result.errors, [], filename);
  }
});

test("an upload keeps its original workspace and cannot emit into a replacement group page", async () => {
  const filename = "app/components/bot/GroupVoteSettings.vue";
  const { descriptor } = parse(source(filename));
  const script = compileScript(descriptor, { id: filename });
  const upload = deferred<any>();
  const calls: any[] = [];
  const emitted: string[] = [];
  const dispose: Array<() => void> = [];
  const props = vue.reactive({
    group: {
      workspaceId: "A",
      workspaceVersion: 3,
      bot: "CHLATWORK",
      title: "A",
      poll: null,
    },
  });
  const globals = {
    ...vue,
    useBotSession: () => ({ state: vue.ref("ready"), epoch: vue.ref(1) }),
    onBeforeUnmount: (fn: () => void) => dispose.push(fn),
    window: { confirm: () => true },
  };
  const state = runModule(
    script.content,
    {
      vue,
      "~/services/group-workspaces.service": {
        groupApi: {
          upload: (...args: any[]) => {
            calls.push(args);
            return upload.promise;
          },
        },
      },
    },
    globals,
  ).default.setup(props, {
    expose() {},
    emit: (event: string) => emitted.push(event),
  });
  const pending = state.upload(
    { target: { files: [{ size: 12 }], value: "selected" } },
    "option-1",
  );
  dispose.forEach((fn) => fn());
  props.group = {
    ...props.group,
    workspaceId: "B",
    workspaceVersion: 4,
    title: "B",
  };
  upload.resolve({ updated: true });
  await pending;
  assert.equal(calls[0][0].workspaceId, "A");
  assert.equal(calls[0][0].workspaceVersion, 3);
  assert.deepEqual(emitted, []);
});
