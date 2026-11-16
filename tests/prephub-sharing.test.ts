import assert from "node:assert/strict";
import test from "node:test";
import * as routes from "../server/utils/prephub-routes.ts";
import {
  productRouteRecords,
  productPath,
  legacyPath,
} from "../app/lib/product-domains.ts";
const id = "11111111-1111-4111-8111-111111111111",
  token = "a".repeat(43);
test("sharing management remains in the authenticated proxy while public access only allows exact GET routes", () => {
  for (const method of ["GET", "PUT", "DELETE"])
    assert.equal(
      routes.allowedPrepHubRoute(`subjects/${id}/sharing`, method),
      true,
    );
  const allowed = (routes as any).allowedPrepHubPublicRoute;
  assert.equal(typeof allowed, "function");
  for (const path of [token, `${token}/resources/${id}`]) {
    assert.equal(allowed(path, "GET"), true);
    for (const method of ["POST", "PATCH", "PUT", "DELETE"])
      assert.equal(allowed(path, method), false);
    assert.equal(routes.allowedPrepHubRoute(`public/${path}`, "GET"), false);
  }
  for (const path of [
    "../subjects",
    id,
    `${token}/resources/foreign`,
    `${token}/resources/${id}/extra`,
    `${token}%2fresources/${id}`,
  ])
    assert.equal(allowed(path, "GET"), false);
});
test("public links work at the PrepHub product root and preserve section anchors", () => {
  assert.equal(
    productPath("prep", `/prephub/shared/${token}`),
    `/shared/${token}`,
  );
  assert.equal(
    legacyPath("prep", `/shared/${token}`),
    `/prephub/shared/${token}`,
  );
  const [route] = productRouteRecords(
    [{ path: "/prephub/shared/:token", meta: { prepPublicShare: true } }],
    "prep",
  );
  assert.equal(route.path, "/shared/:token");
  assert.equal(route.meta.prepPublicShare, true);
});

import { readFileSync } from "node:fs";
import * as vue from "vue";
import { renderToString } from "vue/server-renderer";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as icons from "lucide-vue-next";
import * as prep from "../app/lib/prephub.ts";
function load(file: string, hub: any = {}, inline = true) {
  const { descriptor } = parse(readFileSync(file, "utf8"), { filename: file });
  const code = ts.transpileModule(
    compileScript(descriptor, {
      id: "prep-sharing-test",
      inlineTemplate: inline,
    }).content,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const globals = {
    ...vue,
    onMounted() {},
    onBeforeUnmount() {},
    usePrepHub: () => hub,
    useAppI18n: () => ({ t: (k: string) => k }),
    useProductDomain: () => ({ linkTo: (p: string) => p }),
    useRequestURL: () => new URL("https://prep.chlatwork.com"),
    useRoute: () => ({ hash: "#section-demo" }),
  };
  const mod = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name: string) =>
      name === "vue"
        ? vue
        : name === "lucide-vue-next"
          ? icons
          : name === "~/lib/prephub"
            ? prep
            : {},
    mod,
    mod.exports,
    ...Object.values(globals),
  );
  return mod.exports.default;
}
test("public sections show completed items and use capability file links without edit/upload controls", async () => {
  const item = {
    id: "done",
    title: "Completed requirement",
    content: "",
    isCompleted: true,
    isRequired: true,
  };
  const app = vue.createSSRApp(load("app/components/prephub/PrepSection.vue"), {
    section: {
      id: "section",
      type: "CHECKLIST",
      title: "Preparation",
      items: [item],
      resources: [],
    },
    subjectId: "subject",
    timeZone: "Asia/Phnom_Penh",
    busy: false,
    readOnly: true,
    resourceBase: `/api/prephub/public/${token}/resources`,
    mutate: async () => false,
    confirm() {},
  });
  app.component("PrepDialog", () => null);
  const html = await renderToString(app);
  assert.match(html, /Completed requirement/);
  assert.doesNotMatch(html, /<button|type="checkbox"|type="file"/);
  const section = load(
    "app/components/prephub/PrepSection.vue",
    {},
    false,
  ).setup(
    {
      subjectId: "subject",
      resourceBase: `/api/prephub/public/${token}/resources`,
      section: { type: "ATTACHMENTS", items: [], resources: [] },
    },
    { expose() {}, emit() {} },
  );
  assert.equal(
    section.resourceUrl({ id }, true),
    `/api/prephub/public/${token}/resources/${id}?preview=1`,
  );
});

