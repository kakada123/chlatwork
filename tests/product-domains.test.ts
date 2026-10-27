import assert from "node:assert/strict";
import test from "node:test";
import {
  createDomainConfig,
  resolveHost,
  productForPath,
  productPath,
  legacyPath,
  destinationUrl,
  canonicalUrl,
  legacyRedirect,
  isSameOriginMutation,
  safeReturnPath,
  productRouteRecords,
  navigationUrl,
} from "../app/lib/product-domains.ts";

const config = createDomainConfig({
  enabledProducts: "creator,link,moment,expense,draw,games",
  canonicalProducts: "creator,link,moment,expense,draw,games",
  redirectProducts: "creator,link,moment,expense,draw,games",
});

test("routing is disabled by default and host matching is exact", () => {
  assert.equal(resolveHost("creator.chlatwork.com", createDomainConfig()).kind, "unsupported");
  assert.equal(resolveHost("creator.chlatwork.com", config).product, "creator");
  for (const host of ["chlatwork.com.evil.test", "evil.chlatwork.com", "random.vercel.app"]) {
    assert.equal(resolveHost(host, config).kind, "unsupported");
  }
  assert.equal(resolveHost("localhost:3001", config).kind, "main");
  const preview = createDomainConfig({ previewOrigins: "https://review.example.test" });
  assert.equal(resolveHost("review.example.test", preview).kind, "preview");
  assert.equal(resolveHost("tools.chlatwork.com", config).kind, "unsupported");
  assert.equal(resolveHost("payback.chlatwork.com", config).kind, "unsupported");
});

test("origins are configurable without accepting credentials, paths, or unsafe protocols", () => {
  const local = createDomainConfig({ mainOrigin: "http://localhost:3001", enabledProducts: "creator", productOrigins: '{"creator":"http://creator.localhost:3001"}' });
  assert.equal(resolveHost("creator.localhost:3001", local).product, "creator");
  assert.equal(destinationUrl("/creator", local), "http://localhost:3001/creator");
  for (const value of ["https://user:pass@example.com", "https://example.com/path", "javascript:alert(1)"]) {
    assert.throws(() => createDomainConfig({ mainOrigin: value }));
  }
  assert.throws(() => createDomainConfig({ productOrigins: '{"creator":"https://chlatwork.com"}' }));
  assert.throws(() => createDomainConfig({ productOrigins: '{"typo":"https://example.test"}' }));
  assert.throws(() => createDomainConfig({ productOrigins: '{"creator":42}' }));
  assert.equal(createDomainConfig({ productOrigins: { creator: "https://create.example.test" } }).origins.creator, "https://create.example.test");
});

test("product routes preserve established public and nested paths with no bare-slug catchall", () => {
  assert.equal(productPath("creator", "/creator"), "/");
  assert.equal(productPath("creator", "/creator/history/123"), "/creator/history/123");
  assert.equal(productPath("link", "/u/kakada"), "/u/kakada");
  assert.equal(productForPath("/link/alice"), "link");
  assert.equal(productForPath("/account/link/appearance"), "link");
  assert.equal(productForPath("/m/private-share"), "moment");
  assert.equal(productForPath("/moment/old-share"), "moment");
  assert.equal(productForPath("/i/invitation"), "moment");
  assert.equal(productForPath("/food"), "food");
  assert.equal(productPath("food", "/food"), "/");
  assert.equal(productPath("games", "/tools/kla-klok"), "/kla-klok");
  assert.equal(legacyPath("expense", "/"), "/tools/expense-tracker");
  assert.equal(legacyPath("games", "/kla-klok"), "/tools/kla-klok");
  for (const path of ["/tools/payback-calculator", "/tools/pdf", "/tools/qr", "/creator-imposter", "/alice"]) {
    assert.equal(productForPath(path), null);
  }
});

test("direct navigation and refresh resolve the same page and preserve guards", () => {
  const records = [
    { path: "/", name: "home", meta: {} },
    { path: "/creator", name: "creator", meta: { layout: "creator" } },
    { path: "/creator/history/:id", name: "history", meta: { middleware: "auth" } },
    { path: "/u/:slug", name: "profile", meta: { layout: false } },
    { path: "/tools/expense-tracker", name: "expense", meta: {} },
  ];
  const creator = productRouteRecords(records, "creator");
  assert.equal(creator.find((route) => route.path === "/")?.name, "creator");
  assert.equal(creator.find((route) => route.path === "/creator/history/:id")?.meta.middleware, "auth");
  assert.equal(creator.some((route) => route.name === "home"), false);
  assert.deepEqual(records[0], { path: "/", name: "home", meta: {} });
  assert.deepEqual(productRouteRecords(records, "creator"), creator);
  assert.equal(productRouteRecords(records, "link").some((route) => route.path === "/:slug"), false);
});

test("migration stages preserve legacy URLs until explicitly activated", () => {
  const disabled = createDomainConfig();
  assert.equal(destinationUrl("/creator", disabled), "https://chlatwork.com/creator");
  assert.equal(legacyRedirect("/creator?lang=km#tools", disabled), null);
  assert.equal(legacyRedirect("/creator?lang=km#tools", config), "https://creator.chlatwork.com/?lang=km#tools");
  assert.equal(legacyRedirect("/u/alice?source=qr#links", config), "https://link.chlatwork.com/u/alice?source=qr#links");
  assert.equal(legacyRedirect("/tools/lucky-draw?list=old", config), null);
  assert.equal(legacyRedirect("/tools/qr", config), null);
  assert.equal(legacyRedirect("/tools/payback-calculator", config), null);
  assert.equal(legacyRedirect("/creator", createDomainConfig({ redirectProducts: "creator" })), null);
  assert.equal(navigationUrl("/tools/qr", config), "/tools/qr");
  assert.equal(navigationUrl("/creator", config), "https://creator.chlatwork.com/");
  assert.equal(navigationUrl("/creator#khmer", config, "creator"), "/#khmer");
});

test("canonicals follow activation and retain only the supported Moment locale", () => {
  assert.equal(canonicalUrl("/tools/expense-tracker?token=private#history", config), "https://expense.chlatwork.com/");
  assert.equal(canonicalUrl("/m/gift?lang=km&tracking=1", config), "https://moment.chlatwork.com/m/gift?lang=km");
  assert.equal(canonicalUrl("/u/alice?tracking=1", config), "https://link.chlatwork.com/u/alice");
  assert.equal(canonicalUrl("/creator", createDomainConfig()), "https://chlatwork.com/creator");
});

test("cookie-authenticated mutations reject sibling origins and malformed return URLs", () => {
  assert.equal(isSameOriginMutation("https://creator.chlatwork.com", "https://creator.chlatwork.com", "same-origin"), true);
  assert.equal(isSameOriginMutation("https://creator.chlatwork.com", "https://link.chlatwork.com", "same-site"), false);
  assert.equal(isSameOriginMutation("https://creator.chlatwork.com", undefined, "cross-site"), false);
  assert.equal(isSameOriginMutation("https://creator.chlatwork.com", undefined, undefined), true);
  for (const path of ["//evil.test", "/\\evil.test", "/\n/evil.test", "https://evil.test"]) assert.equal(safeReturnPath(path), "/account");
  assert.equal(safeReturnPath("/creator/credits?lang=km#balance"), "/creator/credits?lang=km#balance");
});
