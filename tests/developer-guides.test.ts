import assert from "node:assert/strict";
import test from "node:test";
import { DEVELOPER_GUIDES, DEVELOPER_GUIDE_PATHS } from "../app/data/developer-guides.ts";

test("ships five complete, uniquely routed developer guides", () => {
  assert.equal(DEVELOPER_GUIDES.length, 5);
  assert.equal(new Set(DEVELOPER_GUIDE_PATHS).size, 5);
  for (const guide of DEVELOPER_GUIDES) {
    assert.ok(guide.steps.length >= 5, `${guide.slug} needs at least five steps`);
    assert.ok(guide.prerequisites.length >= 3);
    assert.ok(guide.verification.length >= 4);
    assert.equal(guide.path, `/developer-guides/${guide.slug}`);
  }
});

test("examples stay generic and risky operations carry context", () => {
  const serialized = JSON.stringify(DEVELOPER_GUIDES).toLowerCase();
  for (const privateTerm of ["scan-and-go", "kakada", "chlatwork_web"]) {
    assert.equal(serialized.includes(privateTerm), false);
  }
  assert.match(serialized, /<app-name>/);
  assert.match(serialized, /never expose 5432 or 6379/);
  assert.match(serialized, /keep the current root session open/);
});

test("guide SEO titles and descriptions are present and unique", () => {
  assert.equal(new Set(DEVELOPER_GUIDES.map((guide) => guide.metaTitle)).size, 5);
  for (const guide of DEVELOPER_GUIDES) {
    assert.ok(guide.metaTitle.length > 20);
    assert.ok(guide.metaDescription.length > 50);
  }
});
