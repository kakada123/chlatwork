# Expense Tracker API

NestJS API for confirmed Expense Tracker saves. The Nuxt app can still preview and share locally without saving; this API is only for the user-confirmed save path.

## Setup

```bash
cd expense-tracker-api
npm install
cp .env.example .env
```

Create a MySQL/MariaDB database matching `DB_DATABASE`.

Set the token secret used for login sessions:

```env
AUTH_TOKEN_SECRET=change-this-local-secret
AUTH_TOKEN_TTL_SECONDS=86400
AUTH_COOKIE_NAME=chlatwork_expense_auth
AUTH_COOKIE_PATH=/api
AUTH_COOKIE_SAME_SITE=Lax
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_DOMAIN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_AUTH_MAX_AGE_SECONDS=86400
```

Browser sessions use an HttpOnly cookie. If the API is deployed on a different
site from the Nuxt app, set `AUTH_COOKIE_SAME_SITE=None` and
`AUTH_COOKIE_SECURE=true`, and keep `CORS_ORIGIN` pinned to the exact frontend
origin.

For local first-run table creation only:

```env
DB_SYNC=true
```

For production, keep `DB_SYNC=false` and run:

```bash
mysql -u root -p chlatwork < database/schema.mysql.sql
```

Start the API:

```bash
npm run start:dev
```

Default base URL:

```txt
http://localhost:4001/api
```

The Nuxt frontend uses this API when the user clicks Save. Override it from the
Nuxt app when needed:

```env
NUXT_PUBLIC_EXPENSE_TRACKER_API_BASE_URL=http://localhost:4001/api
NUXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
```

## Endpoints

```http
GET /api/health
```

Successful Telegram login responses also set the HttpOnly session cookie used
by the browser.

```http
GET /api/auth/me
```

```http
POST /api/auth/logout
```

```http
POST /api/auth/telegram
Content-Type: application/json

{
  "id": 123456789,
  "first_name": "Telegram",
  "username": "telegram_user",
  "auth_date": 1760000000,
  "hash": "<telegram-widget-hash>"
}
```

Telegram payloads must come from the official Telegram Login Widget. The API
verifies `hash` with `TELEGRAM_BOT_TOKEN` before creating or logging in the user.

```http
POST /api/expense-trackers
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currency": "USD",
  "rangeMode": "month",
  "budget": {
    "period": "monthly",
    "amount": "200"
  },
  "rawText": "2026-01-29, expense, Food, lunch, 4.5",
  "rows": [
    {
      "type": "expense",
      "date": "2026-01-29",
      "category": "Food",
      "note": "lunch",
      "amount": "4.5"
    }
  ]
}
```

```http
GET /api/expense-trackers/:id
Authorization: Bearer <accessToken>
```

```http
GET /api/expense-trackers?month=2026-05
Authorization: Bearer <accessToken>
```

The browser can call authenticated endpoints with the session cookie instead of
the `Authorization` header. Bearer tokens remain useful for `request.http` and
server-to-server testing.
