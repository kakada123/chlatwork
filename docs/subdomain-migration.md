# ChlatWork product domains

## Audit and architecture

This checkout is **Nuxt 4 SSR**, Vue 3, Vue Router and Vite, not a standalone Vite SPA. `nuxt.config.ts` selects Nitro's `vercel` preset; `vercel.json` selects `nuxtjs`, `npm run build`, and managed output. Keep one Vercel project for all frontend domains. No monorepo, separate frontend deployments, new service, dependency, or database migration is needed.

The frontend has file-based pages under `app/pages`, shared layouts (`default`, `creator`, `bot`), components, composables using Nuxt `useState`, pure libraries, and explicit tool/Creator/SEO catalogs in `app/data` and `app/lib/tool-registry.ts`. All existing utility pages and their redirects remain present. The root homepage gains a small app directory and retains its existing tool discovery experience. Product navigation reuses the existing responsive shell and design tokens; Creator retains its own existing layout and credit balance controls. Public Link/Moment/invitation pages retain their immersive layout and access rules.

NestJS/Prisma owns accounts, social identities, refresh-token hashes, Creator credits/history, Link publication, Moment media/votes/invitations, expense records, favorites, usage, and Telegram integrations. The browser calls relative `/api/*` routes on its own frontend host. Nitro proxies to the existing Railway API through the private `NUXT_AUTH_API_BASE_URL`; bearer tokens are forwarded server-side. Do not point browser requests directly at Railway or put the API base URL in public runtime configuration.

Audit coverage and exact source locations are recorded in [subdomain-source-inventory.md](subdomain-source-inventory.md). That inventory lists every page, component, composable/service, server API handler, tool definition source, and hardcoded `chlatwork.com` source reference found in the inspected application source. It deliberately excludes secret/env files, dependencies, generated output, and unrelated local changes.

### Authentication and security

- Google website login posts a Google identity token to `/api/auth/google`; Nest verifies it and resolves the existing social account. Register each enabled website origin in Google's authorized JavaScript origins.
- Telegram website login uses OIDC authorization code + PKCE + state cookies; its callback is `/api/auth/telegram/callback`. A validated relative return path is held in a short-lived HttpOnly cookie. Callback origins now come from explicit domain configuration, not arbitrary forwarded hosts.
- Telegram Mini App authentication verifies signed `initData`. Existing Google **account linking** uses a short-lived link ticket, state, PKCE, `/api/auth/google/callback`, and returns to Telegram using its existing deep link. Configure that exact callback on every host where this flow will run. No new token exchange or auth token URL transport is introduced. The pre-existing Google-link ticket flow is preserved.
- Access/refresh cookies remain **host-only**, HttpOnly, SameSite=Lax, with HTTPS Secure handling. There is no `Domain=.chlatwork.com`, client token storage, cross-origin credential mode, or shared-cookie SSO. Signing in with the same linked provider on each host resolves the same account and its existing records. Users initially sign in on each product origin; signing out applies to that origin's session. Cross-host seamless SSO/global logout would require a separate reviewed exchange/revocation design.
- The API retains `FRONTEND_ORIGIN` and adds exact `FRONTEND_ADDITIONAL_ORIGINS` for CORS and Google/Telegram callback validation. No wildcard origins or credentialed Railway CORS are enabled. Browser mutations to Nitro reject mismatched `Origin` and sibling/cross-site fetch metadata. Provider webhooks/non-browser calls without Origin still use their existing signature/authentication checks.
- Existing auth/admin middleware, API ownership/role checks, availability gates, Moment unlock/expiry/private protections, media validation, Creator limits/credits, and expense validation are retained. Product entry aliases carry the existing route metadata and availability identity.

### Browser-owned state

Lucky Draw uses `chlatwork:lucky-draw:session:v1` in localStorage for participants, settings, notes, last winner, and history. The new origin cannot read that data. Its legacy main-domain URL is **never automatically redirected**, even if `draw` is listed in the redirect gate. The new app prominently links to the legacy saved lists. Users can continue the old session there; current winner export and participant input remain available. This migration does not copy, erase, or silently merge browser state.

