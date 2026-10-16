# Telegram group workspaces

## Scope

Telegram-only users open **My Groups** from `/groups` or `/menu` privately in either bot. The Mini App verifies the current Telegram `initData`; no email, password or website ADMIN role is needed. A user explicitly requests manager approval. Ordinary members do not enter that approval queue.

An approved manager connects groups using Telegram's private group selector. Each selected group is checked against the manager's current administrator role and the bot's current administrator role. Candidate associations support discovery only; every management request checks the live role again. One Telegram group has one workspace shared by its administrators and both bot connections. Settings are independent between groups, with separate per-bot feature switches.

Connected group members can use enabled free voting, split and KHQR without personal approval or a website account. Explicit user rejection, suspension or per-bot disable overrides that access. AI still requires the requesting person's personal approval and shared wallet. A manager never pays for another member's AI. Reading the account balance does not initialize a welcome wallet.

The group selector follows the [Telegram Bot API request_chat contract](https://core.telegram.org/bots/api#keyboardbuttonrequestchat). Its returned ID is not authorization: the server verifies the bound sender, bot, expiring request and live roles.

## Manual database handoff

1. Back up and review the existing database using your normal operational process.
2. Apply the existing shared Bot Admin SQL first. Then review and manually execute `database/updates/2026-10-16-add-telegram-group-workspaces.sql`.
3. Regenerate Prisma during the normal release build and deploy the backend and frontend together after schema preparation.
4. Do not run Prisma reset, db push, destructive reconciliation or a data wipe.

The SQL is additive and enclosed in a transaction. It adds workspaces, connections, manager candidates, temporary connection requests, chat aliases, audit records, group poll binding and QR draft context. Backfill markers prevent reruns from silently reclassifying new ordinary members as manager requests or binding new unrelated polls. Current scheduled groups retain their configuration. Roster-only groups remain unverified until connected. Existing approved accounts, balances, QR images and ballots are retained.

**Visibility change:** the poll currently bound to a group is private to that workspace. Its old `/m/:slug`, public vote and public image URLs stop working. Unrelated website Moments retain public behavior. Telegram images use five-minute, media-scoped tokens with a separate JWT audience. These tokens do not authenticate website APIs.

No new environment variable or production secret is required. Continue configuring the existing bot credentials, frontend origin, JWT keys and webhook authentication through your normal production process; do not copy them into docs or source.

## Missing KHQR draft columns after deployment

PostgreSQL `42703` from `BotKhqrService.begin` mentioning `telegram_bot_qr_drafts.group_workspace_id` means the deployed API is using a database without the required draft columns. Both `group_workspace_id` and `workspace_version` are required by the upload and confirmation flow. Restarting the bot or regenerating Prisma alone does not add database columns.

If the group-workspace migration has not been applied, manually execute the complete `2026-10-16-add-telegram-group-workspaces.sql` file after its prerequisites. If workspace tables already exist and only the draft columns are missing, review and manually execute `database/updates/2026-10-16-repair-telegram-bot-qr-draft-workspace-columns.sql` in the same database used by the API. The repair stops if its prerequisite tables are absent, adds nullable columns without modifying existing rows, and returns the two column definitions for verification. If a statement fails, roll back the transaction before retrying.

After the two columns are present, open `/myqr` privately and start a fresh upload. Verify preview and confirmation in both bots. The repeated `Bot access notification delivery deferred` warning is a separate notification failure path; its generic message does not establish that it has the same cause as the KHQR error.

## Telegram setup

- Configure each bot's private Mini App domain to the deployed frontend and enable the Mini App in BotFather.
- Open `/groups` in private chat and use **My Groups**. Select Creator or ChlatWork as a UI preference; the server still derives the user's identity from signed Telegram data.
- Request approval, review the manager in `/admin/bots`, then connect a group through the one-use, ten-minute private connection link.
- Add the bot as an administrator before selection. Ensure webhooks receive `message`, `callback_query` and `my_chat_member`; include `chat_member` if you use roster observations. Retain existing Business and inline update types used by the bots.
- A member opens `/myqr` privately to upload/preview/confirm their own QR. The previous image remains until confirmation. Current group membership is checked again when a pending member confirms a change.
- Group vote configuration moves to My Groups. Old group configuration commands point administrators to the private management interface.

Bot removal or demotion pauses delivery. Reconnection refreshes permission health without resetting feature settings or clearing platform suspension. Verified group-to-supergroup migration preserves the workspace and old chat aliases. Rosters are copied into the new chat without deleting the old observations. Schedules move to the new chat; closed historical rounds keep their original chat IDs; open rounds retain their ID and ballots while moving to the new chat and receiving a replacement message. Old force-reply split prompts expire because their message IDs cannot be used in the new chat.

## Required live checks after release

Local mocked tests do not prove Telegram configuration, database backfill or browser rendering. Check these against a staging database and real test groups before production rollout:

1. A fresh Telegram user opens both bots without website signup, requests manager approval once, and appears in the manager queue. Existing approved users retain access.
2. One manager connects groups A and B; a second administrator connects A; both see the same A configuration and independent B settings. Creator and ChlatWork connections share one workspace.
3. Rename/delete/add choices in A, preserving surviving IDs and ballots. Canteen shows the current choice image and five-second joke without changing votes. B stays unchanged. A stale second-manager save returns 409 and preserves the prior poll, images and schedule.
4. Switch from A to B during loads, saves and uploads. Resolve the A request afterward; B must retain its data/draft. Revoke Telegram admin or platform approval and confirm private data clears on the next request.
5. A member with no ChlatWork profile votes, splits `/split 36000/6 @rong`, and requests KHQR in A. Confirm one QR/result message. Unconnected/paused B, cross-group callbacks and private/inline access to group polls are denied. Personal QR edits cannot target another owner.
6. Confirm pending member credit reads create no wallet/grant. AI uses the sender's approved account. Disable a group during status delivery/reservation and confirm no provider call and the existing refund behavior.
7. Remove/demote the bot, restore it, and migrate a test group to a supergroup. Verify no sends to the old chat, preserved history/rosters, expired old split prompts and one durable workspace. Conflicting destination bindings must fail closed.
8. Fetch a bound poll using its legacy public URLs; expect 404. Verify signed media expires after five minutes and cannot authenticate normal JWT endpoints.
9. Suspend/restore a workspace from platform Bot Admin with a reason. Confirm settings and history remain, and member website access and balances do not change.

Temporary connection requests can be removed after expiry by a separately reviewed retention job; they contain hashed nonces rather than usable deep-link tokens. No retention cleanup or database mutation was run during implementation.
