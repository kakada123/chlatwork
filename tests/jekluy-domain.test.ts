import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryHistory, createRouter } from "vue-router";
import { canonicalUrl, createDomainConfig, destinationUrl, legacyRedirect, productForPath, productRouteRecords, resolveHost } from "../app/lib/product-domains.ts";
import { robotsText, sitemapUrls } from "../app/lib/product-seo.ts";

test("JekLuy is explicitly gated and never migrates the existing PayBack URL", () => {
  assert.equal(resolveHost("jekluy.chlatwork.com", createDomainConfig()).kind, "unsupported");
  const config = createDomainConfig({ enabledProducts: "jekluy", canonicalProducts: "jekluy", redirectProducts: "jekluy" });
  assert.equal(resolveHost("jekluy.chlatwork.com", config).product, "jekluy");
  assert.equal(productForPath("/jekluy"), "jekluy");
  assert.equal(destinationUrl("/jekluy?source=friend#results", config), "https://jekluy.chlatwork.com/?source=friend#results");
  assert.equal(legacyRedirect("/jekluy?source=friend#results", config), "https://jekluy.chlatwork.com/?source=friend#results");
  assert.equal(legacyRedirect("/tools/payback-calculator", config), null);
  assert.equal(productForPath("/tools/payback-calculator"), null);
  assert.equal(canonicalUrl("/jekluy?private=value#results", config), "https://jekluy.chlatwork.com/");
});

test("JekLuy root, alias and refresh preserve the dedicated page without changing existing records", async () => {
  const routes = [{ path: "/", name: "main", component: {} }, { path: "/jekluy", name: "jekluy", component: {}, meta: { layout: "jekluy", localOnly: true } }, { path: "/tools/payback-calculator", name: "payback", component: {} }];
  for (const path of ["/?from=group#results", "/jekluy"]) {
    for (let refresh = 0; refresh < 2; refresh++) {
      const router = createRouter({ history: createMemoryHistory(), routes: productRouteRecords(routes, "jekluy") });
      await router.push(path);
      assert.equal(router.currentRoute.value.name, "jekluy");
      assert.equal(router.currentRoute.value.meta.layout, "jekluy");
      assert.equal(router.currentRoute.value.meta.localOnly, true);
      assert.equal(router.currentRoute.value.fullPath, path);
      assert.equal(router.resolve("/tools/payback-calculator").name, "payback");
    }
  }
  assert.equal(routes[0]?.name, "main");
});

test("JekLuy shares configurable origins and staging noindex policy without affecting other products", () => {
  const staged = createDomainConfig({ enabledProducts: "jekluy", productOrigins: { jekluy: "https://jekluy-staging.example.test" }, previewOrigins: "https://preview.example.test" });
  const context = resolveHost("jekluy-staging.example.test", staged);
  assert.equal(context.product, "jekluy");
  assert.deepEqual(sitemapUrls(["/jekluy", "/creator", "/tools/payback-calculator"], staged, context), []);
  assert.match(robotsText(staged, context), /Disallow: \//);
  assert.equal(resolveHost("preview.example.test", staged).kind, "preview");
  const live = createDomainConfig({ enabledProducts: "creator,link,moment,expense,draw,games,jekluy", canonicalProducts: "jekluy" });
  assert.deepEqual(sitemapUrls(["/jekluy", "/creator", "/tools/payback-calculator"], live, resolveHost("jekluy.chlatwork.com", live)), ["https://jekluy.chlatwork.com/"]);
  for (const product of ["creator", "link", "moment", "expense", "draw", "games"]) assert.equal(resolveHost(`${product}.chlatwork.com`, live).product, product);
});
