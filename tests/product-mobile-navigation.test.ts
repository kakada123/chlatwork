import assert from "node:assert/strict";
import test from "node:test";
import {
  getProductMobileNavigation,
  isProductMobileItemActive,
  mobileProductTarget,
} from "../app/lib/product-mobile-navigation.ts";
import type { Product } from "../app/lib/product-domains.ts";

test("every product has at most four direct mobile destinations using existing routes", () => {
  for (const product of [
    "creator",
    "link",
    "moment",
    "expense",
    "draw",
    "games",
  ] as Product[]) {
    const items = getProductMobileNavigation(product);
    assert.ok(items.length >= 3 && items.length <= 4);
    assert.equal(
      items.some((item) => item.key === "account"),
      true,
    );
    assert.equal(new Set(items.map((item) => item.key)).size, items.length);
  }
  assert.equal(
    getProductMobileNavigation("link").find((item) => item.key === "share")?.to,
    "/account/link/share",
  );
  assert.equal(
    getProductMobileNavigation("expense").find((item) => item.key === "add")
      ?.action,
    "expense",
  );
  assert.equal(
    getProductMobileNavigation("draw").find((item) => item.key === "legacy")
      ?.externalPath,
    "/tools/lucky-draw",
  );
});

test("Link editing and sharing highlight separate tabs, including nested account sections", () => {
  const items = getProductMobileNavigation("link");
  const active = (path: string) =>
    items
      .filter((item) => isProductMobileItemActive("link", item, path, ""))
      .map((item) => item.key);
  assert.deepEqual(active("/account/link/appearance"), ["edit"]);
  assert.deepEqual(active("/account/link/share"), ["share"]);
  assert.deepEqual(active("/account"), ["account"]);
  assert.deepEqual(active("/"), ["home"]);
});

test("Creator history, credits, and game rules do not activate unrelated mobile tabs", () => {
  for (const [product, path, hash, expected] of [
    ["creator", "/creator/history/123", "", "recent"],
    ["creator", "/creator/credits", "", "credits"],
    ["creator", "/", "#creator-recent-title", "recent"],
    ["creator", "/creator/create/post", "", "home"],
    ["games", "/kla-klok", "#kla-klok-rules", "rules"],
    ["games", "/kla-klok", "", "home"],
  ] as [Product, string, string, string][]) {
    assert.deepEqual(
      getProductMobileNavigation(product)
        .filter((item) => isProductMobileItemActive(product, item, path, hash))
        .map((item) => item.key),
      [expected],
    );
  }
});

test("Moment navigation retains Khmer without changing other products' targets", () => {
  assert.equal(
    mobileProductTarget("moment", "/moments", "km"),
    "/moments?lang=km",
  );
  assert.equal(
    mobileProductTarget("moment", "/?view=create#step", "km"),
    "/?view=create&lang=km#step",
  );
  assert.equal(mobileProductTarget("moment", "/moments", "en"), "/moments");
  assert.equal(
    mobileProductTarget("link", "/account/link", "km"),
    "/account/link",
  );
});
