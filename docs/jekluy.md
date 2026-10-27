# JekLuy implementation and rollout

## Existing engine and design

JekLuy is a Khmer-only, local-first interface around the existing PayBack engine, not another calculator. `app/lib/payback-calculator.ts` owns input parsing, integer balances, KHR remainder handling and debtor/creditor matching. `app/lib/money.ts` owns integer parsing and display formatting. Money utilities and `/tools/payback-calculator` account/history behavior stay unchanged. One verified shared-engine bug is corrected: with 201 KHR participants and 20,099៛ total, rounding the average before flooring to 100៛ assigned 20,100៛ in total shares. Floor the integer average before the existing 100៛ rule instead; matching/order/rounding policy otherwise remain unchanged. Both shared-engine and JekLuy regressions reproduced the bug before this one-line fix.

Use `parsePaybackRows`, `buildPaybackPeople`, `buildPaybackKhrRemainderMeta` and `computePaybackSettlements` directly. Participant IDs are engine keys so equal display names remain separate people. KHR follows PayBack's default `LEFTOVER_ONLY`: round shares down to 100៛ and display the leftover separately, without automatically increasing the first person's share. The existing `ASSIGN_TO_PERSON` option remains available with a person selector; explicit assignment fully balances the group. The rounded KHR share stays visible in the main summary, with actual contributions in the breakdown. USD retains the engine's input-order cent allocation. No exchange/conversion is added.

KHR cash repayments additionally use balanced 100៛ units, as requested after the 14,967៛ screenshot. Exact PayBack outputs remain available for audit. Round net debtor/creditor balances within a common cash budget, cap refunds at what each person actually paid, and reuse PayBack's matching function for the resulting cash balances. Assign extra units by largest fractional remainder in deterministic engine order. When sub-100៛ funding makes balanced nearest rounding infeasible, round down exact repayments instead of over-refunding anyone. Zero cash transfers are omitted; exact-to-cash differences and actual final contributions remain explicit. USD keeps exact cent payments.

The selected approach is a dedicated Nuxt page/layout with a small validation/storage/presentation adapter and composable. Restyling the existing authenticated PayBack page would change its current UX; embedding that page would retain authentication/history/API coupling. The dedicated view shares its engine while keeping those existing flows intact. This implements the user's detailed design and instruction to proceed; there is no separate design-approval or infrastructure step required for local code.

The page has a compact navy header, two default participants, one currency per draft, inline results, optional per-person details and copy/native sharing. Currency switching offers a confirmation that clears entered amounts and completion flags while retaining names. Drafts and repayment completion are versioned and stored only in this origin's localStorage. Completion belongs to the exact input amounts/IDs/currency and any active KHR remainder policy; edits that change the calculation invalidate it. Existing drafts retain their names and amounts; drafts without explicit remainder settings adopt PayBack's separate-leftover default. All visible labels, errors, feedback, dialogs and metadata are Khmer. Use the existing Hanuman font and light/dark mode; no new dependencies, backend, login, schema or production mutations.

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

### KHR alignment with PayBack (2026-10-27)

The KHR view now uses PayBack's `LEFTOVER_ONLY` default instead of automatically assigning the remainder to the first participant. For 10,000៛ across three participants, the displayed share and the two repayments are 3,300៛, while 100៛ remains explicitly separate. Users can select the existing assignment mode and choose who covers that remainder. Copy/share summaries retain the separate remainder; a zero-transfer result never implies that an unassigned remainder has been settled. USD behavior and the shared PayBack engine are unchanged by this alignment.

Existing draft amounts/names are preserved. Remainder settings persist locally, and changing an active remainder mode/payer invalidates repayment marks. Both modes are checked against the existing PayBack engine directly. The four new adapter regressions failed before the change and pass afterward; adapter tests are now **18**, session tests **8**. The fresh frontend suite is **381 passed / 383 total**, retaining the same two pre-existing Moments failures. Strict adapter/composable TypeScript checks, the Nuxt/Vite/Nitro Vercel build, **43** packaged JekLuy checks and **187** domain/webhook recovery checks pass. No production bot code, webhook settings or deployment was changed for this fix.

### Cash repayments and system-theme default (2026-10-27)

Rounding only the share left exact repayments such as 14,967៛ visible. Cash repayments now use 100៛ units: for [3,333៛, 33,333៛], the exact 36,666៛ total and 18,300៛ base share stay intact, while the actual repayment is **15,000៛**. The optional audit shows 14,967៛ → 15,000៛. Per-person payable balances, completion IDs and copied/shared instructions use the cash amounts. Changed cash-policy calculations invalidate old paid marks without changing saved inputs. Waived tiny amounts are described as no transfer due, never as equal contributions.

Review caught that independently rounding each transfer could over-refund one payer: [300,50,50,50,50]៛ would incorrectly produce four 100៛ payments. Balanced net rounding now produces two 100៛ payments, leaving the payer's actual contribution at 100៛. Tests cover that case, 201-person groups, many tiny creditors, both remainder modes, positive cash units, preserved total spending, nonnegative actual contributions and 240 deterministic varied group/policy fixtures. The existing shared PayBack algorithm and page are unchanged by this cash-policy correction.

`app/composables/useColorMode.ts` and the first-paint script in `nuxt.config.ts` had hardcoded light defaults. Both now use the browser's system color scheme when no valid manual preference is saved. Saved light/dark overrides still win, OS changes are observed, SSR does not inspect browser APIs, and blocked localStorage does not prevent a system-derived first paint. No existing preference is cleared or automatically saved.

Validation: **391 passed / 393 frontend tests**, with the same two pre-existing Moments failures named above. All **23** adapter tests, **8** session tests, the real Vue SSR screenshot regression and **4** executable theme tests pass. Strict adapter/composable TypeScript and the Nuxt/Vite/Nitro Vercel build pass. Packaged validation passes **43** JekLuy checks, **187** domain/webhook checks and the **9** existing product-page render checks. `git diff --check` passes. Native browser verification remains unavailable in this environment; no production deployment/settings or bot code was changed.
