# Telegram group workspaces — corrected design

Status: approved by the user on 2026-10-16.

This corrects the scope of `2026-10-16-telegram-bot-admin-design.md`. The platform administration work remains useful for approvals and credits, but it does not fulfill group managers' self-service needs by itself. This document governs group access and management where the earlier design conflicts with it.

## Confirmed intent

People who have never registered on the ChlatWork website can start a Telegram bot, request approval as a manager, connect their own groups, and manage those groups from a Telegram Mini App.

The user selected:

- A Mini App with **My Groups** and a separate settings page for each group.
- Manager approval, followed by free voting, split and KHQR access for that connected group's members without individual approval.
- Multiple independent group spaces for one manager, just as the platform owner's groups need separate settings.

Retain prior decisions: one shared personal credit wallet across both bots, existing registered accounts keep access, owner-controlled personal KHQR, and platform admin approval/credit management.

## Recommended architecture

Extend the existing app and bots with a dedicated Telegram-facing area, `/bot/groups`, rather than a second deployed admin application. Reuse signed Telegram Mini App authentication and the existing shared identity/wallet. Telegram users need no email, password, website signup or website ADMIN role. Internal identity reuse prevents duplicate balances; it must not appear as a separate registration step.

An alternative separate portal would duplicate authentication and deployment. Managing all settings only in private bot chat was considered; the user selected a Mini App for the clearer multi-group experience.

Keep two distinct roles in the product:

| Person | Capability |
| --- | --- |
| Platform admin | Approve/reject managers, adjust credits, suspend bot/group access, inspect audits |
| Approved Telegram group manager | Connect and configure groups where Telegram currently confirms they are owner/admin |
| Group member | Use enabled free group features without a website account or individual platform approval |

A group manager never receives website ADMIN privileges. Telegram's current group role, not a username or a cached ownership claim, authorizes group management.

## User journey

1. The person privately starts either bot. Reuse or create their Telegram identity automatically. Choosing Manage My Groups requests manager approval if needed; simply participating in a connected group does not add someone to the manager approval queue.
2. After approval, **Manage My Groups** opens the Mini App directly, authenticated using verified Telegram `initData` from the correct first-party bot.
3. **My Groups** lists only connected groups they can currently manage. It supports multiple groups; selecting one enters its own workspace.
4. **Connect group** guides them through adding the bot and choosing a group. A server-issued, short-lived connection request binds the private Telegram sender, selected bot and returned group. Do not accept a typed chat ID as ownership proof.
5. Verify that the person is currently a Telegram owner/admin and that the bot belongs to the group with the necessary administrator permissions. Then create or attach the group workspace idempotently.
6. The same Telegram group connected through both bots has one workspace, with separate bot connections/settings inside it. Connecting another bot or another group cannot overwrite an existing group's settings.
7. Group members can immediately use that active workspace's enabled free features. Personal KHQR management stays private and owner-authenticated; paid AI still requires its own approved account and balance.

Do not promise automatic discovery of every group in a Telegram account. List connected and verified groups; provide an explicit connection flow for additional groups.

## Mini App screens

**My Groups**: connected-group cards with title, bot connection badges, active/paused state and a Connect group action. Empty state explains how to connect the first group.

**Group workspace**: persistent group title and switcher, with these focused sections:

- **Overview:** bot connection/permission health, enabled features, today's vote state, recent group actions.
- **Voting:** group-specific question, options and option images; stable option identities for editing after votes; Canteen behavior preserved; schedule, timezone, duration and enabled state; guarded reset/stop controls.
- **Features:** group-level voting, split, KHQR and Creator availability where supported. A group switch can restrict a feature but cannot override a platform-wide disablement or grant paid access.
- **KHQR:** preview payment images for that group's verified member roster, with the existing personal owner controls. A manager cannot silently replace another member's personal KHQR. Personal upload/replace/remove remains in the member's private bot flow.
- **Activity:** group-specific setting changes and free-feature operations, with actors/timestamps and no private account balances, raw messages or payment-image contents.

Provide **My KHQR**, **My Credits**, and approval status separately from group settings in the private Mini App/account area. One person's balance remains personal across both bots; groups do not receive a new wallet in this version.

A basic example:

```text
My Groups
  Lunch Team    → its vote, schedule, features, member directory and history
  Office Team   → its vote, schedule, features, member directory and history
  Friends       → its vote, schedule, features, member directory and history
```

Editing Lunch Team must leave Office Team and Friends unchanged.

