# Shared Bot Admin rollout

The dashboard is `/admin/bots` and uses the existing website ADMIN role. No administrator account or production configuration is created by this change.

## Manual database preparation

1. Review the existing Creator credit and member KHQR schemas and ensure their earlier migrations are present.
2. If the deployed bot still reports `telegram_quick_split_sessions does not exist`, manually apply `database/updates/2026-10-16-add-telegram-quick-split-sessions.sql` first.
3. Review and manually execute `database/updates/2026-10-16-add-shared-telegram-bot-admin.sql`. Do not wrap the entire file in another transaction: the three additive enum statements must commit before use.
4. Regenerate the Prisma client as part of the normal configured build. Deploy the API and website together only after the SQL is applied.

The SQL preserves existing wallets and website access. Its one-time backfill approves accounts with exactly one canonical numeric Telegram social identity and enables both bots. Rerunning the migration does not approve later signups or restore permissions an admin disabled. Accounts linked to multiple numeric Telegram identities need manual identity review; they are never merged automatically. Group roster observations are not registrations.

No database migration or deployment was executed during local implementation.

## Product behavior

- New users send `/start` privately to register a pending shared profile. Their normal website access is unchanged.
- Approval is shared; Creator and ChlatWork permissions can be disabled independently.
- Starting credits on first approval are optional. A nonzero admin grant initializes the shared wallet instead of adding an automatic welcome grant later. Without an admin starting grant, the existing welcome-credit policy remains in force.
- Existing Creator prices remain unchanged. ChlatWork assistant, voice-expense and receipt requests each cost **one shared credit**, use the existing daily limits and reservation/refund policy, and carry bot/feature provenance. Automatic Business security scanning remains an operator-funded moderation service; it checks the connection owner's approval.
- Splitting, voting and KHQR remain free. Pending/rejected/suspended users cannot use them until access is restored.
- `/myqr` works privately in either bot. Upload PNG/JPEG up to 2 MB, with decoded dimensions of 32–4096 pixels and at most 8 megapixels. Reply to the upload with Save & share or Cancel; the previous image is preserved until confirmation. Drafts expire after ten minutes and are periodically removed.
- User-owned images are stored under the canonical `tg_<numeric Telegram ID>` key, shared across both bots. Neither username nor an upload request selects the owner. Group `/@username` and `/split 36000/6 @username` retain their current verified membership lookup.
- The dashboard provides per-user access, wallet/daily limits/history, KHQR and audit views. Credit changes require a reason, preview and confirmation; retries reuse the same operation key.

## Notifications and privacy

Approval changes queue private notifications only for bot memberships with a recorded private `/start`. Old backfilled memberships do not imply private messaging consent. Delivery retries never repeat a grant. Telegram does not provide send-message idempotency; an ambiguous network response can still repeat a notification. Five failed delivery attempts leave the account decision intact; `/status` shows current access.

Balances, approval details and upload management remain private. Audit rows contain action names, actors, reasons and status changes; they do not copy chat content or payment-image bytes. Existing private AI history and retention rules apply to paid request results.

## Release verification

Local unit tests and schema/Vue/TypeScript checks are separate from production proof. After the manual migration and deployment, verify:

1. An old registered user retains access and the same credit balance.
2. A new private `/start` in each bot creates one pending profile; callback/group/Business work is denied. Repeated starts preserve permissions and balances.
3. An admin approves with a grant, retries the request, and sees only one ledger grant. Independent bot disablement leaves the other bot and website working.
4. A queued Creator job revoked before provider execution does not charge; a revocation after reservation follows the refund path. Already-running external work cannot be cancelled retroactively.
5. Cross-bot paid requests draw from one wallet without overspending, and provider failures refund once.
6. PNG/JPEG upload, preview, confirmation, cancellation, replacement and removal work privately through both bots; invalid files preserve the saved image. A group QR request uses the selected verified member.
7. `/split` sends its existing single QR/result message, and Canteen voting behavior is unchanged.
8. Admin search/filter/pagination and profile tabs work in a real browser at mobile and desktop sizes. Public QR URLs are reachable by Telegram.

## Group manager and member policy

The group-workspace release separates an explicit **manager approval request** from ordinary Telegram participation. New `/start` users and free group members do not enter the manager queue automatically. Existing approved users remain approved; prior pending requests remain visible through the one-time migration backfill.

Use `/admin/bots` for platform approval, personal shared credits and group suspension. Users manage their groups through the Telegram Mini App at `/bot/groups`, without website ADMIN privileges. Active connected-group members can use enabled free voting, split and KHQR; paid AI always requires the requesting person's approved account and personal wallet. See [group workspace rollout](telegram-group-workspaces-rollout.md) for the additive SQL order, private poll visibility changes and live verification checklist.
