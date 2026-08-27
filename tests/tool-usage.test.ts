import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("tool usage is account-owned and ships as standalone SQL", () => {
  const schema = readFileSync("api/prisma/schema.prisma", "utf8");
  const sql = readFileSync("database/2026-08-21-add-tool-usage-events.sql", "utf8");

  assert.match(schema, /model ToolUsageEvent/);
  assert.match(schema, /user\s+User\s+@relation/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS tool_usage_events/);
  assert.match(sql, /REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(sql, /CHECK \(event IN \('OPEN', 'COMPLETE'\)\)/);
});

test("account tool usage endpoints require authentication and scope queries by user", () => {
  const controller = readFileSync("api/src/tool-usage/tool-usage.controller.ts", "utf8");
  const service = readFileSync("api/src/tool-usage/tool-usage.service.ts", "utf8");

  assert.match(controller, /@Post\(\)\s+@UseGuards\(JwtAuthGuard\)/);
  assert.match(controller, /@Get\('summary'\)\s+@UseGuards\(JwtAuthGuard\)/);
  assert.match(controller, /@Delete\(\)\s+@UseGuards\(JwtAuthGuard\)/);
  assert.match(service, /ENABLED_TOOL_KEYS\.has\(dto\.toolKey\)/);
  assert.match(service, /where: \{ userId, event: 'OPEN' \}/);
  assert.match(service, /deleteMany\(\{ where: \{ userId \} \}\)/);
});

test("homepage popularity comes from aggregate database usage with safe fallbacks", () => {
  const controller = readFileSync("api/src/tool-usage/tool-usage.controller.ts", "utf8");
  const service = readFileSync("api/src/tool-usage/tool-usage.service.ts", "utf8");
  const proxy = readFileSync("server/api/tool-usage/popular.get.ts", "utf8");
  const landing = readFileSync("app/components/landing/LandingPage.vue", "utf8");
  const popularMethod = service.slice(
    service.indexOf("async getPopular"),
    service.indexOf("async record"),
  );

  assert.match(controller, /@Get\('popular'\)\s+getPopular\(\)/);
  assert.doesNotMatch(controller, /@Get\('popular'\)\s+@UseGuards/);
  assert.match(service, /where: \{ event: 'OPEN' \}/);
  assert.match(service, /orderBy: \{ _count: \{ toolKey: 'desc' \} \}/);
  assert.match(service, /map\(\(item\) => \(\{ toolKey: item\.toolKey \}\)\)/);
  assert.doesNotMatch(popularMethod, /userId/);
  assert.match(proxy, /requestAuthApi\(event, "\/tool-usage\/popular"\)/);
  assert.match(landing, /getPopularToolUsage/);
  assert.match(landing, /shuffledToolKeys/);
  assert.match(landing, /POPUL(?:AR)_TOOL_CARD_COUNT = 8/);
});

test("client tracking sends no tool inputs or query values", () => {
  const usage = readFileSync("app/composables/useToolUsage.ts", "utf8");
  const layout = readFileSync("app/layouts/default.vue", "utf8");

  assert.match(usage, /body: \{ toolKey, event: "OPEN" \}/);
  assert.doesNotMatch(usage, /body:\s*\{[^}]*\.\.\./);
  assert.match(layout, /ENABLED_TOOLS\.find\(\(item\) => item\.route === path\)/);
  assert.match(layout, /!ready \|\| !user/);
});

test("profile displays and can clear account tool usage", () => {
  const profile = readFileSync("app/pages/account.vue", "utf8");
  const privacy = readFileSync("app/pages/privacy-policy.vue", "utf8");

  assert.match(profile, /Most used tools/);
  assert.match(profile, /Clear history/);
  assert.match(profile, /getToolUsageSummary/);
  assert.match(privacy, /does not\s+include tool inputs, generated content, filenames, or URL query values/);
});
