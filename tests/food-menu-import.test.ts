import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import test from "node:test";
import { prepareFoodMenuCatalog } from "../scripts/prepare-food-menu-catalog.mjs";

const item = {
  slug: "bai-sach-chrouk",
  nameKm: "បាយសាច់ជ្រូក",
  nameEn: "Chef's pork rice",
  descriptionKm: "បាយជាមួយសាច់ជ្រូកអាំង។",
  descriptionEn: "Rice with pork \\ herbs.",
  category: "RICE",
  cuisine: "KHMER",
  mealTimes: ["breakfast"],
  ingredients: [{ nameKm: "សាច់ជ្រូក", nameEn: "Pork" }],
  tags: ["STREET_FOOD"],
};
async function fixture() {
  const parent = resolve(".tmp/food-menu-catalog");
  await mkdir(parent, { recursive: true });
  return mkdtemp(join(parent, "import-test-"));
}
async function batch(directory: string, number: number, items: unknown[]) {
  const file = join(directory, `batch-${String(number).padStart(2, "0")}.json`);
  await writeFile(
    file,
    JSON.stringify({ schemaVersion: 1, batchNumber: number, items }),
  );
  return file;
}

test("catalog importer escapes SQL literals and produces insert-only reviewable SQL without executing it", async () => {
  const directory = await fixture();
  const input = await batch(directory, 1, [item]);
  const output = join(directory, "import.sql");
  const result = await prepareFoodMenuCatalog({
    input,
    output,
    expectedCount: 1,
  });
  assert.equal(result.recordCount, 1);
  const sql = await readFile(output, "utf8");
  assert.ok(sql.includes("E'Chef''s pork rice'"));
  assert.ok(sql.includes("pork \\\\ herbs"));
  assert.match(sql, /ON CONFLICT DO NOTHING/);
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
  assert.doesNotMatch(sql, /\b(?:DELETE|TRUNCATE|UPDATE|DROP)\b/);
  await assert.rejects(
    prepareFoodMenuCatalog({ input, output, expectedCount: 1 }),
    /exist/i,
  );
});

test("catalog importer rejects duplicate normalized names across batches and wrong expected counts", async () => {
  const directory = await fixture();
  await batch(directory, 1, [item]);
  await batch(directory, 2, [
    {
      ...item,
      slug: "other-pork-rice",
      nameKm: "បាយសាច់ជ្រូកថ្មី",
      nameEn: "Chefs-pork rice!",
    },
  ]);
  await assert.rejects(
    prepareFoodMenuCatalog({
      input: directory,
      output: join(directory, "bad.sql"),
      expectedCount: 2,
    }),
    /duplicate.*nameEn/i,
  );
  const one = await fixture();
  await batch(one, 1, [item]);
  await assert.rejects(
    prepareFoodMenuCatalog({
      input: one,
      output: join(one, "bad.sql"),
      expectedCount: 1000,
    }),
    /1000/,
  );
});

test("catalog importer prepares exactly 1,000 records from 20 batches", async () => {
  const directory = await fixture();
  for (let number = 1; number <= 20; number++) {
    await batch(
      directory,
      number,
      Array.from({ length: 50 }, (_, index) => {
        const suffix = String((number - 1) * 50 + index + 1).padStart(4, "0");
        return {
          ...item,
          slug: `fixture-menu-${suffix}`,
          nameKm: `មុខម្ហូបសាកល្បង ${suffix}`,
          nameEn: `Fixture menu ${suffix}`,
        };
      }),
    );
  }
  const output = join(directory, "all.sql");
  const result = await prepareFoodMenuCatalog({
    input: directory,
    output,
    expectedCount: 1000,
  });
  assert.equal(result.recordCount, 1000);
  assert.equal(result.batchCount, 20);
  assert.equal(
    ((await readFile(output, "utf8")).match(/\(E'fixture-menu-/g) || []).length,
    1000,
  );
});
