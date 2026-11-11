import assert from "node:assert/strict";
import test from "node:test";
import { createDomainConfig, legacyRedirect, resolveHost } from "../app/lib/product-domains.ts";

const allProducts = "creator,link,moment,expense,draw,games";

test("an unknown product in an enabled list cannot crash main-domain requests", () => {
  const issues: string[] = [];
  const config = createDomainConfig({
    enabledProducts: "creator,unknown-product",
    canonicalProducts: allProducts,
    redirectProducts: allProducts,
  }, (setting) => issues.push(setting));
  assert.deepEqual(config.enabled, []);
  assert.deepEqual(config.canonical, []);
  assert.deepEqual(config.redirects, []);
  assert.equal(resolveHost("chlatwork.com", config).kind, "main");
  assert.equal(resolveHost("creator.chlatwork.com", config).kind, "unsupported");
  assert.equal(legacyRedirect("/creator", config), null);
  assert.deepEqual(issues, ["NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS"]);
});

test("an invalid canonical or redirect list disables only its rollout stage", () => {
  const issues: string[] = [];
  const staged = createDomainConfig({
    enabledProducts: allProducts,
    canonicalProducts: "creator.chlatwork.com",
    redirectProducts: allProducts,
  }, (setting) => issues.push(setting));
  assert.equal(resolveHost("creator.chlatwork.com", staged).product, "creator");
  assert.deepEqual(staged.canonical, []);
  assert.deepEqual(staged.redirects, []);
  const canonical = createDomainConfig({
    enabledProducts: allProducts,
    canonicalProducts: allProducts,
    redirectProducts: '"creator,link"',
  }, (setting) => issues.push(setting));
  assert.equal(canonical.canonical.length, 6);
  assert.deepEqual(canonical.redirects, []);
  assert.deepEqual(issues, ["NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS", "NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS"]);
});

test("Nitro-deserialized product lists accept string arrays without enabling unknown entries", () => {
  const config = createDomainConfig({ enabledProducts: ["creator", "link", "creator"] });
  assert.deepEqual(config.enabled, ["creator", "link"]);
  const issues: string[] = [];
  for (const value of [false, 42, {}, ["creator", false], ["creator", "unknown-product"]]) {
    const invalid = createDomainConfig({ enabledProducts: value as never }, (setting) => issues.push(setting));
    assert.deepEqual(invalid.enabled, []);
  }
  assert.equal(issues.length, 5);
});

test("unset and blank migration lists stay disabled without configuration warnings", () => {
  const issues: string[] = [];
  for (const value of [undefined, "", "  ", []]) {
    assert.deepEqual(createDomainConfig({ enabledProducts: value }, (setting) => issues.push(setting)).enabled, []);
  }
  assert.deepEqual(issues, []);
});

test("invalid preview origins cannot crash production routing or enable additional hosts", () => {
  for (const value of ["disabled", "false", "creator,link", "https://valid.example.test,disabled", "https://user:password@example.test", "https://example.test/path", "https://*.example.test", false, {}, ["https://valid.example.test", false]]) {
    const issues: string[] = [];
    const config = createDomainConfig({ enabledProducts: allProducts, previewOrigins: value as never }, (setting) => issues.push(setting));
    assert.deepEqual(config.previews, []);
    assert.equal(config.enabled.length, 6);
    assert.equal(resolveHost("chlatwork.com", config).kind, "main");
    assert.equal(resolveHost("link.chlatwork.com", config).product, "link");
    assert.equal(resolveHost("valid.example.test", config).kind, "unsupported");
    assert.deepEqual(issues, ["NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS"]);
  }
});

test("preview origin lists accept exact origins and Nitro arrays, and omitted lists stay empty", () => {
  const issues: string[] = [];
  for (const value of [undefined, "", "  ", []]) {
    assert.deepEqual(createDomainConfig({ previewOrigins: value as never }, (setting) => issues.push(setting)).previews, []);
  }
  for (const value of ["https://review.example.test, https://review.example.test/", ["https://review.example.test", "https://review.example.test/"]]) {
    const config = createDomainConfig({ previewOrigins: value as never }, (setting) => issues.push(setting));
    assert.deepEqual(config.previews, ["https://review.example.test"]);
    assert.equal(resolveHost("review.example.test", config).kind, "preview");
  }
  assert.deepEqual(issues, []);
});

test("runtime Vercel environment automatically allows branch and deployment previews", () => {
  const previousBranch = process.env.VERCEL_BRANCH_URL;
  const previousUrl = process.env.VERCEL_URL;
  try {
    process.env.VERCEL_BRANCH_URL = "chlatwork-git-main-ngen-kakadas-projects.vercel.app";
    process.env.VERCEL_URL = "chlatwork-iuv55wfhx-ngen-kakadas-projects.vercel.app";
    const config = createDomainConfig();
    assert.equal(resolveHost("chlatwork-git-main-ngen-kakadas-projects.vercel.app", config).kind, "preview");
    assert.equal(resolveHost("chlatwork-iuv55wfhx-ngen-kakadas-projects.vercel.app", config).kind, "preview");
    assert.equal(resolveHost("random.vercel.app", config).kind, "unsupported");
  } finally {
    if (previousBranch === undefined) delete process.env.VERCEL_BRANCH_URL;
    else process.env.VERCEL_BRANCH_URL = previousBranch;
    if (previousUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = previousUrl;
  }
});
