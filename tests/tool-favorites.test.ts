import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("tool favorites persist only public tool keys", () => {
  const source = readFileSync(new URL("../app/composables/useToolFavorites.ts", import.meta.url), "utf8");
  assert.match(source, /chlatwork_tool_favorites/);
  assert.match(source, /validKeys\.has\(key\)/);
  assert.doesNotMatch(source, /JSON\.stringify\([^)]*(description|route|input)/i);
});

test("favorite controls are available through shared tool cards", () => {
  const home = readFileSync(new URL("../app/components/landing/HeroSection.vue", import.meta.url), "utf8");
  const homeCard = readFileSync(new URL("../app/components/landing/HomeToolCard.vue", import.meta.url), "utf8");
  const directory = readFileSync(new URL("../app/pages/tools/index.vue", import.meta.url), "utf8");
  const directoryCard = readFileSync(new URL("../app/components/tools/ToolDirectoryCard.vue", import.meta.url), "utf8");
  assert.match(home, /HomeToolCard/);
  assert.match(homeCard, /ToolFavoriteButton/);
  assert.match(directory, /ToolDirectoryCard/);
  assert.match(directoryCard, /ToolFavoriteButton/);
  assert.doesNotMatch(directory, /favoritesOnly/);
});

test("profile combines all favorite tools and commands", () => {
  const page = readFileSync(new URL("../app/pages/account.vue", import.meta.url), "utf8");
  assert.match(page, /useToolFavorites/);
  assert.match(page, /useCommandFavorites/);
  assert.match(page, /import CommandQuickCard from "~\/components\/developer-commands\/CommandQuickCard\.vue"/);
  assert.match(page, /import HomeToolCard from "~\/components\/landing\/HomeToolCard\.vue"/);
  assert.match(page, /CommandQuickCard/);
  assert.match(page, /HomeToolCard/);
  assert.doesNotMatch(page, /favoriteTools\.slice|favoriteCommands\.slice/);
});

test("favorite control is present across tool card renderers", () => {
  const cardFiles = [
    "../app/components/landing/HomeToolCard.vue",
    "../app/components/landing/LandingToolCard.vue",
    "../app/components/tools/ToolDirectoryCard.vue",
    "../app/pages/tools/pdf.vue",
    "../app/components/tools/ToolContentLayout.vue",
    "../app/components/pdf-tools/PdfRelatedTools.vue",
  ];

  for (const file of cardFiles) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /ToolFavoriteButton/, `${file} is missing the favorite control`);
  }
});

test("every registered tool detail route receives the shared favorite action", () => {
  const layout = readFileSync(new URL("../app/layouts/default.vue", import.meta.url), "utf8");
  const button = readFileSync(new URL("../app/components/tools/ToolFavoriteButton.vue", import.meta.url), "utf8");

  assert.match(layout, /v-if="currentToolGuide\?\.tool"/);
  assert.match(layout, /<ToolFavoriteButton/);
  assert.match(layout, /:tool-key="currentToolGuide\.tool\.key"/);
  assert.match(layout, /show-label/);
  assert.match(button, /showLabel\?: boolean/);
  assert.match(button, /favorite \? "Favorited" : "Favorite"/);
});
