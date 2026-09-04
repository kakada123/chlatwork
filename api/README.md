# ChlatWork Auth API

NestJS authentication and account-data service for ChlatWork. It verifies Google identity tokens, Telegram Mini App `initData`, and Telegram OIDC tokens; stores provider links, hashed refresh tokens, and user-owned account data in PostgreSQL; and returns short-lived access tokens to the Nuxt server. Browser code never receives these tokens directly.

## Local setup

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

Any linked group member can create a payment tracker with
`/split 60 Alice, Bob, Carol`. Each participant taps their own name to mark paid
and can tap again to undo; one Telegram user cannot claim two names in a split.

Configure a random 16-256 character `TELEGRAM_WEBHOOK_SECRET` in the API runtime,
then register the HTTPS endpoint with Telegram. Keep both values in the runtime
secret store; do not commit them:

```text
POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
url=https://chlatwork.com/api/telegram/webhook
secret_token=<TELEGRAM_WEBHOOK_SECRET>
allowed_updates=["message","callback_query","inline_query"]
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
votetime - Change this group's daily vote time (HH:MM)
stopdailyvote - Stop this group's daily vote
split - Split a group expense and track payments
cancel - Cancel the latest pending expense
menu - Show the assistant menu
help - Show the assistant menu
```
