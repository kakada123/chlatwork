import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { TOOL_GUIDE_ROUTES } from "../app/data/tool-guide-routes.ts";
import {
  BETA_TOOL_PAGE_PATHS,
  COMMERCIAL_PAGE_PATHS,
  INDEXABLE_PAGE_PATHS,
  INDEXABLE_TOOL_PAGE_PATHS,
  LEGAL_PAGE_PATHS,
  MONETIZABLE_PAGE_PATHS,
  NAVIGATION_ONLY_PAGE_PATHS,
  PUBLIC_SITEMAP_PATHS,
  getDisabledKhmerRedirect,
  getPublisherRobots,
  isMonetizableRoute,
} from "../app/data/site-routes.ts";

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("legacy generated guides permanently consolidate into unique tool canonicals", () => {
  assert.equal(TOOL_GUIDE_ROUTES.length, 32);
  assert.equal(
    new Set(TOOL_GUIDE_ROUTES.map((route) => route.path)).size,
    TOOL_GUIDE_ROUTES.length,
  );

  for (const route of TOOL_GUIDE_ROUTES) {
    assert.match(route.path, /^\/how-to-/);
    assert.equal(route.toolPath, `/tools/${route.toolKey}`);
    assert.notEqual(route.path, route.toolPath);
  }
});

test("publisher discovery uses explicit index and AdSense allowlists", () => {
  const siteRoutes = readProjectFile("app/data/site-routes.ts");
  const nuxtConfig = readProjectFile("nuxt.config.ts");
  const appShell = readProjectFile("app/app.vue");

  assert.deepEqual(PUBLIC_SITEMAP_PATHS, INDEXABLE_PAGE_PATHS);
  assert.equal(INDEXABLE_TOOL_PAGE_PATHS.length, 10);
  assert.equal(MONETIZABLE_PAGE_PATHS.includes("/"), false);

  for (const path of [
    ...BETA_TOOL_PAGE_PATHS,
    ...COMMERCIAL_PAGE_PATHS,
    ...LEGAL_PAGE_PATHS,
    ...NAVIGATION_ONLY_PAGE_PATHS,
  ]) {
    assert.equal(PUBLIC_SITEMAP_PATHS.includes(path), false);
    assert.equal(MONETIZABLE_PAGE_PATHS.includes(path), false);
    assert.equal(getPublisherRobots(path), "noindex, follow");
  }

  assert.match(nuxtConfig, /\.\.\.legacyToolGuideRedirectRules/);
  assert.match(nuxtConfig, /statusCode: 301/);
  assert.doesNotMatch(
    nuxtConfig,
    /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle/,
  );
  assert.match(appShell, /getPublisherRobots\(normalizedPath\.value\)/);
  assert.doesNotMatch(appShell, /adsbygoogle\.js/);
  assert.match(siteRoutes, /isMonetizableRoute/);
});

test("navigation does not recreate legacy guide URLs or unconsented trackers", () => {
  const files = [
    "app/layouts/default.vue",
    "app/pages/tools/index.vue",
    "app/components/landing/HomeGlobalSearch.vue",
    "app/components/tools/ToolContentLayout.vue",
  ];

  for (const file of files) {
    const source = readProjectFile(file);
    assert.doesNotMatch(source, /to="\/how-to-/);
    assert.doesNotMatch(source, /currentToolGuide\.path/);
  }

  const nuxtConfig = readProjectFile("nuxt.config.ts");
  const adLoader = readProjectFile("app/composables/useAdSense.ts");
  assert.doesNotMatch(nuxtConfig, /googletagmanager\.com/);
  assert.doesNotMatch(nuxtConfig, /connect\.facebook\.net|facebook\.com\/tr/);
  assert.match(adLoader, /CERTIFIED_AD_CONSENT_READY_EVENT/);
  assert.match(adLoader, /getElementById\(ADSENSE_SCRIPT_ID\)/);
  assert.match(adLoader, /isMonetizableRoute/);
});

test("Khmer and beta routes are permanently excluded from publishing", () => {
  const nuxtConfig = readProjectFile("nuxt.config.ts");
  const khmerMiddleware = readProjectFile(
    "app/middleware/disabled-khmer.global.ts",
  );
  const pdfLayout = readProjectFile(
    "app/components/pdf-tools/PdfToolPageLayout.vue",
  );

  assert.match(nuxtConfig, /"\/km"[\s\S]*?statusCode: 301/);
  assert.match(khmerMiddleware, /redirectCode: 301/);
  assert.equal(getDisabledKhmerRedirect("/km/tools/merge-pdf"), "/tools/merge-pdf");
  assert.equal(getDisabledKhmerRedirect("/km/not-a-real-page"), "/");

  for (const path of BETA_TOOL_PAGE_PATHS) {
    assert.equal(getPublisherRobots(path), "noindex, follow");
    assert.equal(isMonetizableRoute(path), false);
  }

  assert.match(pdfLayout, /tool\.status === 'beta'/);
  assert.match(pdfLayout, /tool\.betaNotice/);

  const pdfTools = readProjectFile("app/data/pdf-tools.ts");
  assert.match(pdfTools, /export type ToolEvidence/);
  assert.match(pdfTools, /knownFailureCases/);
  assert.match(pdfTools, /TODO\(content-evidence\)/);
});

test("indexed PDF guides contain workflow-specific content", () => {
  const source = readProjectFile("app/data/tool-guides.ts");

  for (const phrase of [
    "Page selection and output generation run in the browser.",
    "Merging is different from editing:",
    "printed page number displayed inside a report or book",
    "document boundaries",
  ]) {
    assert.match(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("tool-guide titles and descriptions are unique", () => {
  const source = readProjectFile("app/data/tool-guides.ts");
  const titles = [...source.matchAll(/metaTitle:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );
  const descriptions = [
    ...source.matchAll(/metaDescription:\s*\n?\s*"([^"]+)"/g),
  ].map((match) => match[1]);

  assert.ok(titles.length >= 32);
  assert.ok(descriptions.length >= 32);
  assert.equal(new Set(titles).size, titles.length);
  assert.equal(new Set(descriptions).size, descriptions.length);
});