test("the owner can enable, update, copy and revoke sharing without changing preparation content", async () => {
  const calls: any[] = [];
  let saved = {
    enabled: false,
    token: null as string | null,
    includeAttachments: false,
    sharedAt: null,
  };
  const hub = {
    owner: vue.ref("owner"),
    error: vue.ref(""),
    busy: vue.ref(false),
    fail: (e: any) => {
      hub.error.value = e.message;
    },
    request: async (path: string, options: any = {}) => {
      calls.push({ path, ...options });
      if (options.method === "PUT")
        saved = {
          enabled: true,
          token,
          includeAttachments: options.body.includeAttachments,
          sharedAt: null,
        };
      if (options.method === "DELETE")
        saved = {
          enabled: false,
          token: null,
          includeAttachments: false,
          sharedAt: null,
        };
      return { ...saved };
    },
  };
  const settings = load(
    "app/components/prephub/PrepShareSettings.vue",
    hub,
    false,
  ).setup({ subjectId: id }, { expose() {}, emit() {} });
  await settings.load();
  assert.equal(settings.settings.value.enabled, false);
  settings.includeAttachments.value = true;
  await settings.save();
  assert.equal(settings.settings.value.enabled, true);
  assert.equal(
    settings.link.value,
    `https://prep.chlatwork.com/prephub/shared/${token}#section-demo`,
  );
  assert.deepEqual(calls[1], {
    path: `/subjects/${id}/sharing`,
    method: "PUT",
    body: { includeAttachments: true },
  });
  await settings.stop();
  assert.equal(settings.link.value, "");
  assert.equal(settings.includeAttachments.value, false);
  assert.equal(calls[2].method, "DELETE");
});
test("failed sharing updates keep the existing link and show a retryable error", async () => {
  const hub = {
    owner: vue.ref("owner"),
    error: vue.ref(""),
    busy: vue.ref(false),
    fail: (e: any) => (hub.error.value = e.message),
    request: async () => {
      throw new Error("Offline");
    },
  };
  const settings = load(
    "app/components/prephub/PrepShareSettings.vue",
    hub,
    false,
  ).setup({ subjectId: id }, { expose() {}, emit() {} });
  settings.settings.value = { enabled: true, token, includeAttachments: false };
  await settings.save(true);
  assert.equal(settings.settings.value.token, token);
  assert.equal(hub.error.value, "Offline");
  assert.equal(hub.busy.value, false);
});
import {
  filterPrepShareTelemetry,
  isPrepPublicPath,
} from "../app/lib/prephub-sharing.ts";
test("shared document URLs are excluded from telemetry on product and legacy routes", () => {
  for (const path of [`/shared/${token}`, `/prephub/shared/${token}`]) {
    assert.equal(isPrepPublicPath(path), true);
    assert.equal(
      filterPrepShareTelemetry({ url: `https://prep.chlatwork.com${path}` }),
      null,
    );
  }
  const event = { url: "https://chlatwork.com/tools" };
  assert.equal(filterPrepShareTelemetry(event), event);
});

test("Google automatic measurement is blocked before initial shared loads and stays blocked after leaving", () => {
  const listeners = new Map<string, Function>();
  const browser: any = {
    location: { pathname: `/shared/${token}` },
    addEventListener: (name: string, fn: Function) => listeners.set(name, fn),
  };
  assert.equal(
    typeof (sharingPrivacy as any).prepShareGoogleGuardScript,
    "function",
  );
  new Function(
    "window",
    (sharingPrivacy as any).prepShareGoogleGuardScript("G-DUMMY"),
  )(browser);
  assert.equal(browser["ga-disable-G-DUMMY"], true);
  browser.location.pathname = "/tools";
  listeners.get("popstate")!();
  assert.equal(browser["ga-disable-G-DUMMY"], true);
  const other: any = {
    location: { pathname: "/tools" },
    addEventListener: (name: string, fn: Function) => listeners.set(name, fn),
  };
  new Function(
    "window",
    (sharingPrivacy as any).prepShareGoogleGuardScript("G-DUMMY"),
  )(other);
  assert.notEqual(other["ga-disable-G-DUMMY"], true);
  other.location.pathname = `/prephub/shared/${token}`;
  listeners.get("popstate")!();
  assert.equal(other["ga-disable-G-DUMMY"], true);
});
import * as sharingPrivacy from "../app/lib/prephub-sharing.ts";

