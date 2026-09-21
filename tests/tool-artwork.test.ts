import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  STANDALONE_TOOL_ARTWORK_PATHS,
  getStandaloneToolArtworkPath,
} from "../app/lib/icon-assets.ts";

test("standalone tool artwork points to the supplied public images", () => {
  const keys = [
    "barcode",
    "expense-tracker",
    "image-compress",
    "payback-calculator",
    "qr",
    "lucky-draw",
    "wifi-qr",
  ];

  assert.deepEqual(Object.keys(STANDALONE_TOOL_ARTWORK_PATHS).sort(), keys.sort());
  for (const key of keys) {
    const path = getStandaloneToolArtworkPath(key);
    assert.ok(path?.startsWith("/images/icons/"));
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `${key} artwork is missing`);
  }
  assert.equal(getStandaloneToolArtworkPath("merge-pdf"), null);
});
