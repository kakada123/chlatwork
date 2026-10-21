import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { TOOL_GUIDE_ROUTES } from "../app/data/tool-guide-routes.ts";
import { CREATOR_ROUTE_PATHS } from "../app/data/creator-tools.ts";
import { DEVELOPER_GUIDE_PATHS } from "../app/data/developer-guides.ts";
import { STARTER_GUIDE_PATHS } from "../app/data/guides.ts";
import { POST_PATHS } from "../app/data/posts.ts";
import {
  ALL_TOOL_PAGE_PATHS,
  BETA_TOOL_PAGE_PATHS,
  COMMERCIAL_PAGE_PATHS,
  INDEXABLE_PAGE_PATHS,
  INDEXABLE_TOOL_PAGE_PATHS,
  LEGAL_PAGE_PATHS,
  NAVIGATION_ONLY_PAGE_PATHS,
  PUBLIC_SITEMAP_PATHS,
  getDisabledKhmerRedirect,
  getPublisherRobots,
} from "../app/data/site-routes.ts";

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("legacy generated guides permanently consolidate into unique tool canonicals", () => {
  assert.equal(
    TOOL_GUIDE_ROUTES.find((route) => route.toolKey === "stopwatch")?.toolPath,
    "/tools/stopwatch",
  );
  assert.equal(
    new Set(TOOL_GUIDE_ROUTES.map((route) => route.path)).size,
    TOOL_GUIDE_ROUTES.length,
  );

  for (const route of TOOL_GUIDE_ROUTES) {
    assert.match(route.path, /^\/how-to-/);
    assert.equal(
      route.toolPath,
      route.toolKey === "chlatwork-link" ? "/link" : `/tools/${route.toolKey}`,
    );
    assert.notEqual(route.path, route.toolPath);
  }
});

test("sitemap and robots metadata restore public tools and content pages", () => {
  const nuxtConfig = readProjectFile("nuxt.config.ts");
  const appShell = readProjectFile("app/app.vue");

  assert.deepEqual(PUBLIC_SITEMAP_PATHS, INDEXABLE_PAGE_PATHS);
  assert.deepEqual(INDEXABLE_TOOL_PAGE_PATHS, ALL_TOOL_PAGE_PATHS);
  assert.equal(new Set(PUBLIC_SITEMAP_PATHS).size, PUBLIC_SITEMAP_PATHS.length);

  for (const path of [
    "/",
    "/about",
    "/editorial-policy",
    "/contact",
    "/buy-me-coffee",
    "/link",
    "/tools",
    "/guides",
    "/posts",
    "/developer-commands",
    "/developer-guides",
    "/tools/pdf",
    "/tools/image",
    "/tools/qr-barcode",
    "/tools/date-time",
    "/tools/calculators",
    "/tools/productivity",
    ...ALL_TOOL_PAGE_PATHS,
    ...BETA_TOOL_PAGE_PATHS,
    ...COMMERCIAL_PAGE_PATHS,
    ...LEGAL_PAGE_PATHS,
    ...CREATOR_ROUTE_PATHS,
    ...DEVELOPER_GUIDE_PATHS,
    ...STARTER_GUIDE_PATHS,
    ...POST_PATHS,
  ]) {
    assert.equal(
      PUBLIC_SITEMAP_PATHS.includes(path),
      true,
      `${path} must be in the sitemap`,
    );
    assert.equal(
      getPublisherRobots(path),
      "index, follow",
      `${path} must permit indexing`,
    );
    if (path !== "/")
      assert.equal(getPublisherRobots(`${path}/`), "index, follow");
  }

  assert.match(nuxtConfig, /\.\.\.legacyToolGuideRedirectRules/);
  assert.match(nuxtConfig, /statusCode: 301/);
  assert.match(appShell, /getPublisherRobots\(normalizedPath\.value\)/);
});

test("private, unknown, and redirect-only URLs stay outside the public sitemap", () => {
  for (const path of [
    ...NAVIGATION_ONLY_PAGE_PATHS,
    "/account",
    "/account/link",
    "/account-link",
    "/login",
    "/admin",
    "/admin/tools",
    "/admin/bots",
    "/creator/credits",
    "/creator/admin/credits",
    "/creator/history/private-result",
    "/api/expenses/entries",
    "/api/bot/groups",
    "/m/private-moment",
    "/moment/private-moment",
    "/i/private-invitation",
    "/u/private-profile",
    "/creator/unknown-tool",
    "/tools/unknown-tool",
    "/privacy",
    "/km",
    "/km/tools/qr",
    "/tools/jpg-to-pdf",
    "/how-to-convert-jpg-to-pdf",
    ...TOOL_GUIDE_ROUTES.map((route) => route.path),
  ]) {
    assert.equal(
      PUBLIC_SITEMAP_PATHS.includes(path),
      false,
      `${path} must stay excluded`,
    );
    assert.equal(getPublisherRobots(path), "noindex, follow");
  }
  for (const path of PUBLIC_SITEMAP_PATHS) {
    assert.doesNotMatch(path, /[?#\[\]]/);
    assert.equal(getPublisherRobots(path), "index, follow");
  }
});

test("public pages inherit the central policy instead of retaining local noindex overrides", () => {
  for (const path of [
    "app/pages/creator/index.vue",
    "app/pages/creator/[...slug].vue",
    "app/pages/buy-me-coffee.vue",
  ]) {
    assert.doesNotMatch(readProjectFile(path), /robots:\s*"noindex/);
  }
  for (const path of [
    "app/pages/creator/credits.vue",
    "app/pages/creator/history/[id].vue",
    "app/pages/creator/admin/credits.vue",
    "app/pages/m/[slug].vue",
    "app/pages/i/[token].vue",
  ]) {
    assert.match(readProjectFile(path), /robots:\s*"noindex/);
  }
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
  assert.doesNotMatch(nuxtConfig, /connect\.facebook\.net|facebook\.com\/tr/);
  assert.match(nuxtConfig, /analytics_storage: "denied"/);
  assert.match(nuxtConfig, /ad_storage: "denied"/);
});

test("Khmer aliases remain redirects and beta tools retain their status notices", () => {
  const nuxtConfig = readProjectFile("nuxt.config.ts");
  const khmerMiddleware = readProjectFile(
    "app/middleware/disabled-khmer.global.ts",
  );
  const pdfLayout = readProjectFile(
    "app/components/pdf-tools/PdfToolPageLayout.vue",
  );

  assert.match(nuxtConfig, /"\/km"[\s\S]*?statusCode: 301/);
  assert.match(khmerMiddleware, /redirectCode: 301/);
  assert.equal(
    getDisabledKhmerRedirect("/km/tools/merge-pdf"),
    "/tools/merge-pdf",
  );
  assert.equal(getDisabledKhmerRedirect("/km/not-a-real-page"), "/");

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
    assert.match(
      source,
      new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
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
