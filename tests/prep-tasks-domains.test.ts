import assert from "node:assert/strict";
import test from "node:test";
import {
  createDomainConfig,
  resolveHost,
  productForPath,
  productPath,
  legacyPath,
  productRouteRecords,
  navigationUrl,
} from "../app/lib/product-domains.ts";
test("PrepHub and Tasks domains remain gated until explicitly enabled", () => {
  assert.equal(
    resolveHost("prep.chlatwork.com", createDomainConfig()).kind,
    "unsupported",
  );
  assert.equal(
    resolveHost("tasks.chlatwork.com", createDomainConfig()).kind,
    "unsupported",
  );
  const config = createDomainConfig({ enabledProducts: "prep,tasks" });
  assert.deepEqual(resolveHost("prep.chlatwork.com", config), {
    kind: "product",
    product: "prep",
  });
  assert.deepEqual(resolveHost("tasks.chlatwork.com", config), {
    kind: "product",
    product: "tasks",
  });
  assert.equal(productForPath("/tasks"), "tasks");
  assert.equal(productForPath("/prephub/subject/review"), "prep");
  assert.equal(
    navigationUrl("/tasks?view=reports", config, "tasks"),
    "/?view=reports",
  );
});
test("PrepHub workspace and review paths work at the prep host root and preserve legacy aliases", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(productPath("prep", `/prephub/${id}/review`), `/${id}/review`);
  assert.equal(legacyPath("prep", `/${id}/review`), `/prephub/${id}/review`);
  assert.equal(legacyPath("prep", "/account"), "/account");
  assert.equal(productPath("tasks", "/tasks"), "/");
  const routes = productRouteRecords(
    [
      { path: "/" },
      { path: "/prephub" },
      { path: "/prephub/:id/review" },
      { path: "/account" },
    ],
    "prep",
  );
  assert.deepEqual(
    routes.map((r) => r.path),
    ["/", "/:id/review", "/account"],
  );
  assert.deepEqual(routes[1]!.alias, ["/prephub/:id/review"]);
});
