import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function proxy(file: string, send: (...args: any[]) => Promise<unknown>) {
  const source = readFileSync(
    new URL(`../server/api/roster/${file}`, import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} as any };
  new Function(
    "require",
    "module",
    "exports",
    "defineEventHandler",
    "setResponseHeader",
    "getQuery",
    "readBody",
    code,
  )(
    () => ({ requestAuthenticatedApi: send }),
    module,
    module.exports,
    (handler: unknown) => handler,
    (event: any, key: string, value: string) => {
      event.headers[key] = value;
    },
    (event: any) => event.query,
    async (event: any) => event.body,
  );
  return module.exports.default;
}

test("annual settings and leave proxies preserve the selected year without caching account data", async () => {
  for (const file of ["settings.get.ts", "leave/balances.get.ts"]) {
    const event = {
      query: { year: "2027" },
      headers: {} as Record<string, string>,
    };
    let options: any;
    const handler = proxy(file, async (_event, _path, input) => {
      options = input;
      return {};
    });
    await handler(event);
    assert.equal(options.query.year, "2027");
    assert.equal(event.headers["Cache-Control"], "no-store");
  }
});

test("bulk status proxy forwards one authenticated request for the selected month", async () => {
  const event = {
    body: { year: 2026, month: 11, dates: ["2026-11-02"], status: "CONFIRMED" },
    headers: {} as Record<string, string>,
  };
  let request: any;
  await proxy("month/status.put.ts", async (_event, path, options) => {
    request = { path, ...options };
  })(event);
  assert.equal(request.path, "/roster/month/status");
  assert.equal(request.method, "PUT");
  assert.equal(request.body, event.body);
  assert.equal(event.headers["Cache-Control"], "no-store");
});
