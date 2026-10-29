import { readFile, readdir, lstat, mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Reuse the API's validator without a second implementation or requiring Node's experimental TS loader.
const require = createRequire(new URL("../api/package.json", import.meta.url));
const ts = require("typescript");
const contractSource = readFileSync(
  new URL("../api/src/food/catalog/food-menu.contract.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(contractSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const contract = { exports: {} };
new Function("module", "exports", compiled)(contract, contract.exports);
const { parseFoodMenuBatch, foodMenuNameKey } = contract.exports;

function sqlText(value) {
  return `E'${value.replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}
function sqlArray(values) {
  return `ARRAY[${values.map(sqlText).join(", ")}]::text[]`;
}
const BATCH_FILE = /^batch-(0[1-9]|1[0-9]|20)\.json$/;

export async function prepareFoodMenuCatalog({
  input,
  output,
  expectedCount = 1000,
}) {
  if (
    !input ||
    !output ||
    !Number.isInteger(expectedCount) ||
    expectedCount < 1 ||
    expectedCount > 1000
  )
    throw new Error(
      "Provide --input, --output and an expected count from 1 to 1000.",
    );
  if (extname(output).toLowerCase() !== ".sql")
    throw new Error("Output must be a new .sql file.");
  const source = resolve(input),
    target = resolve(output);
  const info = await lstat(source);
  if (info.isSymbolicLink())
    throw new Error("Symbolic-link inputs are not supported.");
  let files;
  if (info.isDirectory()) {
    const entries = await readdir(source, { withFileTypes: true });
    files = entries
      .filter((entry) => BATCH_FILE.test(entry.name))
      .map((entry) => resolve(source, entry.name))
      .sort();
  } else if (info.isFile() && BATCH_FILE.test(basename(source)))
    files = [source];
  else
    throw new Error(
      "Input must be a directory or a file named batch-01.json through batch-20.json.",
    );
  if (!files.length || files.length > 20)
    throw new Error(
      "Expected 1-20 files named batch-01.json through batch-20.json.",
    );

  const rows = [],
    batches = new Set();
  const unique = { slug: new Set(), nameKm: new Set(), nameEn: new Set() };
  for (const file of files) {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 512000)
      throw new Error(
        `${basename(file)}: expected a regular JSON file no larger than 500 KB.`,
      );
    let parsed;
    try {
      parsed = JSON.parse(
        (await readFile(file, "utf8")).replace(/^\uFEFF/, ""),
      );
    } catch {
      throw new Error(
        `${basename(file)}: invalid JSON. Save only the JSON object, without Markdown fences.`,
      );
    }
    const batch = parseFoodMenuBatch(parsed);
    if (
      basename(file) !==
        `batch-${String(batch.batchNumber).padStart(2, "0")}.json` ||
      batches.has(batch.batchNumber)
    )
      throw new Error(
        `${basename(file)}: inconsistent or duplicate batchNumber.`,
      );
    batches.add(batch.batchNumber);
    for (const item of batch.items) {
      for (const field of ["slug", "nameKm", "nameEn"]) {
        const key = field === "slug" ? item.slug : foodMenuNameKey(item[field]);
        if (unique[field].has(key))
          throw new Error(
            `${basename(file)}: duplicate ${field} across batches.`,
          );
        unique[field].add(key);
      }
      rows.push({ item, batch: basename(file) });
    }
  }
  if (rows.length !== expectedCount)
    throw new Error(
      `Expected ${expectedCount} records; received ${rows.length}. No SQL was written.`,
    );
  const values = rows
    .map(
      ({ item, batch }) =>
        `  (${[
          sqlText(item.slug),
          sqlText(item.nameKm),
          sqlText(item.nameEn),
          sqlText(foodMenuNameKey(item.nameKm)),
          sqlText(foodMenuNameKey(item.nameEn)),
          sqlText(item.descriptionKm),
          sqlText(item.descriptionEn),
          sqlText(item.category),
          sqlText(item.cuisine),
          sqlArray(item.mealTimes),
          `${sqlText(JSON.stringify(item.ingredients))}::jsonb`,
          sqlArray(item.tags),
          sqlText(batch),
        ].join(", ")})`,
    )
    .join(",\n");
  const sql = `-- Food menu catalog: ${rows.length} validated records in ${batches.size} batches.\n-- Review before manual execution; existing conflicts are preserved.\n-- First apply database/updates/2026-10-28-add-food-menu-catalog.sql.\nBEGIN;\nINSERT INTO food_menu_items\n  (slug, name_km, name_en, name_key_km, name_key_en, description_km, description_en, category, cuisine, meal_times, ingredients, tags, import_batch)\nVALUES\n${values}\nON CONFLICT DO NOTHING;\nCOMMIT;\n`;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, sql, { encoding: "utf8", flag: "wx" });
  return { recordCount: rows.length, batchCount: batches.size, output: target };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(
      "npm run food:catalog:prepare -- --input <batch directory or batch-NN.json> --output <new.sql> [--expect-count 1000]",
    );
    return;
  }
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index],
      value = args[index + 1];
    if (
      !["--input", "--output", "--expect-count"].includes(key) ||
      !value ||
      value.startsWith("--") ||
      Object.hasOwn(options, key)
    )
      throw new Error("Invalid arguments. Use --help for usage.");
    options[key] = value;
  }
  const count =
    options["--expect-count"] === undefined
      ? 1000
      : /^\d+$/.test(options["--expect-count"])
        ? Number(options["--expect-count"])
        : NaN;
  const result = await prepareFoodMenuCatalog({
    input: options["--input"],
    output: options["--output"],
    expectedCount: count,
  });
  console.log(
    `Prepared ${result.recordCount} records from ${result.batchCount} batches: ${result.output}`,
  );
  console.log("No database connection or SQL execution was performed.");
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Catalog preparation failed.",
    );
    process.exitCode = 1;
  });
}
