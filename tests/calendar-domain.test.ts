import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryHistory, createRouter, type RouteRecordRaw } from "vue-router";
import {
  PRODUCTS,
  createDomainConfig,
  resolveHost,
  productForPath,
  productPath,
  legacyPath,
  destinationUrl,
  canonicalUrl,
  legacyRedirect,
  navigationUrl,
  productRouteRecords,
} from "../app/lib/product-domains.ts";

test("calendar subdomain configuration and product definitions", () => {
  assert.equal(PRODUCTS.calendar.name, "Khmer Calendar");
  assert.equal(PRODUCTS.calendar.nameKm, "ប្រតិទិនចន្ទគតិខ្មែរ");
  assert.equal(PRODUCTS.calendar.entry, "/tools/khmer-calendar");
  assert.equal(PRODUCTS.calendar.home, "/");
  assert.equal(PRODUCTS.calendar.host, "calendar");

  // Disabled by default
  const defaultConfig = createDomainConfig();
  assert.equal(resolveHost("calendar.chlatwork.com", defaultConfig).kind, "unsupported");
  assert.equal(destinationUrl("/tools/khmer-calendar", defaultConfig), "https://chlatwork.com/tools/khmer-calendar");
  assert.equal(destinationUrl("/tools/khmer-calendar/date/2026-11-11", defaultConfig), "https://chlatwork.com/tools/khmer-calendar/date/2026-11-11");
  assert.equal(legacyRedirect("/tools/khmer-calendar", defaultConfig), null);
  assert.equal(legacyRedirect("/tools/khmer-calendar/date/2026-11-11", defaultConfig), null);

  // Enabled config
  const enabledConfig = createDomainConfig({
    enabledProducts: "calendar",
    canonicalProducts: "calendar",
    redirectProducts: "calendar",
  });

  assert.equal(resolveHost("calendar.chlatwork.com", enabledConfig).product, "calendar");
  assert.equal(productForPath("/tools/khmer-calendar"), "calendar");
  assert.equal(productForPath("/tools/khmer-calendar/date/2026-11-11"), "calendar");
  assert.equal(productForPath("/date/2026-11-11"), "calendar");
  assert.equal(productForPath("/tools/khmer-calendar-other"), null);

  assert.equal(productPath("calendar", "/tools/khmer-calendar"), "/");
  assert.equal(productPath("calendar", "/tools/khmer-calendar/date/2026-11-11"), "/date/2026-11-11");
  assert.equal(productPath("calendar", "/date/2026-11-11"), "/date/2026-11-11");

  assert.equal(legacyPath("calendar", "/"), "/tools/khmer-calendar");
  assert.equal(legacyPath("calendar", "/date/2026-11-11"), "/tools/khmer-calendar/date/2026-11-11");
  assert.equal(legacyPath("calendar", "/tools/khmer-calendar"), "/tools/khmer-calendar");
  assert.equal(legacyPath("calendar", "/tools/khmer-calendar/date/2026-11-11"), "/tools/khmer-calendar/date/2026-11-11");

  assert.equal(canonicalUrl("/tools/khmer-calendar", enabledConfig), "https://calendar.chlatwork.com/");
  assert.equal(canonicalUrl("/tools/khmer-calendar/date/2026-11-11", enabledConfig), "https://calendar.chlatwork.com/date/2026-11-11");
  assert.equal(canonicalUrl("/tools/khmer-calendar/date/2026-11-11?lang=en", enabledConfig), "https://calendar.chlatwork.com/date/2026-11-11");

  assert.equal(legacyRedirect("/tools/khmer-calendar", enabledConfig), "https://calendar.chlatwork.com/");
  assert.equal(legacyRedirect("/tools/khmer-calendar/date/2026-11-11", enabledConfig), "https://calendar.chlatwork.com/date/2026-11-11");
  assert.equal(legacyRedirect("/tools/khmer-calendar/date/2026-11-11?lang=en", enabledConfig), "https://calendar.chlatwork.com/date/2026-11-11?lang=en");
});

test("calendar navigation URLs handle internal and cross-product links", () => {
  const config = createDomainConfig({
    enabledProducts: "calendar",
    canonicalProducts: "calendar",
  });

  // External / mainOrigin navigation
  assert.equal(navigationUrl("/tools/khmer-calendar", config), "https://calendar.chlatwork.com/");
  assert.equal(navigationUrl("/tools/khmer-calendar/date/2026-11-11", config), "https://calendar.chlatwork.com/date/2026-11-11");

  // Navigation within calendar subdomain
  assert.equal(navigationUrl("/tools/khmer-calendar?date=2026-11-11", config, "calendar"), "/?date=2026-11-11");
  assert.equal(navigationUrl("/tools/khmer-calendar/date/2026-11-11", config, "calendar"), "/date/2026-11-11");
});

test("calendar product routes map root and nested date routes correctly", async () => {
  const routes: RouteRecordRaw[] = [
    { path: "/", name: "home", component: {} },
    { path: "/tools/khmer-calendar", name: "calendar-home", component: {} },
    { path: "/tools/khmer-calendar/date/:date()", name: "calendar-date", component: {} },
    { path: "/tools", name: "tools", component: {} },
  ];

  const mapped = productRouteRecords(routes, "calendar");

  const homeRoute = mapped.find((r) => r.path === "/");
  assert.ok(homeRoute);
  assert.equal(homeRoute.name, "calendar-home");
  assert.equal(homeRoute.meta?.productLegacyPath, "/tools/khmer-calendar");
  assert.deepEqual(homeRoute.alias, ["/tools/khmer-calendar"]);

  const dateRoute = mapped.find((r) => r.path === "/date/:date()");
  assert.ok(dateRoute);
  assert.equal(dateRoute.name, "calendar-date");
  assert.equal(dateRoute.meta?.productLegacyPath, "/tools/khmer-calendar/date/:date()");
  assert.deepEqual(dateRoute.alias, ["/tools/khmer-calendar/date/:date()"]);

  // Homepage from main is removed
  assert.equal(mapped.some((r) => r.name === "home"), false);

  // Vue Router resolves routes and aliases
  const router = createRouter({
    history: createMemoryHistory(),
    routes: mapped,
  });

  await router.push("/");
  assert.equal(router.currentRoute.value.name, "calendar-home");

  await router.push("/date/2026-11-11");
  assert.equal(router.currentRoute.value.name, "calendar-date");
  assert.equal(router.currentRoute.value.params.date, "2026-11-11");

  await router.push("/tools/khmer-calendar/date/2026-12-25");
  assert.equal(router.currentRoute.value.name, "calendar-date");
  assert.equal(router.currentRoute.value.params.date, "2026-12-25");
});
