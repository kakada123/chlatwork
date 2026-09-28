import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../app/pages/admin/tools.vue", import.meta.url),
  "utf8",
);

test("tool availability rows use accessible auto-saving switches", () => {
  assert.match(source, /async function toggleAndSave\(row: FeatureRow\)/);
  assert.match(source, /draft\[row\.key\] = !draft\[row\.key\]/);
  assert.match(source, /await save\(row\)/);
  assert.match(source, /role="switch"/);
  assert.match(source, /:aria-checked="draft\[row\.key\]"/);
  assert.match(source, /@click="toggleAndSave\(row\)"/);
  assert.doesNotMatch(source, />\s*Save\s*</);
});

test("a failed auto-save restores the persisted availability state", () => {
  assert.match(
    source,
    /catch \{[\s\S]*draft\[row\.key\] = row\.enabled;[\s\S]*Could not save/,
  );
});
