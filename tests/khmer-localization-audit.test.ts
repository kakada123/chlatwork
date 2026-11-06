import assert from "node:assert/strict";
import test from "node:test";
import { auditVueSource } from "../scripts/audit-khmer-localization.mjs";

test("localization audit finds visible copy and accessibility text", () => {
  const findings = auditVueSource('<template><button aria-label="Close dialog">Save changes</button><input placeholder="Enter a name" /></template>');
  assert.deepEqual(findings.map(item => item.text), ["Close dialog", "Save changes", "Enter a name"]);
});

test("localization audit preserves Khmer, explicit language branches, code and format identifiers", () => {
  const findings = auditVueSource('<template><p>រក្សាទុក</p><span>PDF</span><pre>git status</pre><p lang="en">English instructions</p><p>{{ isKhmer ? "រក្សាទុក" : "Save" }}</p></template>');
  assert.deepEqual(findings, []);
});
