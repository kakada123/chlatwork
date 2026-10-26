# Product mobile UX update

The six product subdomains should feel like small, focused apps: a compact brand header, three or four thumb-friendly navigation items, one clear working area, and secondary explanations behind an explicit control. Keep existing desktop layouts, main-site navigation, authentication, API ownership, saved data, public profile/Moment canvases, and feature gates.

## Approach

Reuse the existing Nuxt layouts, tokens, Lucide icons and product-domain policy. Add one shared mobile product navigation component and pure route/active-state definitions. Product pages opt into compact mobile presentation through their existing product context; no new tools, services, packages, schema or production configuration are needed.

## Work

- [x] Shared shell: compact mobile product header, accessible More controls, safe-area bottom navigation, keyboard-aware visibility, and room for page controls without floating-action overlap.
- [x] Creator: searchable compact tool cards, short category filters, recent results and credits one tap away.
- [x] Link: clear manage/share actions, optional example preview, editor/preview switch without destroying drafts, comfortable section tabs and reachable save controls.
- [x] Moments: shorter creator/manager headers and compact step/form spacing; retain every creation, publication, media, invitation and voting control.
- [x] Expense: summary and date controls first, explicit expense/income actions; retain history filtering, authenticated persistence and existing save events.
- [x] Draw: wheel and names first, optional settings kept accessible, existing saved lists/history/fullscreen and legacy-origin access preserved.
- [x] Games: board before explanatory content on mobile, collapsible help/rules, entertainment-only virtual-point notice retained.
- [x] Validate navigation behavior, relevant existing tests, Vue compilation and Nuxt/Vercel build; inspect rendered fixture pages. Distinguish rendered-source checks from live browser/device verification.

The user's request authorizes the mobile UI implementation. Desktop and unrelated utility presentation remain unchanged except where a shared control needs a narrowly scoped responsive rule.

## Changed files

| Files | Purpose |
| --- | --- |
| `app/lib/product-mobile-navigation.ts`, `app/components/layout/ProductMobileNav.vue` | Shared destinations, active-state rules, localized navigation and existing quick-expense action |
| `app/components/layout/ProductNavigation.vue`, `app/layouts/default.vue`, `app/layouts/creator.vue`, `app/components/expense-tracker/QuickExpenseFab.vue` | Compact product header/More menu, safe-area spacing and preservation of the opt-in quick-expense shortcut |
| `app/pages/creator/index.vue` | Mobile search, category filters and compact tool cards |
| `app/pages/link.vue`, `app/pages/account-link.vue` | Short landing page and mobile editor/preview/share workflow without remounting unsaved drafts |
| `app/components/moments/MomentCreator.vue`, `app/pages/moments/index.vue` | Compact product creation and management screens |
| `app/pages/tools/expense-tracker.vue` | Direct mobile expense/income controls |
| `app/pages/tools/lucky-draw.vue` | Optional mobile settings, preserved local lists/history |
| `app/pages/tools/kla-klok.vue`, `app/components/kla-klok/KlaKlokHero.vue` | Board-first mobile view, optional rules and visible virtual-point notice |
| `tests/product-mobile-navigation.test.ts`, `tests/product-mobile-pages.test.ts`, `tests/creator-output-language.test.ts` | Navigation, filtering, feature gates, draft preservation, same-route reselection and rules reopening regressions |
| `scripts/validate-mobile-products.mjs`, this document | Repeatable fixture-only SSR checks and implementation/validation record |

## Validation (2026-10-26)

- Production Nuxt/Vite client and SSR builds plus Nitro Vercel packaging passed with `OPENSSL_CONF=/dev/null node scripts/validate-subdomain-build.mjs`; dotenv/global configuration loading is disabled and artifacts stay in `.tmp/subdomains/`.
- `OPENSSL_CONF=/dev/null npm test`: **349 passed / 351 total**. The two existing `tests/moments.test.ts` assertions remain failing: “daily Telegram voting keeps per-day history and owner insights” and “published Moment surfaces are unlisted and validate image content”. They assert older backend source strings and are unrelated to these UI changes.
- All four mobile-navigation tests, four mobile-page interaction tests and eight Creator-language/dashboard tests pass. Regression tests reproduced the Link view-selection and Games rules-reopening issues before their fixes. Quick-expense tests cover preference, authentication and availability gates.
- Vue script/template/style compilation passed for all 14 changed components. Strict TypeScript checking passed for the mobile-navigation and domain policies. Full Vue typechecking remains unavailable because `vue-tsc` is not installed; the available full-app TypeScript check still reports existing application/server typing errors. No frontend lint script is configured.
- `OPENSSL_CONF=/dev/null node --experimental-strip-types scripts/validate-mobile-products.mjs`: nine product-page render checks passed, including Khmer Moments, Link editor/share and standalone public-profile isolation. This only uses disposable fixture sessions and a mock API; static HTML artifacts are under `.tmp/mobile-products/`.
- `OPENSSL_CONF=/dev/null node scripts/validate-domain-config-runtime.mjs`: **187** packaged-server domain/auth/configuration recovery assertions passed using the mock API.
- Independent scoped review found no remaining blockers after fixes for Link preview navigation, Games rules reselection and opt-in quick-expense access. `git diff --check` passed.
- Actual browser/device layout and provider login were **not verified**. Headless Chrome exited before rendering, including when retried outside the sandbox. Check 360/390px portrait, landscape, keyboard interaction, light/dark mode and desktop on a preview deployment before production rollout. No production service, account, data or deployment was changed.
