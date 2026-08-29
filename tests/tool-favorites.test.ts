import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";

test("favorites require login and use account APIs without browser storage fallback", () => {
  const accountFavorites = readFileSync(new URL("../app/composables/useAccountFavorites.ts", import.meta.url), "utf8");
  const toolFavorites = readFileSync(new URL("../app/composables/useToolFavorites.ts", import.meta.url), "utf8");
  const commandFavorites = readFileSync(new URL("../app/composables/useCommandFavorites.ts", import.meta.url), "utf8");
  const syncPluginUrl = new URL("../app/plugins/favorites-sync.client.ts", import.meta.url);

  assert.match(accountFavorites, /\$fetch<FavoritesResponse>\("\/api\/favorites"\)/);
  assert.match(accountFavorites, /method: "PUT"/);
  assert.match(accountFavorites, /path: "\/login"/);
  assert.match(accountFavorites, /favoritesLoadedForUserId\.value !== userId/);
  assert.equal(existsSync(syncPluginUrl), false);
  assert.doesNotMatch(accountFavorites, /addEventListener\("focus"|visibilitychange/);
  assert.match(toolFavorites, /validToolKeys\.has\(toolKey\)/);
  assert.match(commandFavorites, /validCommandIds\.has\(id\)/);
  assert.doesNotMatch(accountFavorites + toolFavorites + commandFavorites, /localStorage|sessionStorage/);
  assert.doesNotMatch(accountFavorites, /chlatwork_tool_favorites|chlatwork_developer_command_favorites/);
});

test("favorites are protected account-owned PostgreSQL data", () => {
  const schema = readFileSync(new URL("../api/prisma/schema.prisma", import.meta.url), "utf8");
  const controller = readFileSync(new URL("../api/src/favorites/favorites.controller.ts", import.meta.url), "utf8");
  const service = readFileSync(new URL("../api/src/favorites/favorites.service.ts", import.meta.url), "utf8");
  const appModule = readFileSync(new URL("../api/src/app.module.ts", import.meta.url), "utf8");
  const getProxy = readFileSync(new URL("../server/api/favorites/index.get.ts", import.meta.url), "utf8");
  const putProxy = readFileSync(new URL("../server/api/favorites/index.put.ts", import.meta.url), "utf8");
  const sql = readFileSync(new URL("../database/2026-08-29-add-account-favorites.sql", import.meta.url), "utf8");

  assert.match(schema, /enum FavoriteKind[\s\S]*TOOL[\s\S]*COMMAND/);
  assert.match(schema, /model UserFavorite/);
  assert.match(schema, /@@unique\(\[userId, kind, itemKey\]\)/);
  assert.match(controller, /@UseGuards\(JwtAuthGuard\)/);
  assert.match(controller, /@Get\(\)/);
  assert.match(controller, /@Put\(\)/);
  assert.match(service, /userId_kind_itemKey/);
  assert.match(service, /deleteMany\(\{[\s\S]*where: \{ userId, kind: dto\.kind, itemKey: dto\.itemKey \}/);
  assert.match(appModule, /FavoritesModule/);
  assert.match(getProxy, /requestAuthenticatedApi\(event, "\/favorites"\)/);
  assert.match(putProxy, /requestAuthenticatedApi\(event, "\/favorites"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS user_favorites/);
  assert.match(sql, /REFERENCES users\(id\) ON DELETE CASCADE/);
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
  assert.match(page, /Synced securely to your signed-in account/);
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
  assert.match(button, /"Favorited" : "Favorite"/);
  assert.match(button, /Sign in to save favorites/);
});
