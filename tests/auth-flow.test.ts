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

test("signed-in navigation displays the user avatar with an initials fallback", () => {
  const layout = readFileSync("app/layouts/default.vue", "utf8");

  assert.match(layout, /authUser\.avatarUrl && !headerAvatarFailed/);
  assert.match(layout, /@error="handleHeaderAvatarError"/);
  assert.match(layout, /authUserInitials/);
  assert.match(layout, /referrerpolicy="no-referrer"/);
});

test("auth-dependent expense UI waits for client session readiness before rendering", () => {
  const layout = readFileSync("app/layouts/default.vue", "utf8");
  const expensePage = readFileSync("app/pages/tools/expense-tracker.vue", "utf8");

  assert.match(layout, /const visibleAuthUser = computed\(\(\) => isAuthReady\.value/);
  assert.match(layout, /<QuickExpenseFab\s+v-if="visibleAuthUser && route\.path !== '\/tools\/expense-tracker'"/);
  assert.match(layout, /mobile-navigation-action/);
  assert.match(expensePage, /const signedIn = computed\(\(\) => isAuthReady\.value/);
  assert.match(expensePage, /<AuthResultAuthGate v-else-if="isAuthReady"/);
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
  assert.match(auth, /body: \{ initData \}/);
  assert.match(auth, /startTelegramCodeLogin/);
});

test("the ChlatWork Nest API owns Google and Telegram authentication", () => {
  const controller = readFileSync("api/src/auth/auth.controller.ts", "utf8");
  const service = readFileSync("api/src/auth/auth.service.ts", "utf8");
  const telegramMiniApp = readFileSync("api/src/auth/telegram-mini-app.ts", "utf8");
  const telegramIdentity = readFileSync("api/src/auth/telegram-identity.ts", "utf8");
  const schema = readFileSync("api/prisma/schema.prisma", "utf8");
  assert.match(controller, /@Post\('google'\)/);
  assert.match(controller, /@Post\('telegram\/code'\)/);
  assert.match(controller, /@Post\('google\/link-ticket'\)/);
  assert.match(controller, /@Post\('google\/link-code'\)/);
  assert.doesNotMatch(controller, /login|signup|facebook/i);
  assert.match(service, /jwtVerify\(token, GOOGLE_JWKS/);
  assert.match(telegramMiniApp, /createHmac\('sha256', 'WebAppData'\)/);
  assert.match(telegramMiniApp, /timingSafeEqual/);
  assert.match(telegramIdentity, /payload\.id/);
  assert.match(service, /legacyProviderUserId/);
  assert.match(service, /createHash\('sha256'\)/);
  assert.match(schema, /GOOGLE\s+TELEGRAM/);
});

test("Telegram Mini App Google linking opens only from a user click and returns through a deep link", () => {
  const account = readFileSync("app/pages/account.vue", "utf8");
  const authorize = readFileSync("server/api/auth/google/link/authorize.get.ts", "utf8");
  const callback = readFileSync("server/api/auth/google/callback.get.ts", "utf8");
  const googleLink = readFileSync("server/utils/google-link.ts", "utf8");
  const telegramReturn = readFileSync("app/plugins/telegram-oauth-return.client.ts", "utf8");

  assert.match(account, /@click="openGoogleLink"/);
  assert.match(account, /telegram\.openLink\(googleLinkUrl\.value\)/);
  assert.match(authorize, /code_challenge_method.*S256/);
  assert.match(callback, /google\/link-code/);
  assert.match(callback, /telegramMiniAppDeepLink/);
  assert.match(googleLink, /https:\/\/t\.me\//);
  assert.match(telegramReturn, /start_param/);
  assert.match(telegramReturn, /path: "\/account"/);
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
  assert.match(controller, /@Post\('quick-entry'\)/);
  assert.doesNotMatch(page, /definePageMeta\(\{ middleware: "auth"/);
  assert.match(page, /AuthResultAuthGate/);
  assert.match(page, /chlatwork-expense-login-draft/);
  assert.match(page, /\/api\/expenses\/state/);
  assert.doesNotMatch(envExample, /UPSTASH|KV_REST/);
});

test("profile provides account-owned Expense Tracker access and status", () => {
  const account = readFileSync("app/pages/account.vue", "utf8");

  assert.match(account, /id="profile-expense-tracker"/);
  assert.match(account, /\/api\/expenses\/state/);
  assert.match(account, /savedExpenseCount/);
  assert.match(account, /Quick add on/);
  assert.match(account, /to="\/tools\/expense-tracker"/);
  assert.match(account, /chlatwork:quick-expense-saved/);
});

test("mobile account UI uses only current profile capabilities", () => {
  const account = readFileSync("app/pages/account.vue", "utf8");
  const layout = readFileSync("app/layouts/default.vue", "utf8");
  const bottomNav = readFileSync("app/components/layout/MobileBottomNav.vue", "utf8");

  assert.match(account, /Manage your profile, saved work, and tool activity\./);
  assert.match(account, /id="account-menu-title"/);
  assert.match(account, /openMobileAccountSection\('expenses'\)/);
  assert.match(account, /openMobileAccountSection\('moments'\)/);
  assert.match(account, /openMobileAccountSection\('payback'\)/);
  assert.match(account, /openMobileAccountSection\('activity'\)/);
  assert.match(account, /openMobileAccountSection\('favorite-tools'\)/);
  assert.match(account, /openMobileAccountSection\('favorite-commands'\)/);
  assert.match(account, /mobileAccountSection === 'expenses' \? 'block' : 'hidden sm:block'/);
  assert.match(account, /MOBILE_ACCOUNT_SECTION_TITLES/);
  assert.match(account, /expenses: "Expense Tracker"/);
  assert.match(account, /moments: "Your Moments"/);
  assert.match(account, /payback: "PayBack history"/);
  assert.match(account, /activity: "Tool activity"/);
  assert.match(account, /"favorite-tools": "Favorite tools"/);
  assert.match(account, /"favorite-commands": "Favorite commands"/);
  assert.match(account, /Back to Account from \$\{mobileAccountSectionTitle\}/);
  assert.match(account, /\{\{ mobileAccountSectionTitle \}\}/);
  assert.doesNotMatch(account, />Back<|>Account menu</);
  assert.match(account, /mobileAccountSection \? 'hidden sm:flex' : 'flex'/);
  assert.match(account, />Appearance</);
  assert.match(account, /Choose how ChlatWork looks/);
  assert.match(account, /\{\{ isDark \? "Dark" : "Light" \}\}/);
  assert.equal(account.match(/@click="toggleColorMode"/g)?.length, 1);
  assert.match(account, /aria-label="ChlatWork information"/);
  assert.match(account, /accountInformationGroups/);
  assert.match(account, /label: "About", to: "\/about"/);
  assert.match(account, /label: "Editorial policy", to: "\/editorial-policy"/);
  assert.match(account, /label: "Privacy & cookie settings", action: "cookie-settings"/);
  assert.match(account, /label: "Support ChlatWork", to: "\/buy-me-coffee"/);
  assert.match(account, /@click="openPrivacyCookieSettings"/);
  assert.match(account, /query: \{ from: "account" \}/);
  assert.match(account, /:to="accountInformationRoute\(item\.to\)"/);
  assert.doesNotMatch(account, /aria-label="Mobile primary navigation"/);
  assert.match(layout, /<MobileBottomNav/);
  assert.match(bottomNav, /isAccountActive/);
  assert.match(bottomNav, /aria-label="Mobile primary navigation"/);
  assert.match(account, /Sign out from your ChlatWork account/);
  assert.match(layout, /routesWithEmbeddedMobileChrome/);
  assert.doesNotMatch(account, /Free Plan|Upgrade to Pro|Billing & Plan|API Keys|Notifications/);
});

test("account expense summary uses saved decimal-safe tracker calculations", () => {
  const account = readFileSync("app/pages/account.vue", "utf8");

  assert.match(account, /collectExpenseItems\(state\.rows, state\.rangeMode\)/);
  assert.match(account, /getTotalSpent\(items\)/);
  assert.match(account, /getBudgetValue\(state\.budget\)/);
  assert.match(account, /getBudgetRemaining\(budgetValue, totalSpent\)/);
  assert.match(account, /getBudgetPercent\(totalSpent, budgetValue\)/);
  assert.match(account, /aria-label="Saved expense summary"/);
  assert.match(account, /Spent · \{\{ expenseSummary\.rangeLabel \}\}/);
  assert.match(account, /\{\{ expenseState\.budget\.period \}\} budget/);
  assert.match(account, /Over budget/);
  assert.match(account, /Remaining/);
  assert.match(account, /<MoneyAmount/);
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
