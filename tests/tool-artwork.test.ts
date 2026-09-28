import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("tool cards use the shared vector icon system instead of artwork images", () => {
  const cardPaths = [
    "app/components/tools/ToolDirectoryCard.vue",
    "app/components/tools/MobileToolDirectoryCard.vue",
    "app/components/landing/HomeToolCard.vue",
    "app/components/landing/LandingToolCard.vue",
    "app/components/landing/MobileHomeToolCard.vue",
  ];

  for (const path of cardPaths) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /<ToolIcon\b/, `${path} must render ToolIcon`);
    assert.doesNotMatch(
      source,
      /ToolArtworkLink|artworkPath/,
      `${path} must not render image artwork`,
    );
  }

  const iconAssets = readFileSync(
    new URL("../app/lib/icon-assets.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    iconAssets,
    /STANDALONE_TOOL_ARTWORK_PATHS|getStandaloneToolArtworkPath/,
  );
});
