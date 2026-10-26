import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryHistory, createRouter, type RouteRecordRaw } from "vue-router";
import { productRouteRecords, type Product } from "../app/lib/product-domains.ts";

const records: RouteRecordRaw[] = [
  { path: "/", name: "main", component: {} },
  { path: "/creator", name: "creator", component: {}, meta: { layout: "creator" } },
  { path: "/creator/credits", name: "credits", component: {} },
  { path: "/creator/history/:id", name: "history", component: {}, meta: { middleware: "auth" } },
  { path: "/link", name: "link", component: {} },
  { path: "/u/:slug", name: "profile", component: {}, meta: { layout: false } },
  { path: "/account/link/:section?", name: "editor", component: {}, meta: { middleware: "auth" } },
  { path: "/moments/create", name: "moment", component: {} },
  { path: "/m/:slug", name: "share", component: {}, meta: { layout: false } },
  { path: "/i/:token", name: "invitation", component: {}, meta: { layout: false } },
  { path: "/tools/expense-tracker", name: "expense", component: {} },
  { path: "/tools/lucky-draw", name: "draw", component: {} },
  { path: "/tools/kla-klok", name: "games", component: {} },
];

test("Vue Router resolves product roots, deep links and refreshes to the original components", async () => {
  const cases: [Product, string, string][] = [
    ["creator", "/", "creator"], ["creator", "/creator/credits", "credits"],
    ["creator", "/creator/history/123", "history"], ["link", "/", "link"],
    ["link", "/u/published-name", "profile"], ["link", "/account/link/appearance", "editor"],
    ["moment", "/?lang=km", "moment"], ["moment", "/m/private-share?lang=km#vote", "share"],
    ["moment", "/i/recipient", "invitation"], ["expense", "/?range=month", "expense"],
    ["draw", "/", "draw"], ["games", "/kla-klok", "games"],
  ];
  for (const [product, path, name] of cases) {
    for (let refresh = 0; refresh < 2; refresh++) {
      const router = createRouter({ history: createMemoryHistory(), routes: productRouteRecords(records, product) });
      await router.push(path);
      assert.equal(router.currentRoute.value.name, name, `${product}: ${path}`);
      assert.equal(router.currentRoute.value.fullPath, path);
      if (name === "history" || name === "editor") assert.equal(router.currentRoute.value.meta.middleware, "auth");
    }
  }
});

test("legacy aliases resolve without adding a conflicting bare username route", () => {
  const router = createRouter({ history: createMemoryHistory(), routes: productRouteRecords(records, "link") });
  assert.equal(router.resolve("/link").name, "link");
  assert.equal(router.resolve("/login").matched.length, 0);
  assert.equal(router.resolve("/some-user").matched.length, 0);
  assert.equal(router.resolve("/u/some-user").params.slug, "some-user");
});
