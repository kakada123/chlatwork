# Telegram Group Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user selects delegated execution. Steps use checkbox syntax for tracking.

**Goal:** Let approved Telegram managers connect and independently manage multiple groups from a Telegram Mini App, while group members use enabled free features without website registration or individual approval.

**Architecture:** Keep `/admin/bots` for platform administration and introduce `/bot/groups` for Telegram group managers. A small group-access module verifies live Telegram roles and workspace state; connection, poll and settings services consume that authority. Reuse personal identities/wallets and the current vote engine, with explicit group binding and public-access protection for group polls.

**Tech Stack:** Existing Nuxt/Vue, NestJS, Prisma/PostgreSQL, Telegram Bot API, Jest and Node test runner. No new product dependencies required.

**Spec:** `docs/superpowers/specs/2026-10-16-telegram-group-workspaces-design.md` — approved by the user on 2026-10-16.

## Global Constraints

- Telegram users need no email, password, website signup or website ADMIN role.
- A Telegram group has one durable workspace, even when connected through both bots or by multiple managers.
- Each group has independent settings, poll configuration, schedule, participants, split state and history.
- A group manager never receives website ADMIN privileges.
- Group configuration requires an approved manager plus their current Telegram group admin role.
- Free group voting, split and KHQR require an active connected workspace and verified group membership, without individual platform approval.
- Private KHQR management requires owner identity and current active-group membership or existing approved personal access; it must not grant paid access.
- Paid AI uses the requesting person's own approved identity and shared wallet. Never charge the manager for another member's request.
- Platform restrictions and explicit user/group suspensions override group feature switches.
- Preserve existing votes, stable option IDs, Canteen behavior, combined split QR/result messages, personal KHQR and balances.
- Prepare additive standalone SQL for manual execution. Do not execute database changes, deploy, inspect real environment files or install dependencies.
- Preserve current worktree edits. Keep new TypeScript/Vue files focused and normally formatted; avoid packed one-line blocks and unrelated formatting.

## Review Focus

1. A manager switches between two groups while saves or uploads are pending: server checks and client request versions prevent a response or draft from affecting the other group. Owned by Tasks 3 and 5.
2. A second administrator connects the same group, or a former manager loses their Telegram role: one shared workspace remains, with live management checks and no cached permanent grant. Owned by Tasks 1 and 2.
3. A button from a different group, an inline callback without group context, or a removed bot attempts an action: deny scoped access without leaking another group's data. Owned by Tasks 3 and 4.
4. A free member opens private KHQR or credits: preserve owner-only QR editing, avoid a manager-approval request, and do not initialize a welcome wallet or enable AI. Owned by Tasks 1, 4 and 5.
5. A group migrates to a supergroup while scheduled work, votes or split prompts exist: preserve the workspace and historical records, remap only the verified migration, and pause sends when permissions cannot be verified. Owned by Tasks 2 and 4.

## Shared contracts

Create `api/src/group-workspaces/group-workspaces.types.ts` and the corresponding frontend types in `app/services/group-workspaces.service.ts`.

- `GroupContext = { workspaceId: string; chatId: string; title: string; bot: BotKind; workspaceVersion: number; connectionVersion: number }`.
- `GroupFeatures = { voting: boolean; split: boolean; khqr: boolean; creator: boolean }`.
- ChlatWork supports voting/split/KHQR; Creator supports Creator AI. Unsupported features are false and omitted from the relevant editor.
- `GroupAccessService.manager(userId: string, workspaceId: string, bot: BotKind): Promise<GroupContext>` throws a safe access/unavailable error on failure.
- `GroupAccessService.member(bot: BotKind, chatId: string, telegramUserId: string): Promise<GroupContext | null>` returns a verified, active context or null; it never creates an account.
- `GroupAccessService.personalQr(bot: BotKind, userId: string): Promise<GroupContext | null>` resolves current membership in a connected workspace for private owner operations; explicit account suspension still denies access.
- `GroupWorkspaceService.details(userId, workspaceId, bot)` returns group metadata, supported features, current connection health, poll/schedule and group activity, without another member's personal balance.
- All group reads/mutations use authenticated user identity plus server-resolved group context. A request body never chooses its owner or billing account.

## Task 1: Workspace storage, manager requests and shared authorization

