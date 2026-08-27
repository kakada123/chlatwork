import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("homepage stays focused instead of duplicating the complete tools directory", () => {
  const hero = readFileSync("app/components/landing/HeroSection.vue", "utf8");
  const landing = readFileSync(
    "app/components/landing/LandingPage.vue",
    "utf8",
  );

  assert.match(hero, /popularTools\.slice\(0, 6\)/);
  assert.match(hero, /Start with a popular tool/);
  assert.match(hero, /HomeToolCard/);
  assert.match(landing, /HOME_CATEGORY_COPY/);
  assert.match(landing, /Work with PDFs/);
  assert.match(landing, /Developer utilities/);
  assert.match(landing, /getPopularToolUsage/);
  assert.match(landing, /shuffledToolKeys/);
});

test("homepage cards use semantic collections and calm interaction states", () => {
  const hero = readFileSync("app/components/landing/HeroSection.vue", "utf8");
  const card = readFileSync("app/components/landing/HomeToolCard.vue", "utf8");

  assert.match(hero, /<ul[^>]+aria-label="Popular tools"/);
  assert.match(card, /<NuxtLink/);
  assert.match(card, /focus-visible:ring-2/);
  assert.doesNotMatch(card, /translate-y|Open tool|rounded-full/);
});

test("homepage uses compact, touch-friendly mobile discovery patterns", () => {
  const landing = readFileSync(
    "app/components/landing/LandingPage.vue",
    "utf8",
  );
  const mobile = readFileSync(
    "app/components/landing/MobileLandingPage.vue",
    "utf8",
  );
  const mobileCard = readFileSync(
    "app/components/landing/MobileHomeToolCard.vue",
    "utf8",
  );
  const bottomNav = readFileSync(
    "app/components/layout/MobileBottomNav.vue",
    "utf8",
  );

  assert.match(landing, /<MobileLandingPage/);
  assert.match(landing, /class="sm:hidden"/);
  assert.match(landing, /<div class="hidden sm:block">/);
  assert.match(mobile, /aria-label="Mobile tool categories"/);
  assert.match(mobile, /Good morning/);
  assert.match(mobile, /mobile-featured-item-title/);
  assert.match(mobile, /line-clamp-2 h-14 text-2xl/);
  assert.match(mobile, /line-clamp-2 h-10 text-sm/);
  assert.match(mobile, /FEATURED_ROTATION_INTERVAL_MS = 6_000/);
  assert.match(mobile, /setInterval/);
  assert.match(mobile, /prefers-reduced-motion: reduce/);
  assert.match(mobile, /aria-label="Choose featured item"/);
  assert.match(mobile, /@click="selectFeaturedItem\(index\)"/);
  assert.match(mobile, /name: "Create a Moment"/);
  assert.match(mobile, /route: "\/moments\/create"/);
  assert.match(mobile, /kind: "moment"/);
  assert.doesNotMatch(
    mobile.slice(
      mobile.indexOf("const FEATURED_ITEM_IDS"),
      mobile.indexOf("const FEATURED_ROTATION_INTERVAL_MS"),
    ),
    /image-compress/,
  );
  assert.match(mobile, /Continue where you left off/);
  assert.match(mobile, /getToolUsageSummary/);
  assert.match(mobile, /id="mobile-favorite-tools-title"/);
  assert.match(mobile, /favoritesReady && favoriteTools\.length/);
  assert.match(mobile, /aria-label="Favorite tools"/);
  assert.doesNotMatch(mobile, /recentTools\.value\.length \? recentTools\.value : favoriteTools\.value/);
  assert.match(bottomNav, /aria-label="Mobile primary navigation"/);
  assert.match(bottomNav, /env\(safe-area-inset-bottom\)/);
  assert.match(mobile, /input-id="mobile-home-global-search"/);
  assert.doesNotMatch(mobile, /aria-label="Mobile primary navigation"/);
  assert.match(landing, /pb-24[^\"]*sm:pb-0/);
  assert.match(mobile, /grid grid-cols-4 gap-2/);
  assert.match(mobile, /MobileHomeToolCard/);
  assert.match(mobileCard, /variant === 'recent'/);
  assert.match(mobileCard, /min-h-\[108px\][^\"]*flex-col/);
});

test("new visitors receive the light-first theme while saved preferences still win", () => {
  const composable = readFileSync("app/composables/useColorMode.ts", "utf8");
  const config = readFileSync("nuxt.config.ts", "utf8");
  const app = readFileSync("app/app.vue", "utf8");
  const styles = readFileSync("app/assets/css/main.css", "utf8");

  assert.match(
    composable,
    /useState<ColorMode>\("color-mode", \(\) => "light"\)/,
  );
  assert.match(
    composable,
    /getStoredColorMode\(\) \?\? getSystemColorMode\(\)/,
  );
  assert.match(config, /storedMode === "light" \|\| storedMode === "dark"/);
  assert.match(config, /: "light";/);
  assert.match(config, /key: "color-mode-init"/);
  assert.match(config, /innerHTML: colorModeScript/);
  assert.doesNotMatch(
    config,
    /key: "color-mode-init",\s*children: colorModeScript/,
  );
  assert.match(config, /tagPriority: "critical"/);
  assert.doesNotMatch(app, /class: isDark\.value \? "dark"/);
  assert.doesNotMatch(app, /"data-theme": isDark\.value/);
  assert.match(composable, /dataset\.themeTransitioning = "true"/);
  assert.match(styles, /html\[data-theme-transitioning\] body \*/);
});

test("mobile footer removes secondary navigation and dead scroll", () => {
  const layout = readFileSync("app/layouts/default.vue", "utf8");
  const bottomNav = readFileSync("app/components/layout/MobileBottomNav.vue", "utf8");
  const quickExpense = readFileSync(
    "app/components/expense-tracker/QuickExpenseFab.vue",
    "utf8",
  );
  const footerGroup = readFileSync(
    "app/components/layout/FooterMenuGroup.vue",
    "utf8",
  );

  assert.match(layout, /const footerMenuGroups = computed/);
  assert.match(layout, /<FooterMenuGroup/);
  assert.match(layout, /<div class="hidden sm:grid sm:grid-cols-3 sm:gap-6">/);
  assert.match(layout, /class="site-footer[^\"]*hidden[^\"]*sm:block"/);
  assert.match(layout, /class="flex min-h-\[100dvh\] flex-col/);
  assert.match(layout, /<MobileBottomNav/);
  assert.match(layout, /mobile-navigation-action/);
  assert.match(quickExpense, /left-1\/2 size-14 -translate-x-1\/2/);
  assert.match(quickExpense, /aria-label="Add expense"/);
  assert.match(quickExpense, /v-if="!props\.mobileNavigationAction"/);
  assert.match(
    bottomNav,
    /showQuickExpenseSlot \? 'grid-cols-5' : 'grid-cols-4'/,
  );
  assert.match(footerGroup, /<nav class="space-y-3"/);
  assert.doesNotMatch(footerGroup, /<details|sm:hidden/);
});
