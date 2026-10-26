# JekLuy implementation and rollout

## Existing engine and design

JekLuy is a Khmer-only, local-first interface around the existing PayBack engine, not another calculator. `app/lib/payback-calculator.ts` owns input parsing, integer balances, KHR remainder handling and debtor/creditor matching. `app/lib/money.ts` owns integer parsing and display formatting. Money utilities and `/tools/payback-calculator` account/history behavior stay unchanged. One verified shared-engine bug is corrected: with 201 KHR participants and 20,099៛ total, rounding the average before flooring to 100៛ assigned 20,100៛ in total shares. Floor the integer average before the existing 100៛ rule instead; matching/order/rounding policy otherwise remain unchanged. Both shared-engine and JekLuy regressions reproduced the bug before this one-line fix.

Use `parsePaybackRows`, `buildPaybackPeople`, `buildPaybackKhrRemainderMeta` and `computePaybackSettlements` directly. Participant IDs are engine keys so equal display names remain separate people. KHR retains PayBack's rounding down to 100៛; `ASSIGN_TO_PERSON` puts the entire remainder on the first participant so balances conserve exactly. USD retains the engine's input-order cent allocation. Display each person's actual target and explain any KHR remainder. No exchange/conversion is added.

The selected approach is a dedicated Nuxt page/layout with a small validation/storage/presentation adapter and composable. Restyling the existing authenticated PayBack page would change its current UX; embedding that page would retain authentication/history/API coupling. The dedicated view shares its engine while keeping those existing flows intact. This implements the user's detailed design and instruction to proceed; there is no separate design-approval or infrastructure step required for local code.

The page has a compact navy header, two default participants, one currency per draft, inline results, optional per-person details and copy/native sharing. Currency switching offers a confirmation that clears entered amounts and completion flags while retaining names. Drafts and repayment completion are versioned and stored only in this origin's localStorage. Completion belongs to the exact input amounts/IDs/currency; edits that change the calculation invalidate it. All visible labels, errors, feedback, dialogs and metadata are Khmer. Use the existing Hanuman font and light/dark mode; no new dependencies, backend, login, schema or production mutations.

## Implementation plan

- [x] Add tests for engine reuse through the adapter: requested example, all/zero/equal payers, integer remainders, decimal USD, invalid inputs, duplicate IDs/names, total conservation, completion identity and safe draft round trips.
- [x] Add `app/lib/jekluy.ts` for validation, engine delegation, Khmer summaries and versioned draft validation; add `app/composables/useJekLuy.ts` for SSR-safe reactive editing, persistence and completion.
- [x] Add `app/pages/jekluy.vue` and `app/layouts/jekluy.vue` for the responsive Khmer experience. Test currency confirmation, reset, restore, completed repayments and copy/share failure/cancellation behavior.
- [x] Add the `jekluy` product with `/jekluy` as its main-site/development entry and `/` on its hostname. Preserve all six existing products, PayBack, rollout gates, configurable origins, noindex previews and Vercel deployment sharing. Add sitemap discovery and a local-only route policy that skips auth/availability/ad UI work.
- [x] Run focused and full frontend tests, integer-policy TypeScript checks, Vue compilation, env-free Nuxt/Vercel build, packaged-server routing/SEO fixtures and whitespace checks. Record baseline failures and actual browser limitations accurately.

Review focus: duplicate names must not merge; edits must never retain stale paid marks; storage corruption/denial must not stop calculation; cancelled currency/reset dialogs must preserve data; no browser-only API during SSR and no backend dependence for JekLuy rendering.

## Manual deployment

Use the existing Vercel project/deployment and add `jekluy.chlatwork.com` as a custom domain. Add Cloudflare's exact CNAME record that Vercel supplies for `jekluy` (initially DNS-only), then wait for Vercel domain verification and HTTPS. Do not guess a CNAME target.

Append `jekluy` to `NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS` without removing the existing product names. Keep canonical/redirect activation separate. Test `/jekluy` on localhost or an exact preview origin already supported by `NUXT_PUBLIC_DOMAINS_PREVIEW_ORIGINS`; a staging hostname can be set through `NUXT_PUBLIC_DOMAINS_PRODUCT_ORIGINS` with canonical activation off. Publish a deployment, verify the root, refresh, storage, theme, copy/share and all other product smoke tests, then append `jekluy` to `NUXT_PUBLIC_DOMAINS_CANONICAL_PRODUCTS` and redeploy. Leave redirect products unchanged unless `/jekluy` has been explicitly approved for a permanent move. The existing `/tools/payback-calculator` is never mapped or redirected to JekLuy.

