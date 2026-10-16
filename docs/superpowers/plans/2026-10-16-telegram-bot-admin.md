# Shared Telegram Bot Admin implementation plan

**Goal:** Deliver the approved shared dashboard and private onboarding/KHQR workflow for Creator and ChlatWork.

**Spec:** `docs/superpowers/specs/2026-10-16-telegram-bot-admin-design.md` (approved).

**Architecture:** A shared Nest module owns numeric Telegram identity registration, profile approval, per-bot access, private KHQR drafts and audit events. Existing user authentication, wallet reservations and administrative credit services remain authoritative. Nuxt provides an authenticated admin page and BFF routes.

**Stack:** NestJS, Prisma/PostgreSQL, Vue/Nuxt, TypeScript, Jest.

**Constraints:** No secret inspection, automatic database changes, account promotion, production deployment, or unrelated refactoring. Preserve website access, existing balances and registered Telegram identities. Group observations never create accounts. New storage uses additive, manually executed SQL.

## Tasks

- [x] 1. Add schema/standalone SQL, approval/access service and identity tests. Backfill only canonical registered Telegram identities; serialize registration and mutations; version admin edits.
- [x] 2. Add authenticated dashboard API and audit/history queries. Reuse credit adjustment and daily limit services, including their idempotency and expected-balance checks.
- [x] 3. Enforce access before both webhook dispatchers and queued Creator generation. Handle private start/status/help without bypassing callbacks, groups or Business processing; send approval notifications only to recorded private starts.
- [x] 4. Add private owner-derived KHQR upload, bounded decoded-image validation, expiring preview/confirmation and removal; expose audited admin replacement.
- [x] 5. Connect paid bot AI operations to the shared reservation/refund path with bot provenance; keep voting, split and KHQR free.
- [x] 6. Build `/admin/bots` with overview, user/status/bot search, approval/access controls, shared credits/daily limits, QR and audit history. Add navigation and safe authenticated proxies.
- [x] 7. Run focused regressions, API typecheck/tests, Vue compilation and diff checks. Obtain an independent security/correctness review, address findings, document manual rollout and live-validation limits.

## Validation / review focus

Write behavioral tests before new implementation: sender-owned identity, pending access, independent permissions, idempotent approval and starting grants, version conflicts, QR ownership/confirmation and invalid-image preservation. Verify access again in workers, private-only account details, ledger concurrency, rejected callbacks and direct API authorization. Inspect final changes against the approved spec. Report local checks separately from database, browser, provider and Telegram proof.

## Execution ledger

- Approved design accepted by the user. Proceed inline in the existing worktree; do not ask for repeated implementation approval.
- Existing source checks use local binaries with `OPENSSL_CONF=/dev/null`; never load real environment files. SQL is delivered for manual review and execution only.

- Independent review found and resolved an SQL replacement error and a Creator revocation window. The reviewer rechecked both fixes and found no remaining concrete blockers.
- Final API validation: 74 suites / 1,095 tests passed from repository root; the existing path-dependent Telegram schema suite passed separately from api (3 tests). API TypeScript and offline Prisma schema validation passed.
- Final frontend validation: 19 focused behavior/proxy tests passed, including compilation of all new Vue scripts/templates and clearing admin data after sign-out or role loss.
- Migration execution, deployed providers, live Telegram delivery and real-browser interaction remain release checks, documented in docs/telegram-bot-admin-rollout.md. No production or database changes were performed.
