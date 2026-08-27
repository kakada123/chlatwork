import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("tools directory uses a dedicated mobile discovery composition", () => {
  const page = readFileSync("app/pages/tools/index.vue", "utf8");
  const mobile = readFileSync("app/components/tools/MobileToolsDirectory.vue", "utf8");
  const card = readFileSync("app/components/tools/MobileToolDirectoryCard.vue", "utf8");

  assert.match(page, /<MobileToolsDirectory class="sm:hidden"/);
  assert.match(page, /<div class="hidden space-y-8 sm:block">/);
  assert.match(mobile, /Explore tools/);
  assert.match(mobile, /input-id="mobile-tools-global-search"/);
  assert.match(mobile, /aria-label="Filter tools by category"/);
  assert.match(mobile, /dark:bg-white\/\[0\.12\]/);
  assert.match(mobile, /bg-white\/15 text-white/);
  assert.doesNotMatch(mobile, /dark:bg-cyan-300 dark:text-slate-950/);
  assert.match(mobile, /selectedCategoryKey/);
  assert.match(mobile, /grid grid-cols-2 gap-2/);
  assert.doesNotMatch(mobile, /aria-label="Mobile primary navigation"/);
  assert.match(card, /ToolFavoriteButton/);
  assert.match(card, /min-h-\[132px\]/);
});

test("mobile app shell owns the tools directory header and footer", () => {
  const layout = readFileSync("app/layouts/default.vue", "utf8");
  const bottomNav = readFileSync("app/components/layout/MobileBottomNav.vue", "utf8");

  assert.match(layout, /routesWithEmbeddedMobileChrome/);
  assert.match(layout, /<MobileBottomNav/);
  assert.match(layout, /mobile-navigation-action/);
  assert.match(bottomNav, /routePath\.startsWith\("\/tools"\)/);
});

test("the dedicated PDF category uses the current shared icon system", () => {
  const pdfCategory = readFileSync("app/pages/tools/pdf.vue", "utf8");

  assert.match(pdfCategory, /import ToolIcon from/);
  assert.match(pdfCategory, /getToolIconTone\(tool\.key\)/);
  assert.match(pdfCategory, /<ToolIcon :name="tool\.key"/);
  assert.doesNotMatch(pdfCategory, /getToolIconImagePath/);
});
