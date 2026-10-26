import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Exercise the actual packaged router without live services, sessions, sockets or env files.
process.env.NUXT_AUTH_API_BASE_URL = "https://jekluy-fixture.invalid";
process.env.NUXT_PUBLIC_DOMAINS_MAIN_ORIGIN = "https://chlatwork.com";
process.env.NUXT_PUBLIC_DOMAINS_PRODUCT_ORIGINS = "{}";
process.env.NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS = "creator,link,moment,expense,draw,games,jekluy";
process.env.NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS = "creator,link,moment,expense,draw,games,jekluy";
process.env.NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS = "";
process.env.NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS = "https://jekluy-preview.example.test";
let externalRequests = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  externalRequests++;
  throw new Error("JekLuy must render without backend access");
};

const output = (await readFile(".tmp/subdomains/latest-output.txt", "utf8")).trim();
await import(pathToFileURL(`${output}/functions/__fallback.func/index.mjs`).href);
const runtime = await import(pathToFileURL(`${output}/functions/__fallback.func/chunks/nitro/nitro.mjs`).href);
const useNitroApp = Object.values(runtime).find((value) => typeof value === "function" && value.name === "useNitroApp");
assert.equal(typeof useNitroApp, "function");
const app = useNitroApp();
const request = (host, path) => app.localFetch(path, { headers: { host } });
let checks = 0;
try {
  for (const [host, path, expectedCanonical] of [
    ["jekluy.chlatwork.com", "/", "https://jekluy.chlatwork.com/"],
    ["jekluy.chlatwork.com", "/?from=friend#results", "https://jekluy.chlatwork.com/"],
    ["chlatwork.com", "/jekluy", "https://jekluy.chlatwork.com/"],
    ["jekluy-preview.example.test", "/jekluy", "https://jekluy.chlatwork.com/"],
  ]) {
    const response = await request(host, path);
    const html = await response.text();
    assert.equal(response.status, 200, `${host}${path}`);
    assert.match(html, /lang="km"/);
    assert.match(html, /<title>ចែកលុយ/);
    assert.ok(html.includes(`rel="canonical" href="${expectedCanonical}"`));
    assert.equal((html.match(/id="name-person-/g) || []).length, 2);
    assert.match(html, /inputmode="numeric"/);
    assert.match(html, /មិនបាច់ចូលគណនី/);
    assert.equal(html.includes("product-mobile-nav fixed"), false);
    assert.equal(html.includes("Ads by"), false);
    if (host.includes("preview")) assert.match(response.headers.get("x-robots-tag"), /noindex/);
    checks += 9;
    if (host === "jekluy.chlatwork.com" && path === "/") {
      await mkdir(".tmp/jekluy", { recursive: true });
      await writeFile(".tmp/jekluy/root.html", html);
    }
  }
  assert.equal(externalRequests, 0, "No auth, availability or calculation request may be needed");
  const sitemap = await request("jekluy.chlatwork.com", "/sitemap.xml");
  assert.equal(await sitemap.text(), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://jekluy.chlatwork.com/</loc></url></urlset>');
  assert.match(await (await request("jekluy.chlatwork.com", "/robots.txt")).text(), /Sitemap: https:\/\/jekluy.chlatwork.com\/sitemap.xml/);
  assert.equal((await request("jekluy.chlatwork.com", "/unconfigured-page")).status, 404);
  process.env.NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS = "creator,link,moment,expense,draw,games";
  const staged = await request("jekluy.chlatwork.com", "/");
  assert.match(staged.headers.get("x-robots-tag"), /noindex/);
  assert.equal((await (await request("jekluy.chlatwork.com", "/sitemap.xml")).text()).includes("<loc>"), false);
  process.env.NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS = "creator,link,moment,expense,draw,games";
  assert.equal((await request("jekluy.chlatwork.com", "/")).status, 404);
  checks += 7;
  console.log(`Passed ${checks} JekLuy packaged-server routing, SEO and local-only checks. No live services or database used.`);
} finally {
  globalThis.fetch = originalFetch;
}
