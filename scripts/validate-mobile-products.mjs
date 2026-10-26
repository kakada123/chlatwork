import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createLinkProfile } from "../app/lib/link-profile.ts";

// Render disposable fixtures through the packaged server; do not use real sessions or live services.
process.env.NUXT_AUTH_API_BASE_URL = "https://mobile-fixture.invalid";
process.env.NUXT_PUBLIC_DOMAINS_MAIN_ORIGIN = "https://chlatwork.com";
process.env.NUXT_PUBLIC_DOMAINS_PRODUCT_ORIGINS = "{}";
process.env.NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS = "";
process.env.NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS = "creator,link,moment,expense,draw,games";
process.env.NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS = "creator,link,moment,expense,draw,games";
process.env.NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS = "";
const profile = { ...createLinkProfile("Demo account"), slug: "demo-profile", isPublished: true };
const user = { id: "00000000-0000-4000-8000-000000000001", name: "Demo account", role: "USER", email: null, phone: null, avatarUrl: null, providers: ["GOOGLE"] };
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input.url || input));
  assert.equal(url.origin, "https://mobile-fixture.invalid", "Mobile fixtures must never contact live services");
  assert.equal(options?.method || "GET", "GET", "UI rendering must not write fixture data");
  let data;
  if (url.pathname === "/feature-availability") data = { disabled: [] };
  else if (url.pathname === "/auth/me") data = user;
  else if (url.pathname === "/profiles/me" || url.pathname === "/public/profiles/demo-profile") data = profile;
  else if (url.pathname === "/moments/mine") data = [];
  else if (url.pathname === "/favorites") data = { toolKeys: [], commandKeys: [] };
  else if (url.pathname === "/expenses/profile") data = { currency: "USD", budgetPeriod: "monthly", budgetAmount: "" };
  else if (url.pathname === "/expenses/summary") data = { itemsCount: 0, totalIncome: 0, totalSpent: 0, categoryBreakdown: [], dailyTrend: [] };
  else if (url.pathname === "/expenses/quick-entry/settings") data = { enabled: false, currency: "USD" };
  else throw new Error(`Unexpected fixture API route: ${url.pathname}`);
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
};

const output = (await readFile(".tmp/subdomains/latest-output.txt", "utf8")).trim();
await import(pathToFileURL(`${output}/functions/__fallback.func/index.mjs`).href);
const runtime = await import(pathToFileURL(`${output}/functions/__fallback.func/chunks/nitro/nitro.mjs`).href);
const useNitroApp = Object.values(runtime).find((value) => typeof value === "function" && value.name === "useNitroApp");
const app = useNitroApp();
await mkdir(".tmp/mobile-products", { recursive: true });
const cases = [
  ["creator", "/", "creator-home", "Search Creator tools"],
  ["link", "/", "link-home", "Manage your page"],
  ["link", "/account/link/appearance", "link-editor", "Editor view"],
  ["link", "/account/link/share", "link-share", "Share your page"],
  ["moment", "/?lang=km", "moment-create-km", "moment-product-mobile"],
  ["moment", "/moments?lang=km", "moment-manager-km", "moment-product-mobile"],
  ["expense", "/", "expense-home", "Overview"],
  ["draw", "/", "draw-home", "draw-options"],
  ["games", "/kla-klok", "games-home", "How to play &amp; rules"],
];
try {
  for (const [product, path, name, expected] of cases) {
    const response = await app.localFetch(path, { headers: { host: `${product}.chlatwork.com`, cookie: "chlatwork_access_token=fixture-only-token" } });
    const html = await response.text();
    assert.equal(response.status, 200, `${name}: rendered status`);
    assert.ok(html.includes(expected), `${name}: primary mobile control is present`);
    assert.ok(html.includes("product-mobile-nav"), `${name}: product navigation is present`);
    if (product === "link" && path === "/account/link/share") assert.ok(html.includes("https://link.chlatwork.com/u/demo-profile"));
    // Static review artifacts omit scripts and use local build assets; they are not live browser proof.
    const snapshot = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<link\b[^>]*rel="modulepreload"[^>]*>/gi, "")
      .replace(/\s+crossorigin(?:="[^"]*")?/gi, "")
      .replace(/(href|src)="\/(?!\/)/g, `$1="${pathToFileURL(`${output}/static/`).href}`);
    await writeFile(`.tmp/mobile-products/${name}.html`, snapshot);
  }
  const publicProfile = await app.localFetch("/u/demo-profile", { headers: { host: "link.chlatwork.com" } });
  assert.equal(publicProfile.status, 200);
  assert.equal((await publicProfile.text()).includes("product-mobile-nav"), false, "Public profiles retain their standalone canvas");
  console.log(`Passed ${cases.length} product-page render checks and public-profile isolation. Static fixtures: .tmp/mobile-products/`);
} finally {
  globalThis.fetch = originalFetch;
}
