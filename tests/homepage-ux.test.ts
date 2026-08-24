import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("homepage stays focused instead of duplicating the complete tools directory", () => {
  const hero = readFileSync("app/components/landing/HeroSection.vue", "utf8");
  const landing = readFileSync("app/components/landing/LandingPage.vue", "utf8");

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

  assert.match(composable, /useState<ColorMode>\("color-mode", \(\) => "light"\)/);
  assert.match(composable, /getStoredColorMode\(\) \?\? getSystemColorMode\(\)/);
  assert.match(config, /storedMode === "light" \|\| storedMode === "dark"/);
  assert.match(config, /: "light";/);
});
