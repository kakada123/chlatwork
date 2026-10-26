import assert from "node:assert/strict";
import test from "node:test";
import { createDomainConfig, resolveHost } from "../app/lib/product-domains.ts";
import { sitemapUrls, robotsText } from "../app/lib/product-seo.ts";

const config = createDomainConfig({ enabledProducts: "creator,link,moment,expense,draw,games", canonicalProducts: "creator,link,moment,expense,draw,games" });
const paths = ["/", "/creator", "/creator/create/post", "/link", "/tools/qr", "/tools/lucky-draw", "/tools/expense-tracker", "/tools/kla-klok"];

test("main sitemap excludes migrated products but retains unrelated utilities", () => {
  const urls = sitemapUrls(paths, config, resolveHost("chlatwork.com", config));
  assert.deepEqual(urls, ["https://chlatwork.com/", "https://chlatwork.com/tools/qr"]);
});
test("each product sitemap includes only its own indexable pages", () => {
  assert.deepEqual(sitemapUrls(paths, config, resolveHost("creator.chlatwork.com", config)), ["https://creator.chlatwork.com/", "https://creator.chlatwork.com/creator/create/post"]);
  assert.deepEqual(sitemapUrls(paths, config, resolveHost("games.chlatwork.com", config)), ["https://games.chlatwork.com/kla-klok"]);
  assert.deepEqual(sitemapUrls(paths, config, resolveHost("moment.chlatwork.com", config)), []);
});
test("unactivated and preview hosts are not indexable", () => {
  const staged = createDomainConfig({ enabledProducts: "creator", previewOrigins: "https://review.example.test" });
  const context = resolveHost("creator.chlatwork.com", staged);
  assert.deepEqual(sitemapUrls(paths, staged, context), []);
  assert.match(robotsText(staged, context), /Disallow: \/\n/);
  assert.match(robotsText(staged, resolveHost("review.example.test", staged)), /Disallow: \/\n/);
  assert.match(robotsText(config, resolveHost("link.chlatwork.com", config)), /Sitemap: https:\/\/link.chlatwork.com\/sitemap.xml/);
});

test("production robots preserves crawl access for shared Moments and public profile media", () => {
  const text = robotsText(config, resolveHost("moment.chlatwork.com", config));
  assert.doesNotMatch(text, /Disallow: \/(?:m\/|moment\/|i\/|api\/)/);
});
