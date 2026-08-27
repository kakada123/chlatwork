import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin analytics is protected by authentication and the ADMIN role", () => {
  const controller = readFileSync("api/src/admin/admin.controller.ts", "utf8");
  const guard = readFileSync("api/src/auth/admin.guard.ts", "utf8");
  const middleware = readFileSync("app/middleware/admin.ts", "utf8");

  assert.match(controller, /@UseGuards\(JwtAuthGuard, AdminGuard\)/);
  assert.match(guard, /request\.user\?\.role !== UserRole\.ADMIN/);
  assert.match(guard, /ForbiddenException/);
  assert.match(middleware, /user\.value\.role !== "ADMIN"/);
  assert.match(middleware, /navigateTo\("\/account"\)/);
});

test("admin dashboard reports aggregate and recent tool activity", () => {
  const service = readFileSync("api/src/admin/admin.service.ts", "utf8");
  const page = readFileSync("app/pages/admin/index.vue", "utf8");
  const proxy = readFileSync("server/api/admin/analytics.get.ts", "utf8");

  assert.match(service, /totalUsers/);
  assert.match(service, /activeUsers: activeUserRows\.length/);
  assert.match(service, /topTools/);
  assert.match(service, /topUsers/);
  assert.match(service, /recentActivity/);
  assert.match(service, /COUNT\(DISTINCT "userId"\)/);
  assert.match(page, /Most used tools/);
  assert.match(page, /Most active users/);
  assert.match(page, /Recent activity/);
  assert.match(page, /never tool inputs or generated content/);
  assert.match(proxy, /requestAuthenticatedApi\(event, `\/admin\/analytics\?range=\$\{range\}`\)/);
});

test("admin analytics accepts only bounded date ranges", () => {
  const dto = readFileSync("api/src/admin/dto/admin-analytics-query.dto.ts", "utf8");
  const proxy = readFileSync("server/api/admin/analytics.get.ts", "utf8");

  assert.match(dto, /@IsIn\(\['7d', '30d', '90d'\]\)/);
  assert.match(proxy, /ALLOWED_RANGES = new Set\(\["7d", "30d", "90d"\]\)/);
});
