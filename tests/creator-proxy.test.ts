import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "../api/node_modules/typescript/lib/typescript.js";

// Exercise the proxy's allowlist and auth boundary without starting a server.
function harness() {
  const calls: any[] = [];
  let authCalls = 0;
  const source = readFileSync(
    new URL("../server/api/creator-ai/[...path].ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const module = { exports: {} as any };
  const dependencies: Record<string, unknown> = {
    h3: {
      createError: (value: unknown) => value,
      getMethod: (event: any) => event.method,
      getRouterParam: (event: any) => event.path,
      getRequestURL: () =>
        new URL("https://creator.example.test/api/creator-ai"),
      setResponseHeader: (event: any, key: string, value: string) => {
        event.headers[key] = value;
      },
      proxyRequest: (...args: any[]) => {
        calls.push(args);
        return "proxied";
      },
    },
    "../../utils/auth": {
      apiBaseUrl: () => "https://api.example.test",
      getFreshAccessToken: async () => {
        authCalls++;
        return "dummy-access-token";
      },
    },
  };
  new Function("require", "module", "exports", "defineEventHandler", compiled)(
    (name: string) => {
      if (!(name in dependencies))
        throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    module,
    module.exports,
    (handler: unknown) => handler,
  );
  return { handle: module.exports.default, calls, authCalls: () => authCalls };
}

test("all new translations and saved detail requests pass through the authenticated proxy", async () => {
  const proxy = harness();
  const routes = [
    ...[
      "khmer-to-latin",
      "khmer-to-english",
      "latin-to-english",
      "english-to-latin",
    ].map((direction) => ({ method: "POST", path: `khmer/${direction}` })),
    { method: "GET", path: "history/12345678-1234-4234-8234-123456789abc" },
  ];
  for (const route of routes) {
    const event = { ...route, headers: {} as Record<string, string> };
    assert.equal(await proxy.handle(event), "proxied");
    const [, target, options] = proxy.calls.at(-1);
    assert.equal(target, `https://api.example.test/creator-ai/${route.path}`);
    assert.equal(options.headers.Authorization, "Bearer dummy-access-token");
    assert.equal(options.headers.Cookie, "");
    assert.equal(event.headers["Cache-Control"], "no-store");
  }
  assert.equal(proxy.authCalls(), 5);
});

test("invalid history IDs and methods never reach auth or the upstream API", async () => {
  const proxy = harness();
  for (const route of [
    { method: "GET", path: "history/not-an-id" },
    { method: "POST", path: "history/12345678-1234-4234-8234-123456789abc" },
    { method: "DELETE", path: "history" },
    { method: "POST", path: "khmer/unknown" },
  ]) {
    await assert.rejects(proxy.handle({ ...route, headers: {} }), {
      statusCode: 404,
    });
  }
  assert.equal(proxy.authCalls(), 0);
  assert.equal(proxy.calls.length, 0);
});
