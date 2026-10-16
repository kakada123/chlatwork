# Shared Telegram Bot Admin — design draft

## Agreed decisions

- Build one fresh web admin dashboard for the Creator and ChlatWork bots.
- New users must wait for administrator approval before using bot features.
- Use one shared credit wallet for paid AI features across both bots.
- Existing registered Telegram users keep access when approval is introduced.
- Let approved users upload and replace their own KHQR.
- Keep balances, account approval details, and upload management in private chats.

This document is a design for review. No application changes, account promotions, credit adjustments, or database migrations have been executed for this feature.

## Recommended approach

Create a dedicated `/admin/bots` area inside the existing website, with its own clear navigation. Reuse the existing ADMIN authentication, user identities, credit ledger, and KHQR storage. Preserve the existing analytics pages and public website flows.

A separate deployed admin app would add another login and deployment surface without improving the first version. Rebuilding the wallet or maintaining separate user records for each bot would create unnecessary identity and balance reconciliation.

## Admin experience

| View | Main actions |
| --- | --- |
| Overview | Pending approvals, approved users, bot activity, credit usage, and failed requests |
| Users | Search by name, Telegram username or ID; filter by bot and approval state; open one shared profile |
| Pending users | Review the request, approve or reject with a reason, and optionally grant starting credits |
| User profile | Approval state, separate bot access controls, shared balance, daily AI limit, KHQR, and activity |
| Credits | Add, deduct, or refund credits with a reason, confirmation, and before/after balances |
| KHQR | Preview saved images and let administrators replace a selected user's image with an audit entry |
| Activity and audit | Bot actions, usage costs, failures, approvals, access changes, and credit adjustments |

Show Creator and ChlatWork filters throughout the dashboard. Count an account once in the shared user list, with badges for the bots it has actually started.

## New user journey

1. A user opens either bot privately and sends `/start`.
2. A verified webhook identifies the sender by numeric Telegram user ID. Reuse their existing linked account or create one new account without requiring an email.
3. A new bot profile enters Pending status. Reply: "Your access request has been sent. Please wait for admin approval."
4. Pending users can see help, check approval status, or contact support. They cannot execute tools, consume credits, upload a public payment image, or bypass approval through callbacks or group commands.
5. The administrator approves or rejects the account. Approval applies to the shared profile, with separate controls to allow Creator, ChlatWork, or both.
6. Notify the user only through bots they have already started privately. Approved users receive the relevant bot menu.

For group requests, use the sender's identity for access and billing, and the group ID only for delivery. An unregistered user is directed to start the bot privately; observing a group member does not silently register or approve them. Web and non-Telegram access remain governed by the existing account rules.

## Credit rules

- Reuse `AiWallet`, `AiCreditTransaction`, and the existing reservation/refund and administrative adjustment services.
- Record which bot and feature caused each charge. Enforce credit checks on the server before any paid provider call, including background processing.
- Recommend keeping KHQR, bill splitting, and voting free. Paid AI features in either bot use the shared balance.
- Approval and starting-credit grants must be idempotent. Starting credits are optional; never apply both an admin starting grant and a second automatic welcome grant.
- Preserve existing balances and credit history. Do not infer or merge accounts from a display name, username, phone number, or forwarded message.
- Version one uses manual admin credit adjustments. Automated purchases and payment verification are separate work.

## User-owned KHQR journey

1. An approved user chooses "My KHQR" in a private bot menu or sends `/myqr`.
2. Show their current image with Upload, Replace, and Remove actions.
3. Accept a PNG/JPEG photo or file, validate actual image content, size and decoded dimensions, then show a preview.
4. Ask the user to confirm saving and sharing this payment image when requested in groups. Until confirmed, retain the existing QR.
5. Save under the sender's stable `tg_<telegram_user_id>` identity. The upload API must derive ownership from authenticated identity; users cannot supply another person's key.
6. Continue to support `/@username` and `/split 36000/6 @username` through verified group membership and username resolution.

Only the owner or an authorized administrator can replace/remove the image. An uploaded image is user-provided; the interface must not claim that bank ownership has been independently verified.

## Data and access changes

Add a shared bot profile for approval state and review history, plus bot-specific membership/access records. Track first private start and last activity separately for each bot. Keep these restrictions separate from `User.isActive`, so suspending one bot does not unexpectedly disable the website or the other bot.

Add an audit trail for approvals, rejections, bot suspensions, and QR changes. Reuse the existing credit adjustment audit records. Avoid storing raw chat messages, bank details, or full generated content in operational activity logs.

Prepare additive standalone SQL for manual execution. Backfill existing accounts with a verified Telegram social identity as Approved, preserving existing balances and feature access. Group-only observed members are not registered accounts and are not automatically approved. New profiles created after the migration default to Pending.

## Suggested delivery stages

1. Shared dashboard, Telegram user registration, approval queue, and bot access checks.
2. Reuse credit management inside the new dashboard and meter the selected paid AI features consistently across both bots.
3. Private user-owned KHQR upload, preview, confirmation, replacement/removal, and admin management.
4. Audit/activity views and complete cross-bot regression validation.

## Validation required before release

- Existing Telegram accounts retain access and balances; newly registered accounts start Pending.
- Repeated `/start` requests, approvals, and credit grants do not duplicate accounts, notifications, or credits.
- Pending, rejected, or suspended users cannot bypass checks through callbacks, group messages, queued jobs, or direct APIs.
- A shared wallet cannot be overspent by concurrent requests from the two bots; failed requests follow the existing refund policy.
- Only an owner or admin can manage a QR, and an unresolved username never selects another person's payment image.
- Missing/invalid uploads preserve the previously saved QR. Group replies never expose private balances or settings.
- Unit/API checks, website compilation, and diff checks must be reported separately from manual migration execution and live Telegram/browser validation.