**Files:**
- Create: `api/src/group-workspaces/group-workspaces.types.ts`, `group-access.module.ts`, `group-access.service.ts`, `group-access.service.spec.ts`.
- Modify: `api/prisma/schema.prisma`, `api/src/bot-admin/bot-access.service.ts`, `bot-access.service.spec.ts`, `bot-admin.service.ts`.
- Create: `database/updates/2026-10-16-add-telegram-group-workspaces.sql`.

**Interfaces:** Produce the shared access contracts above. Export `GroupAccessService` from a dependency-light module that does not import Moments, the platform dashboard or bot dispatchers.

- [x] Write failing tests: an approved current Telegram admin can manage group A; a regular member cannot; an admin of B cannot access A by changing a UUID; Telegram permission failures return no data; rejected/suspended identities stay blocked; group observations never create manager requests or wallets.
- [x] Run: `OPENSSL_CONF=/dev/null node api/node_modules/jest/bin/jest.js --config api/jest.config.cjs --runInBand --no-cache --cacheDirectory api/.cache/jest api/src/group-workspaces/group-access.service.spec.ts`. Expect failure for the missing access service.
- [x] Add workspace records with UUID, unique numeric chat ID, title, platform status, version and timestamps; per-bot connection records with enabled state, supported feature flags, permission health and version; manager candidate associations for bounded My Groups discovery; short-lived connection requests; group audit records with unique operation keys; historical chat aliases for verified migration. Candidate associations help discovery but never authorize management.
- [x] Add `manager_requested_at` to bot profiles. Separate ordinary Telegram identity creation from `requestManagerAccess(userId, bot)`. New `/start` identities remain unprivileged; only an explicit manager request enters the new manager queue. Preserve previously pending access requests in the migration and keep personal paid-access rules intact.
- [x] Implement role checks using canonical numeric Telegram identities, `getChatMember` and cached bot identity. Require the bot's necessary admin role before enabling group management; distinguish an absent per-bot permission from an explicit disabled permission.
- [x] Prepare rerun-safe SQL: seed known groups as independent workspaces, link current schedules without deleting history, and preserve explicit suspensions. Roster-only groups are candidates until connected/verified. Do not modify existing credit balances or infer managers from names.
- [x] Run the focused tests and existing bot-access/admin tests. Expect all access denials before any state mutation; inspect the SQL manually and keep it unapplied.

## Task 2: Verified group connection and Telegram lifecycle

**Files:**
- Create: `api/src/group-workspaces/group-connections.service.ts`, `group-connections.service.spec.ts`, `group-workspaces.controller.ts`, `group-workspaces.dto.ts`, `group-workspaces.module.ts`.
- Modify: `api/src/telegram-bot/telegram-bot.types.ts`, `telegram-bot.client.ts`, `telegram-bot.service.ts`, `telegram-bot.module.ts`; `api/src/creator-telegram/creator-telegram.service.ts`, `creator-telegram.module.ts`; `api/src/bot-admin/bot-gateway.service.ts`.

**Interfaces:** `request(userId: string, bot: BotKind): Promise<{ deepLink: string; expiresAt: string }>`; `handlePrivateStart(bot: BotKind, message: TelegramMessage): Promise<boolean>`; `handleLifecycle(bot: BotKind, update: TelegramUpdate): Promise<boolean>`.

- [x] Write failing tests for sender-bound group selection, ten-minute expiry, replay to a different group, duplicate delivery, two managers/two bots connecting the same group, an explicitly suspended group, demotion and group-to-supergroup migration.
- [x] Run `group-connections.service.spec.ts` using the Task 1 Jest command pattern; confirm failure before implementation.
- [x] Issue a server-generated private `/start connect_<nonce>` deep link, with a hashed nonce and a bounded positive `request_id`. Send a Telegram `request_chat` keyboard in private chat; validate `chat_shared`, the matching sender/request/bot, returned negative group ID and live roles before committing a connection. Do not accept typed group IDs or client-asserted administrator flags.
- [x] Make retries idempotent for the original group while rejecting a replay against another group. Reuse the workspace's settings on subsequent connections; connecting a bot cannot clear a platform suspension or another bot's settings.
- [x] Process `my_chat_member` and verified `migrate_to_chat_id`/`migrate_from_chat_id` events before ordinary sender gating. Pause unavailable connections; retain schedules/history and map the existing workspace to the new canonical chat ID without creating a second workspace. Conflicting destination bindings fail closed.
- [x] Add JWT-authenticated endpoints: `GET /bot/groups/session`, `POST /bot/groups/manager-request`, `POST /bot/groups/connections`, `GET /bot/groups`, `GET /bot/groups/:id?bot=...`. My Groups checks live roles for known candidate groups with bounded pagination.
- [x] Run connection, webhook and identity regressions. Expect one workspace and one connection per bot/group after retries, and no website ADMIN promotion.