Expense data is account-owned through `/api/expenses/entries`, summary/profile/settings, and the existing PATCH change-set protocol; the login draft in sessionStorage remains origin-local. PayBack's account state/history routes are unchanged. Color mode, locale, cookie notice, game preferences, and other local/session storage also remain origin-local. Do not clear or transfer storage during rollout. Retain main-domain workspace access until users have completed unsaved drafts.

## Final route mapping

| Product | Product entry | Preserved deep links |
| --- | --- | --- |
| Creator | `https://creator.chlatwork.com/` | `/creator/*`, including tools, `/creator/credits`, `/creator/history/:id`, `/creator/admin/credits` |
| Link | `https://link.chlatwork.com/` | **`/u/:slug`**, `/link/:slug` alias, `/account/link/:section?` editor |
| Moments | `https://moment.chlatwork.com/` (existing creation component) | `/moments` workspace, `/m/:slug`, `/moment/:slug` alias, `/i/:token`, same-origin `/api/moments/*` |
| Expense | `https://expense.chlatwork.com/` | `/tools/expense-tracker` remains a temporary same-host alias |
| Lucky Draw | `https://draw.chlatwork.com/` | `/tools/lucky-draw` same-host alias; main-domain legacy access retained permanently in this change |
| Games | `https://games.chlatwork.com/kla-klok` | `/` temporarily redirects to `/kla-klok`; `/tools/kla-klok` remains a same-host alias |
| Utilities | Existing `https://chlatwork.com/tools/*` | PDF, Image, QR, Barcode, Date, Developer, Stopwatch, Khmer Unicode, Text to Voice, and every other existing utility |
| PayBack | Existing `/tools/payback-calculator` | No hostname activation or automatic redirect |

`tools` and `payback` origin overrides can be recorded in the central JSON configuration, but neither is an activatable product. There is no new bare `/:username` catch-all: retaining `/u/:slug` protects existing published usernames and prevents collisions with `/login`, `/account`, `/api`, and future system routes without changing existing records or reserved usernames. Add future games as explicit page records and extend the central ownership mapping; do not use a generic profile/game catch-all.

Unknown hosts return 404. Product hosts retain product routes and shared account/admin/bot/policy access; known unrelated pages navigate back to the main site, and unknown paths use Nuxt's normal 404. Direct requests and refreshes use the same per-request route transformation as client startup. Existing entry paths on product hosts temporarily normalize to the new entry route. Query parameters and client hash fragments are retained. HTTP servers never receive hash fragments; browsers normally inherit a fragment across a redirect whose Location has no fragment, and client redirects explicitly carry the hash.

## Configuration and rollout gates

All product gates default to an empty list. Merge/deploy with the gates empty first: existing URLs keep working.

| Variable | Purpose |
| --- | --- |
| `NUXT_PUBLIC_DOMAINS_MAIN_ORIGIN` | Main canonical origin; default `https://chlatwork.com` |
| `NUXT_PUBLIC_DOMAINS_PRODUCT_ORIGINS` | JSON overrides of exact `creator`, `link`, `moment`, `expense`, `draw`, `games`, optional `tools`, `payback` origins |
| `NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS` | Comma-separated products that may serve their hostnames; enables testing, without switching old URLs |
| `NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS` | Verified enabled products whose canonical/share/directory URLs move to the new origin |
| `NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS` | Verified canonical products whose main-domain document routes receive HTTP 308; `draw` is excluded in code |
| `NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS` | Explicit comma-separated preview/staging origins; all are noindex; defaults to this deployment's `VERCEL_URL` when supplied by Vercel |
| `NUXT_AUTH_API_BASE_URL` | Private server-side Railway API origin; retain its current deployment value |
| `NUXT_APP_ORIGIN` | Existing legacy setting retained for deployment compatibility; OAuth origin selection now uses the current configured host |
| `FRONTEND_ORIGIN` (Railway) | Existing main frontend origin, retained |
| `FRONTEND_ADDITIONAL_ORIGINS` (Railway) | Exact additional product/staging origins allowed for API CORS and provider callbacks |