## Group identity and permissions

Use a durable workspace UUID and Telegram numeric chat ID. Scope settings, connected bots, polls/rounds, rosters, split state and audit queries to the workspace. Never key a group by its title, manager's user ID or bot-wide current selection.

Management reads and writes must verify the authenticated Telegram identity's current group administrator status. Recheck on the server; hiding another group's card or trusting a client-provided workspace ID is insufficient. Telegram API failures fail closed for management and preserve existing saved settings.

Allow multiple approved Telegram administrators of the same group to manage its existing workspace after verification. The first connector is recorded for audit, not granted permanent authority after Telegram demotion. Nobody can claim a second copy of the same group to bypass settings or a platform suspension.

Handle bot removal/permission loss and explicit group-to-supergroup migration without deleting history or giving the new chat another group's settings. Pause affected automation when its required connection is unavailable.

For free member actions, verify the real non-anonymous Telegram sender and the active, matching group connection. Require group membership for callbacks/lookups that could otherwise target another group. An explicitly rejected/suspended account or platform restriction still cannot bypass a block using the free-member path.

## Separate manager approval from free group participation

The current shared `BotGatewayService` blocks all unapproved group senders. That policy must change specifically for active connected workspaces:

- Free group voting, split and KHQR are authorized by the connected workspace and verified group membership. No member registration or approval is required just to participate.
- Group configuration requires an approved manager plus their current Telegram group admin role.
- Paid AI continues to require the requesting user's own approved identity, enabled bot permission, credits and daily limit.
- Private KHQR upload remains owner-authenticated and private. A verified member of an active workspace may manage their own free KHQR without manager approval; require current membership proof and never grant paid AI access as a side effect. Explicit rejection/suspension still blocks access. Keep manager approval requests separate from ordinary member identity records.
- Pending/unconnected groups do not receive open access by default.

Do not auto-approve or create privileged profiles for everyone observed in a group. Do not charge a manager for another member's AI request. Group-funded AI budgets and billing are separate future work.

## Persistence and integration

Add additive workspace, bot-connection/settings and group-audit records. Settings use a validated schema, optimistic version checks and reasoned audit events; connection retries and Telegram webhook retries are idempotent.

Existing daily vote scheduling already records Telegram chat IDs, but scheduling currently selects a person's published Voting Moment and can move that moment between groups. Replace that cross-group reuse with independent group-bound poll configurations. Reuse stable-option editing, vote counting and scheduling logic; do not make a private group's poll visible through unrelated public Moment endpoints. If Moment records are reused internally, enforce their group scope on every public read/write/media path, not just the Mini App.

Keep current working group schedules, active rounds, rosters, split sessions and personal KHQR images intact. Prepare a standalone SQL migration for manual review/execution. Backfill known groups into independent spaces without making a roster observation an ownership claim. Managers must prove their current Telegram role before seeing or changing a migrated group.

The platform dashboard should also list workspaces and their connected bots/health so the platform owner can support users and suspend a group independently of a person's website access.

## Validation and rollout

- A Telegram-only newcomer reaches pending approval and then My Groups without website registration.
- One approved manager connects two groups; changing any setting in one leaves the other intact.
- Two managers cannot read/change each other's unrelated groups by modifying IDs, callbacks or connection requests.
- Two current admins of the same group share its one workspace; demotion/removal revokes management.
- Two bot connections to one group preserve one shared workspace and separate bot permissions.
- Free group members without platform profiles can vote/split/request KHQR only in active connected groups; private and paid operations remain protected.
- Existing Canteen behavior, stable option IDs, voting history, single QR/result split message and username membership verification remain unchanged.
- Queue/scheduler execution respects current workspace state and bot permissions; no cross-group replay, duplicate schedule or duplicate credit charge occurs.
- Verify request version conflicts, expired/replayed group connection requests, invalid image preservation and Telegram API failure handling.
- Check migration/backfill preservation, API authorization tests, Mini App behavior tests, TypeScript/schema/Vue compilation, then real Telegram/browser flows separately.

No migration, deployment or product-code change is performed by writing this design.

## Telegram references

The connection flow and server-side role checks should follow the official Telegram Bot API:

- [KeyboardButtonRequestChat](https://core.telegram.org/bots/api#keyboardbuttonrequestchat)
- [getChatMember](https://core.telegram.org/bots/api#getchatmember)

The role lookup is guaranteed for other users when the bot is an administrator; the connection flow should therefore request the necessary bot role and verify it before enabling management.
