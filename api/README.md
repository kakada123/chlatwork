# ChlatWork Auth API

NestJS authentication and account-data service for ChlatWork. It verifies Google identity tokens, Telegram Mini App `initData`, and Telegram OIDC tokens; stores provider links, hashed refresh tokens, and user-owned account data in PostgreSQL; and returns short-lived access tokens to the Nuxt server. Browser code never receives these tokens directly.

## Local setup

For the separate Khmer AI & Creator bot and admin daily usage limits, see the
[Creator bot setup guide](src/creator-telegram/README.md). Its SQL updates must be
applied manually before deploying these features.

1. Copy `api/.env.example` to `api/.env` and replace every dummy value locally.
2. Review and manually execute `database/2026-08-21-create-chlatwork-auth.sql` against the intended PostgreSQL database.
   For Telegram daily expense summaries, also review and manually execute
   `database/2026-08-29-add-telegram-notification-preference.sql` and
   `database/2026-08-29-add-daily-expense-telegram-summary.sql` in that order.
   For interactive Telegram expense commands, then review and manually execute
   `database/updates/2026-09-04-add-telegram-expense-assistant.sql`.
   For recent-expense editing, finance alerts, and group splits, then review and
   manually execute
   `database/updates/2026-09-04-add-telegram-assistant-utilities.sql`.
   For daily Voting Moments, also review and manually execute
   `database/updates/2026-09-04-add-daily-moment-voting.sql`.
3. From `api/`, run `npm install`, `npm run prisma:generate`, then `npm run dev`.
4. Configure the Nuxt app with `NUXT_AUTH_API_BASE_URL=http://localhost:3002`.

The API binds to `0.0.0.0` using Railway's `PORT` value, with `3002` as the local fallback. Keep it behind HTTPS and a trusted platform proxy; do not expose PostgreSQL publicly.

## Endpoints

- `POST /auth/google`
- `POST /auth/telegram`
- `POST /auth/telegram/code`
- `POST /auth/google/link-ticket` (authenticated)
- `POST /auth/google/link-code`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /expenses/state` (authenticated)
- `PUT /expenses/state` (authenticated)
- `GET /payback/state` (authenticated)
- `PUT /payback/state` (authenticated)
- `GET /notifications/telegram/settings` (authenticated)
- `PUT /notifications/telegram/settings` (authenticated)
- `POST /telegram/webhook` (Telegram secret header required)

The long-running API checks once per minute for opted-in users whose local time
has reached 10:00 PM, atomically claims that local calendar day, and sends the
saved Expense Tracker range, totals, budget, insights, and category breakdown
through the Telegram bot. The API process must stay running for scheduled
delivery; serverless request-only execution is not enough.

Google and Telegram callback/origin values must be registered with their providers. For production, Google Cloud must contain the JavaScript origin `https://chlatwork.com` and redirect URI `https://chlatwork.com/api/auth/google/callback`. Provider secrets, the Telegram bot token, and `JWT_ACCESS_SECRET` belong only in the auth API runtime environment.

## Telegram assistant

The webhook supports private-chat `/start`, `/menu`, `/help`, `/today`, `/recent`,
`/spend`, `/alerts`, `/weekly`, `/vote`, and `/cancel` commands. A normal message
such as `Lunch 4.50` or `បាយ 15000៛` creates a
30-minute confirmation with Save, Edit, and Cancel buttons. Saving is
idempotent, and the confirmation changes to an Undo action after the expense is
stored.

`/start` also configures a persistent `Open ChlatWork` Mini App menu button for
that private chat. `/recent` shows the five newest expenses with guarded Edit
and Delete actions. `/spend Food week` and natural questions such as
`How much did I spend on Food this week?` are read-only.

Voice notes up to 60 seconds and receipt photos up to 10 MB become expense
drafts when `OPENAI_API_KEY` is configured. Voice uses
`OPENAI_TELEGRAM_TRANSCRIPTION_MODEL` (default `gpt-transcribe`) and receipts use
`OPENAI_TELEGRAM_VISION_MODEL` (default `gpt-5-mini`). Receipt images are sent
for one non-stored API response and are never written to ChlatWork storage.
Every AI result still requires the normal Save confirmation.

`/alerts on` enables one budget alert at 50%, 80%, and 100% for each saved
weekly or monthly budget period. `/weekly on 20` enables a Sunday digest at
20:00 in the user's saved timezone; both require the existing Telegram
notification opt-in. Use `/alerts off` or `/weekly off` to stop them.

