import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "../api/node_modules/typescript/lib/typescript.js";

test("the resolved page response policy permits first-party GPS without permitting third-party origins", () => {
  const source = readFileSync(
    new URL("../nuxt.config.ts", import.meta.url),
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
    "globalThis",
    "defineNuxtConfig",
    code,
  )(
    (name: string) => {
      if (name === "./app/data/site-routes")
        return { PUBLIC_SITEMAP_PATHS: [] };
      if (name === "./app/data/tool-guide-routes")
        return { TOOL_GUIDE_ROUTES: [] };
      throw new Error(`Unexpected config dependency: ${name}`);
    },
    module,
    module.exports,
    { process: { env: { NODE_ENV: "test" } } },
    (config: unknown) => config,
  );
  const config = module.exports.default;
  // Both food.chlatwork.com/ and chlatwork.com/food receive this shared document response policy.
  const policy = config.routeRules["/**"].headers[
    "Permissions-Policy"
  ] as string;
  const directives = new Map(
    policy.split(",").map((value) => {
      const separator = value.indexOf("=");
      return [
        value.slice(0, separator).trim(),
        value.slice(separator + 1).trim(),
      ];
    }),
  );
  assert.equal(directives.get("geolocation"), "(self)");
  assert.equal(directives.get("camera"), "(self)");
  for (const capability of [
    "microphone",
    "payment",
    "usb",
    "serial",
    "clipboard-read",
  ]) {
    assert.equal(directives.get(capability), "()");
  }
  assert.equal(config.routeRules["/**"].headers["X-Frame-Options"], "DENY");
});
