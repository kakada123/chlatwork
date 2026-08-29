# ChlatWork Auth API

NestJS authentication and account-data service for ChlatWork. It verifies Google identity tokens, Telegram Mini App `initData`, and Telegram OIDC tokens; stores provider links, hashed refresh tokens, and user-owned account data in PostgreSQL; and returns short-lived access tokens to the Nuxt server. Browser code never receives these tokens directly.

## Local setup

1. Copy `api/.env.example` to `api/.env` and replace every dummy value locally.
2. Review and manually execute `database/2026-08-21-create-chlatwork-auth.sql` against the intended PostgreSQL database.
   For Telegram daily expense summaries, also review and manually execute
   `database/2026-08-29-add-telegram-notification-preference.sql` and
   `database/2026-08-29-add-daily-expense-telegram-summary.sql` in that order.
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

The long-running API checks once per minute for opted-in users whose local time
has reached 10:00 PM, atomically claims that local calendar day, and sends the
day's Expense Tracker total through the Telegram bot. The API process must stay
running for scheduled delivery; serverless request-only execution is not enough.

Google and Telegram callback/origin values must be registered with their providers. For production, Google Cloud must contain the JavaScript origin `https://chlatwork.com` and redirect URI `https://chlatwork.com/api/auth/google/callback`. Provider secrets, the Telegram bot token, and `JWT_ACCESS_SECRET` belong only in the auth API runtime environment.
