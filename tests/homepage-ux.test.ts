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
});

test("homepage cards use semantic collections and calm interaction states", () => {
  const hero = readFileSync("app/components/landing/HeroSection.vue", "utf8");
  const card = readFileSync("app/components/landing/HomeToolCard.vue", "utf8");

  assert.match(hero, /<ul[^>]+aria-label="Popular tools"/);
  assert.match(card, /<NuxtLink/);
  assert.match(card, /focus-visible:ring-2/);
  assert.doesNotMatch(card, /translate-y|Open tool|rounded-full/);
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
  const footerGroup = readFileSync(
    "app/components/layout/FooterMenuGroup.vue",
    "utf8",
  );

  assert.match(layout, /const footerMenuGroups = computed/);
  assert.match(layout, /<FooterMenuGroup/);
  assert.match(layout, /<div class="hidden sm:grid sm:grid-cols-3 sm:gap-6">/);
  assert.match(layout, /py-4[^\"]*sm:py-8/);
  assert.match(layout, /class="flex min-h-\[100dvh\] flex-col/);
  assert.match(layout, /'hidden sm:block': route\.path === '\/tools\/expense-tracker'/);
  assert.match(footerGroup, /<nav class="space-y-3"/);
  assert.doesNotMatch(footerGroup, /<details|sm:hidden/);
});
