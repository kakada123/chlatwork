import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, {
  alias: { "~": new URL("../app", import.meta.url).pathname },
  fsCache: false,
});

test("enabled calendar loads the complete SEO guide catalog and has its own guide route", async () => {
  const guides = await jiti.import<any>("../app/data/tool-guides.ts");
  const calendar = guides.findToolGuideByToolRoute("/tools/khmer-calendar");
  assert.equal(calendar.tool.key, "khmer-calendar");
  assert.equal(calendar.path, "/how-to-use-khmer-calendar");
  assert.ok(calendar.faqs.length >= 3);
  assert.ok(calendar.metaDescription.includes("celebrations"));
});
