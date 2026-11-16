import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
test("later Tasks schema changes are delivered as an incremental update, not a rewritten creation script", () => {
  const initial = readFileSync(
    new URL("../database/2026-11-16-add-work-tasks.sql", import.meta.url),
    "utf8",
  );
  const update = readFileSync(
    new URL(
      "../database/updates/2026-11-16-update-work-tasks-milestones-validation.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal((initial.match(/CREATE TABLE/g) || []).length, 10);
  assert.doesNotMatch(initial, /is_milestone/);
  assert.match(update, /ADD COLUMN IF NOT EXISTS is_milestone/);
  assert.match(update, /pg_constraint/);
  assert.match(update, /NOT VALID/);
  assert.match(update, /BEGIN;/);
  assert.match(update, /COMMIT;/);
  assert.doesNotMatch(
    update.replace(/^--.*$/gm, ""),
    /CREATE TABLE|DROP TABLE|TRUNCATE|DELETE FROM/,
  );
  assert.match(update, /END;\s*\$tasks_update\$;/);
});