`/vote` lists the signed-in user's open, published Voting Moments. Choosing one
opens Telegram's chat picker and shares an inline poll whose buttons update the
same Moment vote records as the web experience. Anonymous and name-required
polls use a stable Telegram identity; login-required polls accept votes only
from Telegram accounts linked to ChlatWork.

For a recurring group vote, add the bot as an administrator in the Telegram
group and have a group administrator who owns the poll send `/dailyvote` there. The bot sends today's poll immediately
and starts a fresh local-date round every day at 10:00 while keeping prior
rounds for history and most-selected-place insights. Use `/votetime 11:30` to
change the local delivery time and `/stopdailyvote` to pause delivery without
deleting history. The API process must remain running for scheduled delivery.

After each Telegram vote on a bot-posted group poll, the bot updates the original
and posts the current results with voting buttons again. For non-anonymous polls,
the new message mentions known active group members who have not voted in the
current round. Login-required polls also recognize linked-account web votes.
Anonymous polls omit reminders to preserve participation privacy.

Apply `database/updates/2026-09-08-add-telegram-group-members.sql` manually before
running this version. The bot learns group members from messages it receives,
button interactions, and membership events; Telegram cannot list all existing
members through the Bot API. Existing members should send `/joinvote` in the
group once, especially when privacy mode prevents ordinary messages reaching
the bot. Keep the bot an administrator and include `chat_member` in webhook
updates so departures remove members from reminders. Inline-shared polls only
update in place because their callbacks do not expose the destination chat ID;
use `/dailyvote` in the group for automatic result posts and reminders.

Any linked group member can create a payment tracker with
`/split 60 Alice, Bob, Carol`. Each participant taps their own name to mark paid
and can tap again to undo; one Telegram user cannot claim two names in a split.

Group member QR commands use the website's public images: `/kakada` sends
`public/images/khqr/kakada.png` as a photo in the same group. Add `visal.png`,
`sikeat.png`, or another lowercase name to that folder and deploy the frontend
to enable `/visal`, `/sikeat`, etc. Names may contain lowercase letters, digits,
and underscores (1–32 characters); existing group commands keep priority.
No account link or per-member code/configuration is required. Missing images
are ignored. The API uses its existing `FRONTEND_ORIGIN` to check the PNG;
that URL must be publicly reachable by Telegram. Deploy the API change once.
Keep the bot a group administrator (with permission to send photos) so bare
commands such as `/kakada` reliably reach it; privacy-enabled non-admin bots
receive only certain group commands. See the
[Telegram privacy FAQ](https://core.telegram.org/bots/faq#what-messages-will-my-bot-get).

New QR photo replies are scheduled for deletion 24 hours after Telegram sends
them. Before deploying this API version, manually apply
`database/updates/2026-09-10-add-telegram-member-qr-cleanup.sql`.
The cleanup scheduler checks on startup and every minute, persists deadlines
across restarts, and retries failed deletions after five minutes. The API must
stay running; deletion normally occurs within a minute of the deadline, but
backlogs or delivery failures can delay it. Only tracked QR replies are removed;
the member's command, other group messages, and public PNG files remain.
Previously sent QR messages are not tracked retroactively.
Telegram [limits deletion to messages under 48 hours old](https://core.telegram.org/bots/api#deletemessage),
so extended downtime or lost bot access can leave a QR behind. Expired tracking
records are retired with a warning. Telegram delivery and database registration
are separate operations; registration failures trigger immediate best-effort
removal, but a process crash between those operations can leave an untracked QR.

Configure a random 16-256 character `TELEGRAM_WEBHOOK_SECRET` in the API runtime,
then register the HTTPS endpoint with Telegram. Keep both values in the runtime
secret store; do not commit them:

```text
POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
url=https://chlatwork.com/api/telegram/webhook
secret_token=<TELEGRAM_WEBHOOK_SECRET>
allowed_updates=["message","callback_query","inline_query","chat_member"]
```

Enable inline mode in BotFather with `/setinline` and use a placeholder such as
`Share a ChlatWork vote`. Without inline mode, the `/vote` share buttons cannot
insert the poll into another Telegram chat.

Configure these commands through BotFather or the Bot API:

```text
start - Open the ChlatWork assistant
today - Show today's expenses
recent - Edit or delete recent expenses
spend - Ask about spending by category and date range
alerts - Manage budget threshold alerts
weekly - Manage the Sunday spending digest
vote - Share a published voting Moment
dailyvote - Set up a daily vote in this group
joinvote - Register for this group's voting reminders
votetime - Change this group's daily vote time (HH:MM)
stopdailyvote - Stop this group's daily vote
split - Split a group expense and track payments
cancel - Cancel the latest pending expense
menu - Show the assistant menu
help - Show the assistant menu
```
