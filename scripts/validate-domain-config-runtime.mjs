import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Use only local fixture settings and the packaged handler: never read env files or call a live API.
process.env.NUXT_AUTH_API_BASE_URL = "https://domain-config-fixture.invalid";
process.env.NUXT_PUBLIC_DOMAINS_MAIN_ORIGIN = "https://chlatwork.com";
process.env.NUXT_PUBLIC_DOMAINS_PRODUCT_ORIGINS = "{}";
process.env.NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS = "";
const allProducts = "creator,link,moment,expense,draw,games";
const originalFetch = globalThis.fetch;
const originalWarn = console.warn;
const warnings = [];
console.warn = (...args) => {
  if (typeof args[0] === "string" && args[0].startsWith("[chlatwork:domains]")) warnings.push(args[0]);
  else originalWarn(...args);
};
globalThis.fetch = async (input) => {
  const url = new URL(String(input.url || input));
  assert.equal(url.origin, "https://domain-config-fixture.invalid", "Validation must not contact live services");
  return new Response(JSON.stringify(url.pathname === "/feature-availability" ? { disabled: [] } : {}), {
    headers: { "Content-Type": "application/json" },
  });
};

const output = (await readFile(".tmp/subdomains/latest-output.txt", "utf8")).trim();
await import(pathToFileURL(`${output}/functions/__fallback.func/index.mjs`).href);
const runtime = await import(pathToFileURL(`${output}/functions/__fallback.func/chunks/nitro/nitro.mjs`).href);
const useNitroApp = Object.values(runtime).find((value) => typeof value === "function" && value.name === "useNitroApp");
assert.equal(typeof useNitroApp, "function", "Built Nitro app must expose its local request handler");
const app = useNitroApp();

async function request(host, path, options = {}) {
  return app.localFetch(path, {
    ...options,
    headers: Object.fromEntries(new Headers({ host, ...options.headers }).entries()),
  });
}

let assertions = 0;
try {
  for (const invalidSetting of ["ENABLED_PRODUCTS", "CANONICAL_PRODUCTS", "REDIRECT_PRODUCTS"]) {
    for (const setting of ["ENABLED_PRODUCTS", "CANONICAL_PRODUCTS", "REDIRECT_PRODUCTS"]) {
      process.env[`NUXT_PUBLIC_DOMAINS_${setting}`] = setting === invalidSetting ? "creator,unknown-product" : allProducts;
    }
    assert.equal((await request("chlatwork.com", "/")).status, 200, `${invalidSetting}: main homepage must remain operational`);
    assert.equal((await request("chlatwork.com", "/api/creator-telegram/webhook", { method: "POST" })).status, 401, `${invalidSetting}: webhook must reach its existing authentication check`);
    assert.equal((await request("chlatwork.com", "/api/telegram/webhook", { method: "POST" })).status, 401, `${invalidSetting}: standard webhook must reach its existing authentication check`);
    assert.equal((await request("chlatwork.com", "/api/auth/me")).status, 401, `${invalidSetting}: account endpoint must reach authentication`);
    assert.equal((await request("evil.chlatwork.com", "/")).status, 404);
    const creator = await request("creator.chlatwork.com", "/");
    assert.equal(creator.status, invalidSetting === "ENABLED_PRODUCTS" ? 404 : 200);
    if (invalidSetting === "CANONICAL_PRODUCTS") assert.match(creator.headers.get("x-robots-tag"), /noindex/);
    assertions += 6;
  }
  process.env.NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS = allProducts;
  process.env.NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS = "invalid-product";
  process.env.NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS = "";
  assert.equal((await request("link.chlatwork.com", "/api/profiles/me", {
    method: "PATCH", headers: { Origin: "https://creator.chlatwork.com" },
  })).status, 403, "Configuration recovery must retain sibling-origin CSRF protection");
  assertions++;
  assert.equal(warnings.length, 3, "Invalid settings must be logged only once per process");
  assert.equal(warnings.some((warning) => warning.includes("unknown-product") || warning.includes("invalid-product")), false, "Diagnostics must not include configuration values");
  for (const setting of ["ENABLED_PRODUCTS", "CANONICAL_PRODUCTS", "REDIRECT_PRODUCTS"]) {
    assert.equal(warnings.filter((warning) => warning.includes(`NUXT_PUBLIC_DOMAINS_${setting}`)).length, 1);
  }
  assertions += 5;
  process.env.NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS = allProducts;
  process.env.NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS = "";
  process.env.NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS = "";
  for (const previewValue of ["disabled", "https://review.example.test,disabled", "false"]) {
    process.env.NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS = previewValue;
    assert.equal((await request("chlatwork.com", "/")).status, 200, "Invalid preview aliases must not crash the main site");
    assert.equal((await request("link.chlatwork.com", "/")).status, 200, "Invalid preview aliases must not crash product hosts");
    assert.equal((await request("chlatwork.com", "/api/creator-telegram/webhook", { method: "POST" })).status, 401);
    assert.equal((await request("link.chlatwork.com", "/api/auth/me")).status, 401);
    assert.equal((await request("link.chlatwork.com", "/not-a-real-product-route")).status, 404, "Error rendering must survive invalid preview configuration");
    assert.equal((await request("review.example.test", "/")).status, 404, "A partially invalid preview list must not grant host access");
    assertions += 6;
  }
  for (const previewValue of ["https://review.example.test", '["https://review.example.test"]']) {
    process.env.NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS = previewValue;
    const preview = await request("review.example.test", "/");
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get("x-robots-tag"), /noindex/);
    assertions += 2;
  }
  assert.equal(warnings.length, 4);
  assert.equal(warnings.filter((warning) => warning.includes("NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS")).length, 1);
  assertions += 2;
  const unknownHost = await request("unknown.chlatwork.com", "/");
  const unknownHtml = await unknownHost.text();
  assert.equal(unknownHost.status, 404);
  assert.match(unknownHtml.match(/<title>([^<]*)<\/title>/)?.[1] || "", /^404(?:\s|\s*-)/);
  assert.doesNotMatch(unknownHtml, /<h1[^>]*>500<\/h1>/);
  assert.match(unknownHost.headers.get("x-robots-tag"), /noindex/);
  assert.equal(unknownHost.headers.get("cache-control"), "no-store");
  const unknownApi = await request("unknown.chlatwork.com", "/api/auth/me");
  assert.equal(unknownApi.status, 404);
  assert.match(unknownApi.headers.get("content-type"), /application\/json/);
  assert.equal((await unknownApi.json()).statusCode, 404);
  const forgedError = await request("unknown.chlatwork.com", "/__nuxt_error?statusCode=200", { headers: { "x-nuxt-error": "true" } });
  assert.equal(forgedError.status, 404, "Untrusted error-rendering headers must not bypass host rejection");
  process.env.NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS = "";
  const disabledLink = await request("link.chlatwork.com", "/");
  assert.equal(disabledLink.status, 404);
  assert.match((await disabledLink.text()).match(/<title>([^<]*)<\/title>/)?.[1] || "", /^404(?:\s|\s*-)/);
  process.env.NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS = allProducts;
  const enabledLink = await request("link.chlatwork.com", "/");
  assert.equal(enabledLink.status, 200);
  assert.match(await enabledLink.text(), /ChlatWork Link/);
  assertions += 13;
  console.log(`Passed ${assertions} built-server configuration recovery checks (fixture API, no real provider/database requests).`);
} finally {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
}
