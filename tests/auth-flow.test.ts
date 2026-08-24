import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("auth tokens are held in HttpOnly server cookies", () => {
  const source = readFileSync("server/utils/auth.ts", "utf8");
  assert.match(source, /httpOnly:\s*true/);
  assert.match(source, /sameSite:\s*"lax"/);
  assert.match(source, /chlatwork_access_token/);
  assert.doesNotMatch(source, /localStorage/);
});

test("protected account route uses auth middleware", () => {
  const account = readFileSync("app/pages/account.vue", "utf8");
  const middleware = readFileSync("app/middleware/auth.ts", "utf8");
  assert.match(account, /middleware:\s*"auth"/);
  assert.match(middleware, /path:\s*"\/login"/);
  assert.match(middleware, /redirect:\s*to\.fullPath/);
});

test("auth endpoints never return tokens to the browser", () => {
  for (const file of ["google.post.ts", "telegram.post.ts"]) {
    const source = readFileSync(`server/api/auth/${file}`, "utf8");
    assert.match(source, /return \{ user: auth\.user \}/);
    assert.doesNotMatch(source, /return \{.*accessToken/);
  }
});

test("login offers only Google and Telegram", () => {
  const login = readFileSync("app/pages/login.vue", "utf8");
  const auth = readFileSync("app/composables/useAuth.ts", "utf8");
  assert.doesNotMatch(login, /type="password"|\/signup|Facebook/i);
  assert.doesNotMatch(auth, /loginWithFacebook|async function login\(|async function signup\(/);
  assert.match(auth, /loginWithGoogle/);
  assert.match(auth, /startTelegramCodeLogin/);
});

test("the ChlatWork Nest API owns Google and Telegram authentication", () => {
  const controller = readFileSync("api/src/auth/auth.controller.ts", "utf8");
  const service = readFileSync("api/src/auth/auth.service.ts", "utf8");
  const schema = readFileSync("api/prisma/schema.prisma", "utf8");
  assert.match(controller, /@Post\('google'\)/);
  assert.match(controller, /@Post\('telegram\/code'\)/);
  assert.doesNotMatch(controller, /login|signup|facebook/i);
  assert.match(service, /jwtVerify\(token, GOOGLE_JWKS/);
  assert.match(service, /jwtVerify\(idToken, TELEGRAM_JWKS/);
  assert.match(service, /createHash\('sha256'\)/);
  assert.match(schema, /GOOGLE\s+TELEGRAM/);
});

test("the API accepts traffic from its container network", () => {
  const main = readFileSync("api/src/main.ts", "utf8");

  assert.match(main, /config\.get<number>\('PORT', 3002\)/);
  assert.match(main, /app\.listen\([^;]+, '0\.0\.0\.0'\)/);
  assert.doesNotMatch(main, /app\.listen\([^;]+, '127\.0\.0\.1'\)/);
});

test("expense data is user-owned PostgreSQL data, not an Upstash share payload", () => {
  const schema = readFileSync("api/prisma/schema.prisma", "utf8");
  const controller = readFileSync("api/src/expenses/expenses.controller.ts", "utf8");
  const page = readFileSync("app/pages/tools/expense-tracker.vue", "utf8");
  const envExample = readFileSync(".env.example", "utf8");
  assert.match(schema, /model ExpenseProfile/);
  assert.match(schema, /model ExpenseEntry/);
  assert.match(controller, /@UseGuards\(JwtAuthGuard\)/);
  assert.match(controller, /@Put\('state'\)/);
  assert.doesNotMatch(page, /definePageMeta\(\{ middleware: "auth"/);
  assert.match(page, /AuthResultAuthGate/);
  assert.match(page, /chlatwork-expense-login-draft/);
  assert.match(page, /\/api\/expenses\/state/);
  assert.doesNotMatch(envExample, /UPSTASH|KV_REST/);
});

test("PayBack data is protected and stored by account", () => {
  const schema = readFileSync("api/prisma/schema.prisma", "utf8");
  const controller = readFileSync("api/src/payback/payback.controller.ts", "utf8");
  const page = readFileSync("app/pages/tools/payback-calculator.vue", "utf8");
  assert.match(schema, /model PaybackProfile/);
  assert.match(schema, /model PaybackEntry/);
  assert.match(controller, /@UseGuards\(JwtAuthGuard\)/);
  assert.match(controller, /@Put\('state'\)/);
  assert.doesNotMatch(page, /definePageMeta\(\{ middleware: "auth"/);
  assert.match(page, /AuthResultAuthGate/);
  assert.match(page, /chlatwork-payback-login-draft/);
  assert.match(page, /\/api\/payback\/state/);
});

test("PayBack calculation history is account-owned and uses a standalone update SQL", () => {
  const schema = readFileSync("api/prisma/schema.prisma", "utf8");
  const controller = readFileSync("api/src/payback/payback.controller.ts", "utf8");
  const service = readFileSync("api/src/payback/payback.service.ts", "utf8");
  const page = readFileSync("app/pages/tools/payback-calculator.vue", "utf8");
  const historySql = readFileSync("database/2026-08-21-add-payback-calculation-history.sql", "utf8");

  assert.match(schema, /model PaybackCalculation/);
  assert.match(schema, /model PaybackCalculationEntry/);
  assert.match(controller, /@Post\('history'\)/);
  assert.match(controller, /@Get\('history\/count'\)/);
  assert.match(controller, /@Delete\('history\/:id'\)/);
  assert.match(service, /where: \{ id, userId \}/);
  assert.match(page, /\/api\/payback\/history/);
  assert.match(historySql, /CREATE TABLE IF NOT EXISTS payback_calculations/);
  assert.match(historySql, /CREATE TABLE IF NOT EXISTS payback_calculation_entries/);
  assert.doesNotMatch(
    readFileSync("database/2026-08-21-add-account-tool-data.sql", "utf8"),
    /payback_calculations/,
  );
});

test("tool inputs stay public while protected results require authentication", () => {
  const gate = readFileSync("app/components/auth/ResultAuthGate.vue", "utf8");
  const dialog = readFileSync("app/components/auth/AuthLoginDialog.vue", "utf8");
  const faq = readFileSync("app/components/landing/LandingFaq.vue", "utf8");
  const expense = readFileSync("app/pages/tools/expense-tracker.vue", "utf8");
  const payback = readFileSync("app/pages/tools/payback-calculator.vue", "utf8");
  assert.match(gate, /Sign in to view your result/);
  assert.match(gate, /AuthLoginDialog/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /AuthSocialAuthButtons/);
  assert.doesNotMatch(expense, /definePageMeta\(\{ middleware: "auth"/);
  assert.doesNotMatch(payback, /definePageMeta\(\{ middleware: "auth"/);
  assert.match(expense, /AuthResultAuthGate/);
  assert.match(payback, /AuthResultAuthGate/);
  assert.match(faq, /open a tool and enter data without an account/);
});

test("already-run auth SQL stays separate from the account-tool update SQL", () => {
  const authSql = readFileSync("database/2026-08-21-create-chlatwork-auth.sql", "utf8");
  const updateSql = readFileSync("database/2026-08-21-add-account-tool-data.sql", "utf8");
  assert.doesNotMatch(authSql, /expense_profiles|payback_profiles/);
  assert.match(updateSql, /CREATE TABLE IF NOT EXISTS expense_profiles/);
  assert.match(updateSql, /CREATE TABLE IF NOT EXISTS expense_entries/);
  assert.match(updateSql, /CREATE TABLE IF NOT EXISTS payback_profiles/);
  assert.match(updateSql, /CREATE TABLE IF NOT EXISTS payback_entries/);
});
