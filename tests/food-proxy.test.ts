import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createFetch } from "ofetch";
import ts from "../api/node_modules/typescript/lib/typescript.js";

for (const route of [
  "search.get",
  "random.get",
  "pick.post",
  "recommend.post",
]) {
  test(`Food proxy ${route} never retries an upstream paid request after a 503`, async () => {
    let attempts = 0;
    const fixtureFetch = createFetch({
      fetch: async () => {
        attempts++;
        return new Response('{"message":"Provider unavailable"}', {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      },
    });
    const source = readFileSync(
      new URL(`../server/api/food/${route}.ts`, import.meta.url),
      "utf8",
    );
    const code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const module = { exports: {} as any };
    const dependencies: Record<string, unknown> = {
      h3: { getQuery: () => ({}), readBody: async () => ({}), setHeader() {} },
      "../../utils/auth": {
        requestAuthApi: (
          _event: unknown,
          path: string,
          options: Record<string, unknown>,
        ) => fixtureFetch(`https://fixture.invalid${path}`, options),
      },
      "../../utils/food": {
        requestFoodApi: (
          _event: unknown,
          path: string,
          options: Record<string, unknown>,
        ) => fixtureFetch(`https://fixture.invalid${path}`, options),
      },
    };
    new Function("require", "module", "exports", "defineEventHandler", code)(
      (name: string) => {
        if (!(name in dependencies))
          throw new Error(`Unexpected dependency: ${name}`);
        return dependencies[name];
      },
      module,
      module.exports,
      (handler: unknown) => handler,
    );
    await assert.rejects(module.exports.default({}));
    assert.equal(attempts, 1);
  });
}

test("Food forwards a present session for verification/refresh and keeps anonymous discovery available", async () => {
  const source = readFileSync(
    new URL("../server/utils/food.ts", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} as any };
  const calls: string[] = [];
  const dependencies: Record<string, unknown> = {
    h3: {
      getCookie: (event: Record<string, string>, key: string) => event[key],
    },
    "./auth": {
      requestAuthenticatedApi: async () => {
        calls.push("account");
      },
      requestAuthApi: async () => {
        calls.push("guest");
      },
    },
  };
  new Function("require", "module", "exports", code)(
    (name: string) => dependencies[name],
    module,
    module.exports,
  );
  await module.exports.requestFoodApi({}, "/food/recommend", { retry: 0 });
  await module.exports.requestFoodApi(
    { chlatwork_access_token: "dummy-access" },
    "/food/recommend",
    { retry: 0 },
  );
  await module.exports.requestFoodApi(
    { chlatwork_refresh_token: "dummy-refresh" },
    "/food/pick",
    { retry: 0 },
  );
  assert.deepEqual(calls, ["guest", "account", "account"]);
});