## Task 3: Independent group settings, private voting and media

**Files:**
- Create: `api/src/group-workspaces/group-workspace.service.ts`, `group-vote.service.ts`, `group-poll-media.service.ts`, `group-poll-media.controller.ts`, plus corresponding `.spec.ts` files.
- Create: `api/src/moments/moment-poll-editor.ts`, `moment-poll-editor.spec.ts` for the shared stable-option transaction logic.
- Modify: `api/src/moments/moments.service.ts`, `moments.module.ts`, relevant existing Moment tests; `api/src/group-workspaces/group-workspaces.controller.ts`, `group-workspaces.dto.ts`, `group-workspaces.module.ts`; `api/src/telegram-bot/telegram-vote.ts`.

**Interfaces:** `saveFeatures(userId, workspaceId, bot, { expectedVersion, features }, key)`; `saveVote(userId, workspaceId, { expectedVersion, question, options, timeZone, sendHour, sendMinute, durationMinutes, enabled }, key)`; `setOptionImage(userId, workspaceId, optionId, expectedVersion, file)`; `resetToday(userId, workspaceId, expectedRoundId, key)`.

- [x] Write failing tests: editing A leaves B unchanged; two group managers share one poll; a stale save returns 409 without deleting votes/images; renames retain ballots and IDs; deleted IDs are never reused; Canteen never counts; cross-group media/round IDs are denied; public Moment endpoints cannot reveal a bound group poll.
- [x] Run the group-vote/media tests and existing Moment option-editing tests; confirm the new cases fail before implementation.
- [x] Bind one active poll configuration to each workspace using a nullable unique `moments.group_workspace_id` relation. Create minimal group poll records internally, independent of the three-active-website-Moments limit. Exclude bound polls from ordinary website ownership/list/count/edit/delete paths. Lock group settings and poll mutations together with their expected version; preserve the existing stable-option counter and ballot semantics through the shared editor helper.
- [x] Validate question length 1–240, 2–15 unique options, labels 1–120, hour 0–23, minute 0–59 and duration 1–1440 minutes. Validate the timezone using `Intl.DateTimeFormat`. Use Telegram sender identity for new group polls so free members do not need website login. Preserve existing active-round identities and ballots during backfill; resolve legacy login-required vote identity internally on an explicit verified vote without creating a manager request or granting credits.
- [x] Expose manager-authorized routes: `PATCH /bot/groups/:id/features?bot=...`, `PUT /bot/groups/:id/vote`, `PUT /bot/groups/:id/vote/options/:optionId/image`, `POST /bot/groups/:id/vote/reset`, `GET /bot/groups/:id/vote/history?page=...`, `GET /bot/groups/:id/khqr?bot=...` and `GET /bot/groups/:id/activity?page=...`. Mutations require expected versions and idempotency keys; history/activity pages have 20 entries and a bounded positive page number.
- [x] Use the existing schedule/round engine with the workspace's own poll. Never move one workspace's poll into another. Group history queries must constrain the historical round's chat ID/aliases, including older rounds from previously moved legacy Moments.
- [x] Split publication-state checks from public-access checks in Moments. Deny group-bound public detail/vote/media and generic owner mutation paths, while internal verified Telegram/group paths still function. Existing unrelated website Moments retain their behavior. Remove public `/m/:slug` buttons from group-bound poll keyboards.
- [x] Provide scoped image reads and Telegram-fetchable, five-minute media tokens using the existing JWT signer with audience `telegram-group-media` and purpose/media/workspace/bot claims. Such a token cannot authenticate normal web APIs. Verify current group binding and connection state on fetch; set no-store/nosniff and bind upload ownership server-side. Reuse the existing 10 MB poll-image limit and bounded decoder/transcoder.
- [x] Run focused tests and Moment regressions. Expect authorization/version failures to leave the old poll, ballots, schedule and images intact.

## Task 4: Free participation, private KHQR and execution gates

**Files:**
- Modify: `api/src/bot-admin/bot-gateway.service.ts`, `bot-khqr.service.ts`, related tests; `api/src/telegram-bot/telegram-bot.service.ts`, `telegram-quick-split-conversation.ts`, `daily-moment-vote.scheduler.ts`, their tests; `api/src/creator-telegram/creator-telegram.service.ts`, `creator-telegram.worker.ts`, their tests; `api/src/creator-ai/creator-generation.service.ts`, `creator-credits.service.ts`.
- Create: `api/src/group-workspaces/group-feature-policy.ts`, `group-feature-policy.spec.ts`, `group-participation.spec.ts`.

