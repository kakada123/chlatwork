import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

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
