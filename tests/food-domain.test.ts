import assert from "node:assert/strict";
import test from "node:test";
import {
  PRODUCTS,
  createDomainConfig,
  resolveHost,
  productForPath,
  productPath,
  destinationUrl,
  canonicalUrl,
  legacyRedirect,
  productRouteRecords,
} from "../app/lib/product-domains.ts";
import { KHMER_RECIPES } from "../api/src/food/data/khmer-recipes.ts";
import { PHNOM_PENH_DISTRICTS, findDistrictById } from "../api/src/food/data/districts.ts";

test("food subdomain configuration and product definitions", () => {
  assert.equal(PRODUCTS.food.name, "ChlatWork Food");
  assert.equal(PRODUCTS.food.entry, "/food");
  assert.equal(PRODUCTS.food.home, "/");
  assert.equal(PRODUCTS.food.host, "food");

  // Disabled by default
  const defaultConfig = createDomainConfig();
  assert.equal(resolveHost("food.chlatwork.com", defaultConfig).kind, "unsupported");
  assert.equal(destinationUrl("/food", defaultConfig), "https://chlatwork.com/food");

  // Enabled config
  const enabledConfig = createDomainConfig({
    enabledProducts: "food",
    canonicalProducts: "food",
    redirectProducts: "food",
  });

  assert.equal(resolveHost("food.chlatwork.com", enabledConfig).product, "food");
  assert.equal(productForPath("/food"), "food");
  assert.equal(productPath("food", "/food"), "/");
  assert.equal(canonicalUrl("/food", enabledConfig), "https://food.chlatwork.com/");
  assert.equal(legacyRedirect("/food", enabledConfig), "https://food.chlatwork.com/");
});

test("food product routes map correctly on food.chlatwork.com", () => {
  const routes = [
    { path: "/", name: "home", meta: {} },
    { path: "/food", name: "food", meta: { layout: "food" } },
    { path: "/tools", name: "tools", meta: {} },
  ];

  const mapped = productRouteRecords(routes, "food");
  const homeRoute = mapped.find((r) => r.path === "/");
  assert.ok(homeRoute);
  assert.equal(homeRoute.name, "food");
  assert.equal(homeRoute.meta?.productLegacyPath, "/food");
  assert.deepEqual(homeRoute.alias, ["/food"]);
});

test("khmer recipes dataset completeness and integrity", () => {
  assert.ok(KHMER_RECIPES.length >= 10);

  for (const recipe of KHMER_RECIPES) {
    assert.ok(recipe.id && recipe.id.length > 0);
    assert.ok(recipe.nameKm && recipe.nameKm.length > 0);
    assert.ok(recipe.nameEn && recipe.nameEn.length > 0);
    assert.ok(recipe.ingredients.length > 0);
    assert.ok(recipe.steps.length > 0);
    assert.ok(recipe.servings > 0);
    assert.ok(recipe.estimatedCostUsd > 0);
    assert.ok(recipe.mealTimes.length > 0);
    assert.ok(recipe.occasions.length > 0);
  }

  const korko = KHMER_RECIPES.find((r) => r.id === "samlor-korko");
  assert.ok(korko);
  assert.equal(korko.category, "soup");
});

test("phnom penh districts dataset and lookup helper", () => {
  assert.ok(PHNOM_PENH_DISTRICTS.length >= 8);

  const bkk = findDistrictById("bkk");
  assert.ok(bkk);
  assert.equal(bkk.nameEn, "Boeng Keng Kang");
  assert.ok(bkk.lat > 11 && bkk.lat < 12);
  assert.ok(bkk.lng > 104 && bkk.lng < 105);

  const daunPenh = findDistrictById("DAUN-PENH");
  assert.ok(daunPenh);
  assert.equal(daunPenh.id, "daun-penh");

  assert.equal(findDistrictById("non-existent"), null);
});
