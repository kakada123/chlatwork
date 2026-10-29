import assert from "node:assert/strict";
import { readFile, mkdir, mkdtemp } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { prepareFoodMenuCatalog } from "../scripts/prepare-food-menu-catalog.mjs";
import {
  FOOD_MENU_CATEGORIES,
  FOOD_MENU_CUISINES,
  parseFoodMenuBatch,
} from "../api/src/food/catalog/food-menu.contract.ts";

test("the delivered seed contains exactly 1,000 valid, non-placeholder records with no excluded cuisine", async () => {
  const records: any[] = [];
  for (let index = 1; index <= 20; index++) {
    const source = await readFile(
      `data/food-menu-catalog/generated/batch-${String(index).padStart(2, "0")}.json`,
      "utf8",
    );
    const batch = parseFoodMenuBatch(JSON.parse(source));
    assert.equal(batch.items.length, 50);
    records.push(...batch.items);
  }
  assert.equal(records.length, 1000);
  assert.ok(records.some((item) => item.mealTimes.includes("breakfast")), "common breakfast foods must be discoverable");
  assert.ok(records.some((item) => item.tags.includes("STREET_FOOD")), "street-food discovery needs real tagged items");
  assert.equal(
    FOOD_MENU_CUISINES.some((option) => String(option.value) === "THAI"),
    false,
  );
  assert.doesNotMatch(
    JSON.stringify(records),
    /\bthai\b|ថៃ|fixture-menu|test-menu|សាកល្បង/iu,
  );
  assert.equal(
    FOOD_MENU_CATEGORIES.reduce((sum, item) => sum + item.target, 0),
    1000,
  );
  for (const category of FOOD_MENU_CATEGORIES)
    assert.equal(
      records.filter((item) => item.category === category.value).length,
      category.target,
    );
});

test("the standalone SQL matches the validated batches and upgrades the earlier category check before inserting", async () => {
  const root = resolve(".tmp/food-menu-catalog");
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, "seed-verification-"));
  await prepareFoodMenuCatalog({
    input: "data/food-menu-catalog/generated",
    output: join(directory, "import.sql"),
    expectedCount: 1000,
  });
  const prepared = await readFile(join(directory, "import.sql"), "utf8");
  const seed = await readFile(
    "database/seeds/2026-10-28-food-menu-catalog-1000.sql",
    "utf8",
  );
  assert.ok(seed.endsWith(prepared));
  const ddl = seed.slice(0, seed.indexOf("-- Food menu catalog: 1000"));
  assert.match(ddl, /DROP CONSTRAINT IF EXISTS food_menu_items_category_check/);
  assert.match(
    ddl,
    /ADD CONSTRAINT food_menu_items_category_check[\s\S]*'FAST_FOOD'/,
  );
  const manifest = JSON.parse(
    await readFile("data/food-menu-catalog/manifest.json", "utf8"),
  );
  assert.equal(
    createHash("sha256").update(seed).digest("hex"),
    manifest.sha256,
  );
});