No Railway API, CORS, OAuth or database configuration is required for JekLuy. Rollback by reverting its deployment or removing only `jekluy` from activation lists; keep previous product names and destinations. Local drafts are origin-scoped and never imported automatically from PayBack or another domain. No deployment is performed by this implementation.

## Changed files

| Files | Purpose |
| --- | --- |
| `app/pages/jekluy.vue`, `app/layouts/jekluy.vue` | Mobile-first Khmer single-screen UI, responsive layout, existing theme/font and confirmation dialog |
| `app/lib/jekluy.ts`, `app/composables/useJekLuy.ts` | Shared-engine adapter, integer validation, Khmer summaries, SSR-safe local draft/completion management and sharing |
| `app/lib/payback-calculator.ts` | Verified one-line large-group KHR over-allocation fix; settlement matching remains shared and unchanged |
| `app/lib/product-domains.ts`, `server/utils/product-domain.ts`, `.env.example` | Explicit configurable `jekluy` hostname with existing activation/canonical/redirect stages |
| `app/data/site-routes.ts` | Public `/jekluy` discovery and per-domain sitemap inclusion |
| `app/lib/product-mobile-navigation.ts`, `app/components/layout/ProductNavigation.vue` | Complete the existing product definitions without adding account or expense navigation to JekLuy |
| `app/middleware/availability.global.ts`, `app/composables/useAdVisibility.ts` | Skip backend availability/session loading for the explicitly local-only page; other routes retain existing behavior |
| `tests/jekluy*.test.ts`, `tests/money.test.ts`, `tests/availability-navigation.test.ts` | Engine/rounding/conservation, draft, UI-session, sharing, local-only policy and domain regressions |
| `scripts/validate-jekluy.mjs`, this document | Packaged-server checks and manual deployment record |

## Validation (2026-10-26)

- `OPENSSL_CONF=/dev/null npm test`: **376 passed / 378 total**. The same two pre-existing assertions fail in `tests/moments.test.ts`: “daily Telegram voting keeps per-day history and owner insights” and “published Moment surfaces are unlisted and validate image content”. Their older backend source-string expectations are unrelated to JekLuy.
- JekLuy's **14 adapter/calculation**, **7 session**, **3 domain** and **1 local-policy** tests pass. Existing money tests (**11**) and availability-navigation tests (**7**) pass, including the shared-engine large-group regression. Missing-feature tests and both rounding regressions were observed failing before implementation/fix.
- Strict TypeScript passes for `jekluy.ts`, `useJekLuy.ts`, `product-domains.ts`, `product-mobile-navigation.ts` and imported money/PayBack helpers using the installed API TypeScript compiler. `vue-tsc --noEmit` is unavailable because `vue-tsc` is not installed. No package was downloaded. There is no frontend lint script.
- `OPENSSL_CONF=/dev/null node scripts/validate-subdomain-build.mjs`: production Nuxt/Vite client, SSR and Nitro Vercel packaging pass. It disables dotenv/global config loading and stores artifacts under `.tmp/subdomains/`.
- `OPENSSL_CONF=/dev/null node --experimental-strip-types scripts/validate-jekluy.mjs`: **43** packaged-server routing/SSR/SEO/preview checks pass, including Khmer metadata, two default inputs, unknown routes, gated hosts and **zero backend requests**. Fixtures contain no real accounts or sessions.
- `OPENSSL_CONF=/dev/null node scripts/validate-domain-config-runtime.mjs`: **187** existing domain/auth/configuration recovery checks pass. `OPENSSL_CONF=/dev/null node --experimental-strip-types scripts/validate-mobile-products.mjs`: all **9** existing product-page render checks plus standalone Link public-profile isolation pass.
- Independent review found and rechecked the shared KHR rounding fix and an explicit-label correction for manual copy. No remaining blockers were identified. `git diff --check` passes.
- Actual browser/device visual verification was **blocked**: the computer-use process could not read its system OpenSSL configuration and exited before opening the browser. The tests exercise session behavior and server rendering, not native mobile share sheets or a real rendered viewport. Manually verify 360px/390px portrait, landscape, tablet/desktop, dark mode, keyboard focus, clipboard/share permissions, refresh restore and confirmation cancellation on preview before production activation.
- No backend endpoints, database changes, dependencies, production configuration, real env files or deployments were introduced.