Origin overrides require HTTPS except localhost development, prohibit paths, credentials, queries, and duplicate hosts. `canonical` requires `enabled`; `redirect` requires both. Flags are deployment/runtime configuration, not a user-controlled query parameter. Supply non-sensitive domain settings in Vercel and redeploy for deterministic client/server agreement. Never change flags independently on only the server or only cached frontend assets.

Product-list values are comma-separated names, for example `creator,link,moment,expense,draw,games`, without URLs, assignment prefixes, or wrapping quotes in Vercel's value field. Leave disabled variables **unset** in Vercel. Nitro-deserialized string arrays are also accepted. Unknown names or invalid list types disable the entire affected stage; canonical/redirect prerequisites still apply. The server logs only the offending variable name once per process, never its value. A product-list typo must not turn main-site, authenticated API, or Telegram webhook requests into HTTP 500 responses.

`NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS` is optional. **Delete the variable in Vercel if no extra preview alias is needed**; do not enter `disabled`, `false`, or product names. An optional value is a full origin such as `https://staging.chlatwork.com`. Invalid or unsafe preview entries disable the entire additional-preview allowlist and log only the variable name once per process. Main/product routing, authentication and error-page rendering remain operational; partially invalid lists never grant additional host access. Nitro-deserialized arrays of exact origins are also supported.

If an older deployment reports `Unknown product in domain configuration`, remove `NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS`, `NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS`, and `NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS` from Vercel Production and redeploy to restore legacy-only operation. After deploying the recovery fix, re-enable only the intended stages with valid names. Do not activate permanent redirects during recovery.

Example **domain-only** values for a local process (not an env file):

```text
NUXT_PUBLIC_DOMAINS_MAIN_ORIGIN=http://localhost:3001
NUXT_PUBLIC_DOMAINS_PRODUCT_ORIGINS={"creator":"http://creator.localhost:3001","link":"http://link.localhost:3001","moment":"http://moment.localhost:3001","expense":"http://expense.localhost:3001","draw":"http://draw.localhost:3001","games":"http://games.localhost:3001"}
NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS=creator,link,moment,expense,draw,games
NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS=
NUXT_PUBLIC_DOMAINS_REDIRECT_PRODUCTS=
```

Test the desired hostname using browser localhost subdomains or a test host mapping. For a preview, explicitly list its deployment and stable alias origins; arbitrary `*.vercel.app` hosts are not trusted. To exercise product routing in staging, give each product an explicit staging hostname/origin, attach all of those hosts to the preview deployment, and keep canonical/redirect lists empty. A plain Vercel deployment URL serves the main app, not a product selected from a query string. Add staging OAuth origins/callbacks explicitly if testing provider login there.

## SEO and backward compatibility

Before canonical activation, product hosts send `X-Robots-Tag: noindex, nofollow`, point canonicals at the old domain, and expose no indexable product sitemap entries. After activation, public entry, public Link share, canonical/OG, directory, tool-card, and main navigation URLs use the configured destinations. Account/history/private pages retain noindex. Public Moments/invitations remain unlisted and keep their stricter noindex protections; published Link profiles remain indexable under `/u/:slug`.

Sitemap and robots output is request-aware, with no-store responses. Main sitemap retains unrelated pages and excludes migrated canonical product entries; each product sitemap includes only that product's existing public index allowlist. Generated/private slugs are never enumerated. Static `public/robots.txt` is replaced by a Nitro route so Vercel cannot serve identical main-domain robots metadata for every hostname. Do not enable sitemap prerendering, ISR, or host-blind HTML caching. Any future CDN cache must include Host in its cache key.

Existing Khmer routing behavior is preserved: the general site currently has Khmer path aliases disabled and redirects them to existing English pages; Moments uses `?lang=km` and its locale cookie. Locale queries survive migration and Moment canonicals retain supported Khmer locale selection. This change does not invent translated indexable pages or hreflang alternatives that do not exist. Existing editorial, organization, support-email, poster-branding, bot-generated main-domain links, and unrelated utility canonical/image URLs may still refer to `chlatwork.com`; they remain valid. The source inventory makes those references reviewable. Bot-generated links continue through compatible legacy routes.