**Interfaces:** `GroupFeaturePolicy.assertEnabled(context: GroupContext, feature: keyof GroupFeatures): Promise<void>` combines current group and platform switches. Paid source context carries the workspace UUID and bot in addition to the existing requesting user ID.

- [x] Write failing tests for a profile-free member voting/splitting/requesting KHQR in active A; the same actor denied in unconnected/paused B; explicit user suspension denied; free access unable to invoke group configuration or AI; private own-QR success without manager approval; another person's QR denied; private credit display creates no initial grant.
- [x] Write worker/scheduler tests: disable a group during status delivery or reservation; prevent provider work and use the existing refund path; removal/migration does not send to the old chat; stale callbacks and split prompt replies cannot target a different group.
- [x] Run the new participation/policy tests and affected webhook/worker tests; verify the missing policy behavior fails.
- [x] Route only the supported free commands/callbacks through verified workspace membership before the existing per-person gate. Resolve callback poll/round/split IDs against the same workspace. Inline callbacks without trustworthy group context cannot access group-private data. Keep unrelated group chatter and other bots' commands silent.
- [x] Apply feature checks at command entry, callbacks, each split wizard step, scheduled send and queued paid execution. Recheck after long waits and immediately before provider work; keep sender billing separate from group delivery. Allow existing cleanup/finalization to retire already-created state safely while blocking new work after suspension.
- [x] For private KHQR, derive the owner from signed identity; allow existing personal approval or freshly verified membership in an active connected group. Retain byte/dimension validation, expiring drafts, preview, save/remove confirmation and current-image preservation. Recheck the chosen workspace/profile version when committing; never create an AI wallet or manager request as a side effect.
- [x] Keep personally approved AI and existing wallet/refund semantics. Add a read-only member credit/status response that reads an existing wallet without calling `getBalance`/welcome-grant initialization for pending members.
- [x] Run group participation, bot-admin, voting, split, QR, scheduler and Creator regressions. Expect free use without registration/approval, zero unauthorized paid calls and no cross-group delivery.

## Task 5: Telegram Mini App, authenticated proxies and platform oversight

**Files:**
- Create: `app/layouts/bot.vue`, `app/composables/useBotSession.ts`, `app/services/group-workspaces.service.ts`.
- Create: `app/pages/bot/groups/index.vue`, `app/pages/bot/groups/[id].vue`, `app/pages/bot/account.vue`.
- Create: `app/components/bot/GroupSwitcher.vue`, `GroupOverview.vue`, `GroupVoteSettings.vue`, `GroupFeatureSettings.vue`, `GroupKhqrDirectory.vue`, `GroupActivity.vue`, `GroupConnect.vue`.
- Create: `server/api/bot/groups/[...path].ts`, `tests/telegram-group-workspaces.test.ts`.
- Modify: `app/pages/admin/bots.vue`, `api/src/bot-admin/bot-admin.controller.ts`, `bot-admin.service.ts`, `server/api/admin/bots/[...path].ts`, relevant frontend tests and private bot menus.

**Interfaces:** Frontend service mirrors the Task 2/3 HTTP contracts. Session state is `loading | ready | pending | error | outside-telegram`; manager status is `NOT_REQUESTED | PENDING | APPROVED | REJECTED | SUSPENDED`. The bot selector is a validated UI preference, never identity or permission proof. `useBotSession()` exposes `{ state, user, managerStatus, bot, initialize, requestManagerAccess, clear }`; it always exchanges the current Mini App's verified `initData` before displaying personal/group data.

