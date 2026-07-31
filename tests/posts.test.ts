import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { POSTS, findPostByPath } from "../app/data/posts.ts";
import {
  PUBLIC_SITEMAP_PATHS,
  getPublisherRobots,
  isMonetizableRoute,
} from "../app/data/site-routes.ts";

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the July 31 daily briefing is the first published post", () => {
  assert.equal(POSTS.length, 1);

  const post = POSTS[0];
  assert.equal(post.slug, "daily-briefing-july-31-2026");
  assert.equal(post.sections.length, 5);
  assert.equal(post.author, "Kakada Ngen");
  assert.equal(post.developerWatch.length, 6);
  assert.equal(post.securityWatch.length, 5);
  assert.equal(post.keyTakeaways.length, 5);
  assert.equal(findPostByPath(`${post.path}/`), post);
});

test("unsourced briefing is published but excluded from search and ads", () => {
  const path = POSTS[0].path;

  assert.equal(getPublisherRobots(path), "noindex, follow");
  assert.equal(isMonetizableRoute(path), false);
  assert.equal(PUBLIC_SITEMAP_PATHS.includes(path), false);
});

test("post page provides canonical, article metadata, authorship, and disclosure", () => {
  const source = readProjectFile("app/pages/posts/[postSlug].vue");

  assert.match(source, /rel: "canonical"/);
  assert.match(source, /"@type": "NewsArticle"/);
  assert.match(source, /datePublished/);
  assert.match(source, /EDITORIAL_AUTHOR/);
  assert.match(source, /Editorial note:/);
});