test("public proxy rejects mutations before contacting the API and forwards no session credentials", async () => {
  const calls: any[] = [];
  const filename = "server/api/prephub/public/[...path].ts";
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const h3 = {
    createError: (v: any) => Object.assign(new Error(v.statusMessage), v),
    getMethod: (e: any) => e.method,
    getQuery: () => ({}),
    getRouterParam: (e: any) => e.path,
    setResponseHeader: (e: any, k: string, v: string) => (e.headers[k] = v),
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "defineEventHandler", source)(
    (name: string) =>
      name === "h3"
        ? h3
        : name === "../../../utils/prephub-routes"
          ? routes
          : {
              requestAuthApi: async (
                _event: any,
                path: string,
                options?: any,
              ) => {
                calls.push({ path, options });
                return { title: "Public" };
              },
            },
    module,
    module.exports,
    (fn: any) => fn,
  );
  const event = {
    method: "GET",
    path: token,
    headers: {} as Record<string, string>,
  };
  assert.deepEqual(await module.exports.default(event), { title: "Public" });
  assert.deepEqual(calls, [
    { path: `/prephub/public/${token}`, options: undefined },
  ]);
  assert.equal(event.headers["Cache-Control"], "private, no-store");
  assert.equal(event.headers["Referrer-Policy"], "no-referrer");
  for (const method of ["POST", "PUT", "PATCH", "DELETE"])
    await assert.rejects(module.exports.default({ ...event, method }), {
      statusCode: 404,
    });
  assert.equal(calls.length, 1);
});
test("copy link uses the clipboard and offers a selectable field when clipboard access is unavailable", async () => {
  const hub = {
    owner: vue.ref("owner"),
    error: vue.ref(""),
    busy: vue.ref(false),
  };
  const settings = load(
    "app/components/prephub/PrepShareSettings.vue",
    hub,
    false,
  ).setup({ subjectId: id }, { expose() {}, emit() {} });
  settings.settings.value = { enabled: true, token, includeAttachments: false };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let copied = "",
    focused = false,
    selected = false;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (value: string) => {
          copied = value;
        },
      },
    },
  });
  try {
    await settings.copy();
    assert.equal(copied, settings.link.value);
    assert.equal(settings.feedback.value, "prephub.linkCopied");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
    settings.linkField.value = {
      focus() {
        focused = true;
      },
      select() {
        selected = true;
      },
    };
    await settings.copy();
    assert.ok(focused && selected);
    assert.equal(settings.feedback.value, "prephub.copyManually");
  } finally {
    if (previous) Object.defineProperty(globalThis, "navigator", previous);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
test("Google provider privacy guard covers direct loads and SPA entry on every product host", async () => {
  const before: Function[] = [],
    after: Function[] = [],
    events: any[] = [];
  const browser: any = {
    location: {
      pathname: "/tools",
      hostname: "prep.chlatwork.com",
      origin: "https://prep.chlatwork.com",
    },
    addEventListener() {},
    gtag: (...args: any[]) => events.push(args),
  };
  const router = {
    currentRoute: { value: { fullPath: "/tools" } },
    beforeEach: (fn: Function) => before.push(fn),
    afterEach: (fn: Function) => after.push(fn),
  };
  const source = ts.transpileModule(
    readFileSync("app/plugins/google-tag.client.ts", "utf8").replaceAll(
      "import.meta.dev",
      "false",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const module = { exports: {} as any };
  new Function(
    "require",
    "module",
    "exports",
    "window",
    "document",
    "defineNuxtPlugin",
    "useRuntimeConfig",
    "useRouter",
    source,
  )(
    (name: string) =>
      name === "vue"
        ? vue
        : name === "~/lib/prephub-sharing"
          ? sharingPrivacy
          : {
              GOOGLE_CONSENT_UPDATE_EVENT: "consent",
              updateGoogleConsent() {},
            },
    module,
    module.exports,
    browser,
    { title: "Fixture" },
    (fn: any) => fn,
    () => ({ public: { googleMeasurementId: "G-DUMMY" } }),
    () => router,
  );
  module.exports.default({ hook() {} });
  assert.equal(browser["ga-disable-G-DUMMY"], undefined);
  before[0]({ path: `/shared/${token}` });
  assert.equal(browser["ga-disable-G-DUMMY"], true);
  after[0]({ fullPath: `/shared/${token}` });
  await vue.nextTick();
  after[0]({ fullPath: "/tools" });
  await vue.nextTick();
  assert.equal(browser["ga-disable-G-DUMMY"], true);
  assert.equal(events.length, 0);
});