## Manual Vercel and Cloudflare setup

1. Keep the current Vercel project, repository/root directory, Nuxt framework preset, build command, and managed output. `vercel.json` needs no SPA catch-all rewrite: Nitro serves pages, API routes, assets, and nested refreshes. Do not set an output directory to `dist` or build with plain `vite build`.
2. Add **each** of `creator.chlatwork.com`, `link.chlatwork.com`, `moment.chlatwork.com`, `expense.chlatwork.com`, `draw.chlatwork.com`, and `games.chlatwork.com` to this same project's custom domains. Serve them as domains, without Vercel's "redirect to another domain" option. Keep existing main/www behavior. Separate Vercel projects are not technically required.
3. For each hostname, copy the exact DNS target and any ownership TXT verification record shown by Vercel. In Cloudflare create a CNAME with Name `creator`, `link`, `moment`, `expense`, `draw`, or `games`, and Target equal to **that hostname's Vercel-provided target**. Do not invent a target, point at the Railway API, or add an apex/wildcard redirect. Retain existing main-domain and mail records. Leave tools/payback unconfigured for now.
4. Use **DNS only** (gray cloud) initially. Verify DNS and wait for Vercel's domain verification and HTTPS certificate issuance. Test HTTPS on each host. If later enabling Cloudflare proxying, separately validate Vercel compatibility, Host forwarding, Full (strict) TLS, cache behavior, uploads, API cookies, and OAuth. Do not use Flexible TLS or cache API/auth responses.
5. Configure domain-only rollout settings in the correct Vercel environment and existing API/provider values separately. No production settings were read, invented, or changed by this implementation. Do not run `vercel env pull`, `vercel pull`, or `vercel build --yes`.