- [x] Write failing behavior tests: Telegram-only first open has no website signup redirect; pending manager request is idempotent; two independent group cards open the correct settings; a late A response/upload cannot alter B; loss of session/role clears private data; stale setting conflicts require refresh and a new review; BFF rejects unsupported methods/paths and cross-origin form mutations before forwarding.
- [x] Run `OPENSSL_CONF=/dev/null node --test --experimental-strip-types tests/telegram-group-workspaces.test.ts`. Behavior and compilation checks passed; frontend tests were introduced against the implementation, so no missing-file red run is claimed.
- [x] Implement a compact mobile-first bot layout with My Groups, account actions and an always-visible selected-group title. Do not reuse website ADMIN middleware or expose implementation details in the flow. Outside Telegram, explain how to open the bot; expired/invalid initData gets a clear retry action without displaying cached account data.
- [x] Build group overview, voting, feature settings, roster KHQR previews and activity using small components. Include option search/add/rename/delete/image replacement with stable IDs. Confirm destructive reset/stop/remove actions; version all writes and bind uploads to the selected workspace snapshot. Display only features the selected connected bot supports.
- [x] Connect My KHQR to the private owner flow, and show personal credits/status separately from group management. Add Manage My Groups buttons in both private bot menus, and a private `/start myqr` deep-link destination for the owner QR flow. Use ordinary URLs, not group Web App buttons, when a group message needs to direct someone to the private bot.
- [x] Proxy only the explicit `/bot/groups` endpoint allowlist through HttpOnly authenticated sessions. Require `X-Group-Workspace: 1` for cookie-authenticated mutations; forward idempotency keys and streamed bounded uploads; strip browser cookies from upstream requests and return no-store responses. JWT group controllers enforce authorization independently of the proxy.
- [x] Add platform-admin `GET /admin/bots/groups`, `GET /admin/bots/groups/:id` and `POST /admin/bots/groups/:id/status` for the workspace list/detail and versioned suspend/restore action with reason, idempotency key and audit. This control does not promote managers, reset settings or disable the website account.
- [x] Run Mini App behavior tests, compile all new Vue scripts/templates and affected page/layout scripts, then run existing admin/credit/proxy regressions. Confirm no raw financial/provider data appears in group activity.

## Task 6: Final validation and manual rollout

**Files:**
- Create: `docs/telegram-group-workspaces-rollout.md`.
- Update: this plan's execution ledger and `docs/telegram-bot-admin-rollout.md` with the corrected manager/member policy.

- [x] Run API TypeScript checks through the local binary: `OPENSSL_CONF=/dev/null node api/node_modules/typescript/bin/tsc --noEmit --incremental false -p api/tsconfig.json`.
- [x] Validate Prisma using an explicit local config that skips `.env` loading and dummy local database values. Regenerate the development client only through that explicit config when necessary; do not connect to a database.
- [x] Run the focused tests from Tasks 1–5, then the full API suite. Existing `telegram-bot-schema.spec.ts` uses paths relative to `api`, while the Gemini routing fixture needs repository-root execution: run that schema suite separately if the path inconsistency remains, and report batches accurately.
- [x] Run focused frontend behavior/proxy/credit/admin tests, Vue compilation and diff/format checks without unrelated formatting churn. Run a full Nuxt build only if it can explicitly avoid every real environment file; otherwise report Vue compilation separately.
- [x] Obtain one independent final review covering group identity isolation, free/paid boundary, group-private public endpoints, role revocation, migration preservation and queue races. Fix concrete findings and rerun affected checks.
- [x] Document manual migration order after the shared Bot Admin SQL, current group-poll visibility changes, bot permission/connection setup, existing-data backfill, and Telegram/browser verification. Do not execute migrations or deploy.
- [x] Report changed files, behavior, exact validation results, live-check limitations and a scoped commit message. Proposed final message: `feat: add Telegram group workspaces and self-service management`.

## Execution ledger

- The user approved the corrected written design on 2026-10-16.
- Plan self-review: all design sections map to Tasks 1–6; live group role checks, free/paid access, private poll media, manager queue separation, multi-bot identity, history preservation and migration handling have explicit owners and tests.
- Recommended execution: native implementation in this session, with one fresh independent reviewer at the end. Tasks share identity, policy and vote-engine contracts; keeping one implementer reduces integration churn and repeated context.
- The user approved native implementation here with one independent final reviewer. Implementation is complete on codex/telegram-group-workspaces.
- Final local validation: 1138 API tests plus 3 separately executed schema tests; 45 frontend tests including Vue compilation; API TypeScript and env-free Prisma validation passed.
- One independent review and follow-up verification completed. All five findings were fixed with regressions (legacy KHQR command gating, open-round migration, reset revocation race, inactive profile-free linked identities, activity actors/usage).
- Manual rollout instructions: docs/telegram-group-workspaces-rollout.md. Database SQL remains unapplied; no deployment, live Telegram/provider/browser proof, commit or push.
- Execution ledger and command logs: .cache/telegram-group-workspaces/progress.md. The frontend tests were added against implementation rather than a missing-file red run; this deviation is recorded rather than claiming one.
