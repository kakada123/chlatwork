# ChlatWork Auth API

NestJS authentication and account-data service for ChlatWork. It accepts only Google and Telegram identity tokens, stores provider links, hashed refresh tokens, and user-owned Expense Tracker records in PostgreSQL, and returns short-lived access tokens to the Nuxt server. Browser code never receives these tokens directly.

## Local setup

1. Copy `api/.env.example` to `api/.env` and replace every dummy value locally.
2. Review and manually execute `database/2026-08-21-create-chlatwork-auth.sql` against the intended PostgreSQL database.
3. From `api/`, run `npm install`, `npm run prisma:generate`, then `npm run dev`.
4. Configure the Nuxt app with `NUXT_AUTH_API_BASE_URL=http://localhost:3002`.

The API binds to `127.0.0.1:3002` by default. In production, place it behind HTTPS and a trusted reverse proxy; do not expose PostgreSQL publicly.

## Endpoints

- `POST /auth/google`
- `POST /auth/telegram`
- `POST /auth/telegram/code`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /expenses/state` (authenticated)
- `PUT /expenses/state` (authenticated)
- `GET /payback/state` (authenticated)
- `PUT /payback/state` (authenticated)

Google and Telegram callback/origin values must be registered with their providers. Provider secrets and `JWT_ACCESS_SECRET` belong only in the auth API runtime environment.
