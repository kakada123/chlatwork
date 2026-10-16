import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as display from "../app/lib/creator-credit-display.ts";

const profile = {
  userId: "owner",
  telegramId: "123",
  status: "PENDING",
  version: 0,
  balance: 0,
  creatorEnabled: true,
  chlatworkEnabled: true,
};
const details = {
  profile,
  memberships: [],
  audit: [],
  credits: null,
  qrUrl: null,
};

function harness(
  path: string,
  services: Record<string, unknown>,
  props: Record<string, unknown> = {},
) {
  const session = vue.ref<any>({ id: "admin", role: "ADMIN" });
  const mounted: (() => void)[] = [];
  const stops: (() => void)[] = [];
  const emitted: string[] = [];
  const filename = new URL(`../${path}`, import.meta.url).pathname;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const script = compileScript(descriptor, { id: path });
  const compiled = ts.transpileModule(script.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} as any };
  const globals = {
    ref: vue.ref,
    shallowRef: vue.shallowRef,
    reactive: vue.reactive,
    computed: vue.computed,
    watch: (...args: any[]) => {
      const stop = (vue.watch as any)(...args);
      stops.push(stop);
      return stop;
    },
    onMounted: (fn: () => void) => mounted.push(fn),
    onBeforeUnmount: () => {},
    useAuth: () => ({ user: session }),
    definePageMeta: () => {},
    useSeoMeta: () => {},
  };
  const requireMock = (name: string) => {
    if (name === "vue") return vue;
    if (name === "~/lib/creator-credit-display") return display;
    if (name.startsWith("~/services/")) return services;
    throw new Error(`Unexpected dependency ${name}`);
  };
  new Function(
    "require",
    "module",
    "exports",
    ...Object.keys(globals),
    compiled,
  )(requireMock, module, module.exports, ...Object.values(globals));
  const state = module.exports.default.setup(props, {
    expose() {},
    emit: (event: string) => emitted.push(event),
  });
  return {
    state,
    session,
    mounted,
    emitted,
    close: () => stops.forEach((stop) => stop()),
  };
}

test("approval review freezes intent and retries the same key after an ambiguous response", async () => {
  const calls: any[] = [];
  const page = harness(
    "app/components/admin/BotUserAccess.vue",
    {
      reviewBotUser: async (...args: any[]) => {
        calls.push(structuredClone(args));
        if (calls.length === 1) throw new Error("response lost");
      },
    },
    { details },
  );
  try {
    const state = page.state;
    state.state.status = "APPROVED";
    state.state.reason = "Approved after review";
    state.state.grant = 10;
    state.prepare();
    assert.equal(calls.length, 0);
    state.state.grant = 99;
    await state.confirm();
    await state.confirm();
    assert.deepEqual(calls[0], calls[1]);
    assert.equal(calls[0][1].startingCredits, 10);
    assert.equal(calls[0][1].expectedBalance, 0);
    assert.equal(page.emitted[0], "saved");
  } finally {
    page.close();
  }
});

test("an administrator losing access cannot confirm a prepared bot approval", async () => {
  let calls = 0;
  const page = harness(
    "app/components/admin/BotUserAccess.vue",
    {
      reviewBotUser: async () => calls++,
    },
    { details },
  );
  try {
    page.state.state.reason = "Approved after review";
    page.state.prepare();
    page.session.value = null;
    await page.state.confirm();
    assert.equal(calls, 0);
  } finally {
    page.close();
  }
});

test("a delayed user detail response cannot restore admin data after signing out", async () => {
  let finish!: (value: unknown) => void;
  const page = harness("app/pages/admin/bots.vue", {
    getBotUser: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  try {
    const running = page.state.select("owner");
    page.session.value = null;
    await vue.nextTick();
    finish(details);
    await running;
    assert.equal(page.state.details.value, null);
  } finally {
    page.close();
  }
});

test("all Bot Admin Vue scripts and templates compile", () => {
  for (const path of [
    "app/pages/admin/bots.vue",
    "app/components/admin/BotUserAccess.vue",
    "app/components/admin/BotUserCredits.vue",
    "app/components/admin/BotUserKhqr.vue",
  ]) {
    const { descriptor, errors } = parse(
      readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
      { filename: path },
    );
    assert.deepEqual(errors, []);
    const script = compileScript(descriptor, { id: path });
    const template = compileTemplate({
      id: path,
      filename: path,
      source: descriptor.template!.content,
      compilerOptions: {
        bindingMetadata: script.bindings,
        expressionPlugins: ["typescript"],
      },
    });
    assert.deepEqual(template.errors, []);
  }
});

test("Bot Admin proxy rejects unsupported routes and CSRF before authentication", async () => {
  const source = readFileSync(
    new URL("../server/api/admin/bots/[...path].ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  let authCalls = 0;
  const upstream: string[] = [];
  const module = { exports: {} as any };
  const h3 = {
    createError: (value: object) =>
      Object.assign(new Error("request rejected"), value),
    getMethod: (event: any) => event.method,
    getRouterParam: (event: any) => event.path,
    getHeader: (event: any) => event.header,
    getRequestURL: () => new URL("https://example.test/api/admin/bots/users"),
    setResponseHeader: () => {},
    proxyRequest: (_event: unknown, url: string) => upstream.push(url),
  };
  const requireMock = (name: string) =>
    name === "h3"
      ? h3
      : {
          apiBaseUrl: () => "https://api.example.test",
          getFreshAccessToken: async () => {
            authCalls++;
            return "dummy-token";
          },
        };
  new Function("require", "module", "exports", "defineEventHandler", compiled)(
    requireMock,
    module,
    module.exports,
    (handler: unknown) => handler,
  );
  const handler = module.exports.default;
  await assert.rejects(
    handler({
      method: "POST",
      path: "users/00000000-0000-4000-8000-000000000001/review",
    }),
    { statusCode: 403 },
  );
  await assert.rejects(handler({ method: "GET", path: "../analytics" }), {
    statusCode: 404,
  });
  assert.equal(authCalls, 0);
  await handler({ method: "GET", path: "users" });
  assert.equal(authCalls, 1);
  assert.equal(upstream.length, 1);
});

test("removing ADMIN role clears cached bot users even when the identity is unchanged", async () => {
  const page = harness("app/pages/admin/bots.vue", {});
  try {
    page.state.details.value = details;
    page.state.list.value = {
      items: [profile],
      total: 1,
      page: 1,
      pageSize: 20,
    };
    page.session.value = { id: "admin", role: "USER" };
    await vue.nextTick();
    assert.equal(page.state.details.value, null);
    assert.equal(page.state.list.value, null);
  } finally {
    page.close();
  }
});
