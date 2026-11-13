import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ignore from "ignore";

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Vercel uploads the pure roster utility required by the frontend", () => {
  const uploadRules = ignore().add(readProjectFile(".vercelignore"));
  const sharedRule = "api/src/roster/roster-week.util.ts";
  assert.equal(uploadRules.ignores("api/src/"), false);
  assert.equal(uploadRules.ignores("api/src/roster/"), false);
  assert.equal(uploadRules.ignores(sharedRule), false);
  // This exception is safe only while the module has no backend dependencies.
  assert.doesNotMatch(readProjectFile(sharedRule), /\b(?:import\s*(?:\(|["'{*])|require\s*\()/);
});

test("the roster utility exception does not upload the separately deployed API", () => {
  const uploadRules = ignore().add(readProjectFile(".vercelignore"));
  for (const path of [
    "api/package.json",
    "api/prisma/schema.prisma",
    "api/src/main.ts",
    "api/src/auth/auth.service.ts",
    "api/src/roster/roster.service.ts",
    "api/src/roster/nested/another-module.ts",
    "api/node_modules/example/index.js",
    ".tmp/build/output.js",
  ]) {
    assert.equal(uploadRules.ignores(path), true, `${path} must remain excluded`);
  }
  assert.equal(uploadRules.ignores("server/api/roster/month.get.ts"), false);
});

test("Vercel uses Nuxt's current framework adapter and managed output", () => {
  const config = JSON.parse(readProjectFile("vercel.json")) as Record<
    string,
    unknown
  >;

  assert.equal(config.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.equal(config.framework, "nuxtjs");
  assert.equal(config.buildCommand, "npm run build");

  // Null clears stale dashboard output overrides so Nitro can publish the complete
  // Build Output API bundle, including the client assets under /_nuxt.
  assert.equal(config.outputDirectory, null);
  assert.equal(config.builds, undefined);
});

test("deployment configuration cannot fall back to the legacy Nuxt 2 builder", () => {
  const nuxtConfig = readProjectFile("nuxt.config.ts");
  const packageJson = readProjectFile("package.json");
  const packageLock = readProjectFile("package-lock.json");

  assert.match(nuxtConfig, /preset: "vercel"/);
  assert.doesNotMatch(packageJson, /@nuxtjs\/vercel-builder/);
  assert.doesNotMatch(packageLock, /@nuxtjs\/vercel-builder/);
});

test("public pages use SSR instead of deploy-specific prerendered HTML", () => {
  const nuxtConfig = readProjectFile("nuxt.config.ts");

  // Keeping these pages in the SSR fallback prevents cached HTML from pointing
  // at /_nuxt assets from a different deployment after an atomic promotion.
  assert.match(nuxtConfig, /ssr: true/);
  assert.doesNotMatch(nuxtConfig, /prerender\s*:/);
});