Official references: [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Nuxt on Vercel](https://vercel.com/docs/frameworks/full-stack/nuxt), [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/).

## Manual Railway and provider setup

1. Deploy the reviewed API code before product OAuth testing. Retain all database/provider/JWT settings and `FRONTEND_ORIGIN`. Add only verified domain origins to `FRONTEND_ADDITIONAL_ORIGINS` (comma-separated, no slash/path/wildcard). Browser requests still go through Nitro; no cookie domain or credentialed Railway CORS is needed.
2. In Google Cloud's existing OAuth client, retain the main authorized JavaScript origin and add each product origin where website Google sign-in runs. Retain `https://chlatwork.com/api/auth/google/callback` and add the exact product `/api/auth/google/callback` URIs where Mini App Google linking is tested. Preserve the client ID/audience and linked-account ownership.
3. In the existing Telegram login provider configuration, retain the main site and register each product's exact `/api/auth/telegram/callback` URI/origin as supported by the provider. Verify actual provider acceptance; do not activate a product if its configured Telegram client cannot authorize that host. Preserve existing bot identity, webhook paths, Mini App launch URL and Google-return deep link.
4. On every product, test Google login, Telegram OIDC and Mini App login/linking, state mismatch/cancel/expiry handling, refresh, local logout, safe return to the requested tool, protected/admin pages, and the same account's expenses/credits/published profile/Moments. No SQL or schema change is required.

## Rollout and rollback checklist

- [ ] Review the source inventory, diff, validation results, and unrelated existing local changes.
- [ ] Deploy API allowlist support and frontend code with all rollout lists empty. Confirm every existing URL, login and shared link still works.
- [ ] Attach domains/DNS, verify HTTPS, register provider origins/callbacks, and set API allowlists manually.
- [ ] Enable **one** product in `ENABLED_PRODUCTS`, with canonical/redirect lists empty. Check direct loads, refreshes, nested routes, mobile/desktop chrome, unknown-host/route 404, EN/KM behavior, and noindex/robots/sitemap output.
- [ ] Verify Link `/u/:slug` and editor section saves/publication/analytics; Moments public/private/locked/expired/invitation/voting/media pages; Expense GET/PATCH/summary/income and ownership; Creator tools/history/credits/admin limits; Lucky Draw session continuity on both origins; Games `/kla-klok` and its saved settings.
- [ ] Verify auth with the **same existing account** and verify CSRF rejects sibling-origin mutations. Do not treat mocked/unit tests as live OAuth or database proof.
- [ ] Set that product's `CANONICAL_PRODUCTS` entry only after destination verification. Check emitted canonical/OG URLs, internal destinations and per-host sitemap/robots; keep old routes operational.
- [ ] Observe production traffic/errors and review Search Console/sitemap discovery. Only then add the product to `REDIRECT_PRODUCTS`. **Never redirect Lucky Draw in this change.** Confirm 308 preserves deep paths and query parameters and does not redirect unrelated tools or `/api/*` endpoints.
- [ ] Roll back redirects first by removing entries and redeploying; then remove canonical activation and redeploy. Keep destination domains serving until cached permanent redirects expire or traffic has moved back. Only afterward disable product host routing/DNS if desired. A browser may cache permanent redirects; removing the flag cannot erase those caches immediately.
- [ ] During rollback retain backend allowlists/provider registrations until outstanding OAuth flows and product traffic have drained. Keep all database records, refresh sessions and browser storage. Re-enable the legacy homepage directory destinations through the flags. No data restoration or destructive SQL is part of rollback.

## Validation

See the final validation record appended below. Builds/tests do not establish live Vercel DNS/TLS, Google/Telegram provider acceptance, Railway deployment, browser localStorage continuity, signed-in ownership, or database state. Those remain manual release gates above.

### Changed implementation files

| Files | Change |
| --- | --- |
| `app/lib/product-domains.ts`, `app/lib/product-seo.ts` | Pure origin/route/rollout/canonical and per-host sitemap/robots policy |
| `app/router.options.ts`, `app/middleware/00.product-domain.global.ts`, `app/composables/useProductDomain.ts`, `app/composables/useProductRoute.ts` | Per-request entry aliases, route normalization, unsupported-host handling, product context, preserved catalog identity |
| `nuxt.config.ts`, `.env.example`, `api/.env.example` | Public domain configuration and disabled rollout defaults; private API base remains unchanged |
| `server/middleware/product-domain.ts`, `server/utils/product-domain.ts`, `server/routes/robots.txt.get.ts`, removed `public/robots.txt` | Server host validation, gated HTTP 308, CSRF protection and request-aware SEO responses |
| `api/src/main.ts`, `api/src/auth/auth.service.ts`, new `api/src/auth/frontend-origins.ts` | Exact CORS/callback origin allowlist, preserving existing main origin |
| `server/utils/auth.ts`, `server/utils/google-link.ts`, `server/utils/profile-proxy.ts`, Telegram start/callback handlers, `useAuth.ts`, login and guest middleware | Secure host-only cookie handling, same-host OAuth origin, validated relative return paths and Link mutation origin validation |
| `app/layouts/default.vue`, `app/layouts/creator.vue`, new `ProductNavigation.vue`, new `ProductDirectory.vue`, homepage and five tool-card renderers | Focused product navigation, app directory and gated internal product destinations |
| `app/app.vue`, `useAdVisibility.ts`, availability middleware, `ToolPageDetails.vue`, Link public/editor/alias pages, Moment creator/alias pages, Expense/Lucky Draw/Kla Klok pages | Product canonical/share/OG URLs, preserved feature gates, Link ad exclusions and layout behavior |
| `tests/product-domains.test.ts`, `tests/product-router.test.ts`, `tests/product-seo.test.ts`, API origin specs and existing availability/Creator/mobile-shell tests | Domain/rollout/routing/refresh/SEO/auth policy regressions and updated navigation expectations |
| `scripts/validate-subdomain-build.mjs`, these migration docs/source inventory | Env-free local validation with `.tmp` artifacts; manual deployment, activation and rollback instructions |

Existing Creator Telegram service/worker/spec changes and `docs/telegram-shortcuts.md` were already present and were not changed by this migration.

### Local results (2026-10-26)

- **Production build passed**: Nuxt client Vite build, server Vite build, and final Nitro Vercel packaging. Executed `OPENSSL_CONF=/dev/null node scripts/validate-subdomain-build.mjs` with project-local temp/config/cache paths. The helper disables dotenv/global RC loading and places outputs under `.tmp/subdomains/`; a temporary `.nuxt` symlink allows the installed Vue transform to resolve the existing root tsconfig and is removed in `finally`. A plain `vite build` is not this SSR application's build entry point.
- **Built-server smoke passed**: 26 assertions against the packaged Vercel handler through Nitro localFetch with a mock API, covering all six product hosts, actual SSR creation/profile/share/game pages, protected editor/expense endpoints, unsupported host/path behavior, legacy redirects/Lucky Draw access, sitemap isolation, and cross-origin mutation rejection. No sockets, providers, real accounts or database were used. Logs: `.tmp/subdomain-smoke.log`.
- **API tests passed**: 89 suites / **1,339 tests** from the repository root excluding the schema-path test, plus **3 schema tests** from `api/`. Existing tests have inconsistent working-directory requirements: the schema suite expects `api/`, while a Creator test opens `api/package.json` relative to the repository root. Running them separately avoids changing unrelated tests. API TypeScript `tsc --noEmit` passed.
- **Frontend tests**: **334 passed / 336 total**. Two existing assertions in `tests/moments.test.ts` fail against unchanged backend files: `daily Telegram voting keeps per-day history and owner insights` expects an old inline command list; `published Moment surfaces are unlisted and validate image content` expects an old owner-query string. They are reported, not rewritten as part of the migration. All new domain/router/SEO/availability cases pass.
- **Pure policy TypeScript passed** for the domain and SEO libraries. The available full app TypeScript check reports **84 errors** across existing composables/libraries/plugins and generated server typing; no remaining errors identify the new domain/router modules. This is not a clean full frontend typecheck. `vue-tsc --noEmit` could not run because `vue-tsc` is not installed. No dependency was added or downloaded.
- **Lint unavailable**: no frontend lint script exists; the API's existing ESLint 9 command fails because the repository has no `eslint.config.js/mjs/cjs`. No unrelated lint configuration or broad reformat was introduced.
- **Independent code review completed**. A crawler-access regression was found and fixed: production robots retains `Allow: /`, so existing shared Moment OG pages and public Link media remain crawlable, with privacy/indexing controlled by their existing access checks and noindex metadata. Its regression test was observed failing before the fix and passing afterward.
- **`git diff --check` passed** after whitespace cleanup. No production deployment, Cloudflare/Vercel/Railway mutation, database change, real env file or secret inspection was performed.

### Product-list outage regression

The reported production stack trace identified `products()` throwing inside global domain middleware before `/api/creator-telegram/webhook` could reach its authentication handler. `tests/product-domain-config.test.ts` covers invalid enabled/canonical/redirect values, stage prerequisites, Nitro arrays, defaults and field-name-only diagnostics. `scripts/validate-domain-config-runtime.mjs` reproduces invalid lists against the packaged Vercel handler, checks main-page availability, both Telegram webhook authentication boundaries, account authentication, unknown-host rejection, product gating, staging noindex and sibling-origin CSRF protection. Run it after `scripts/validate-subdomain-build.mjs`; it uses a fixture API and never calls live services or reads env files.

Recovery validation: the old packaged server reproduced HTTP 500 with `statusMessage: undefined`. After the fix, the production build, policy TypeScript check, all four new unit tests and all **24 packaged-server recovery assertions** passed, including once-per-process diagnostics without setting values. The full frontend suite is **338 passed / 340 total** with the same two unrelated Moments assertions listed above. Production configuration/deployment was not changed automatically.

Preview-origin recovery: a subsequent trace showed `ERR_INVALID_URL` with the value `disabled` in the optional preview allowlist, including during `__nuxt_error` rendering. Two further unit tests and expanded packaged-server checks cover malformed/unsafe values, string arrays, production and product homepages, webhook/account authentication, error pages, and valid-preview noindex. The production build and policy TypeScript check passed; all **48 packaged-server recovery assertions** passed. The frontend suite is **340 passed / 342 total**, with the same two unrelated Moments failures. Remove unused preview variables in Vercel instead of entering `disabled` or `false`; deployment remains manual.
