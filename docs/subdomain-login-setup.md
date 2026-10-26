# Product-domain login setup

Use the existing Google web OAuth client and Telegram Login client. Keep the main-domain entries when adding product domains. This is a provider and API allowlist change; no new redirect environment variable or cross-domain cookie is required.

## Exact URL matrix

Register origins and callback URLs individually in the provider UI, without wildcards or trailing slashes. These are the default deployed domains; replace them with configured origin overrides if those are used.

| Website origin | Telegram OIDC redirect URI | Google account-link redirect URI |
| --- | --- | --- |
| `https://chlatwork.com` | `https://chlatwork.com/api/auth/telegram/callback` | `https://chlatwork.com/api/auth/google/callback` |
| `https://creator.chlatwork.com` | `https://creator.chlatwork.com/api/auth/telegram/callback` | `https://creator.chlatwork.com/api/auth/google/callback` |
| `https://link.chlatwork.com` | `https://link.chlatwork.com/api/auth/telegram/callback` | `https://link.chlatwork.com/api/auth/google/callback` |
| `https://moment.chlatwork.com` | `https://moment.chlatwork.com/api/auth/telegram/callback` | `https://moment.chlatwork.com/api/auth/google/callback` |
| `https://expense.chlatwork.com` | `https://expense.chlatwork.com/api/auth/telegram/callback` | `https://expense.chlatwork.com/api/auth/google/callback` |
| `https://draw.chlatwork.com` | `https://draw.chlatwork.com/api/auth/telegram/callback` | `https://draw.chlatwork.com/api/auth/google/callback` |
| `https://games.chlatwork.com` | `https://games.chlatwork.com/api/auth/telegram/callback` | `https://games.chlatwork.com/api/auth/google/callback` |

## Google Cloud

1. Open the existing **Web application** OAuth client in Google Auth Platform → Clients.
2. Add every needed entry from **Website origin** to **Authorized JavaScript origins**. Normal website sign-in uses Google Identity Services in popup mode with a JavaScript credential callback, then posts the ID token to the same-origin `/api/auth/google` endpoint. This flow does not need a `login_uri` or a new OAuth redirect endpoint. [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [JavaScript callback reference](https://developers.google.com/identity/gsi/web/reference/js-reference).
3. Add the **Google account-link redirect URI** entries to **Authorized redirect URIs** for origins where Telegram Mini App Google linking is used. `/api/auth/google/callback` is the existing account-linking callback; it must not be repurposed as a normal Google sign-in POST endpoint.
4. Keep the existing client identity: Vercel `NUXT_PUBLIC_GOOGLE_CLIENT_ID` and Railway `GOOGLE_CLIENT_ID` must identify the same Google client. Configure its existing secret only in Railway's private runtime settings; never paste it in frontend public configuration or documentation.

## Telegram / BotFather

1. Open the **BotFather mini app → existing bot → Login Widget → Allowed URLs**.
2. Add both the **Website origin** and the exact **Telegram OIDC redirect URI** for every product that supports website login. Telegram supports multiple registered origins/callback URLs and requires them to be registered before authorizing the flow. [Telegram Login documentation](https://core.telegram.org/bots/telegram-login).
3. Vercel `NUXT_PUBLIC_TELEGRAM_CLIENT_ID` and Railway `TELEGRAM_CLIENT_ID` must refer to the same Login client shown there. Keep its secret in Railway's private runtime settings.
4. Leave the existing bot identity, Mini App launch settings and webhook URLs in place. Do not register a generated authorization URL containing `state`, `code_challenge`, or login codes; register only the stable callback URL from the matrix.

## Railway API allowlist

Keep `FRONTEND_ORIGIN` as `https://chlatwork.com`. Set **only verified product origins** in `FRONTEND_ADDITIONAL_ORIGINS`. If all six are ready, its value is:

```text
https://creator.chlatwork.com,https://link.chlatwork.com,https://moment.chlatwork.com,https://expense.chlatwork.com,https://draw.chlatwork.com,https://games.chlatwork.com
```

This setting contains origins, not callback paths or product names. Deploy the API code containing `frontend-origins.ts` so its CORS and code-exchange callback validation use that allowlist. Provider registration and this API allowlist are both necessary; changing only one does not complete the setup.

Vercel must serve the product host with its product listed in `NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS`. `NUXT_AUTH_API_BASE_URL` continues to point privately to the same Railway API. If client IDs or domain activation settings change in Vercel, redeploy that frontend environment. Provider-console URL registration does not require a frontend code change.

## Diagnose the actual error

- If a Telegram authorization URL already contains `redirect_uri=https%3A%2F%2Fcreator.chlatwork.com%2Fapi%2Fauth%2Ftelegram%2Fcallback`, that parameter is present. Check its exact registration in the Login client, rather than adding another query parameter or overriding the configured host.
- Google normal-popup origin failures require checking **Authorized JavaScript origins** and the matching web client ID. Google account-linking `redirect_uri_mismatch` requires checking **Authorized redirect URIs** instead.
- An API `Invalid Telegram redirect URI` or `Invalid Google redirect URI` after returning from the provider requires checking the deployed API allowlist and API version.
- State mismatch/cancel/expiry errors require restarting login on the same hostname. PKCE/state cookies and the final login session are host-only; do not start on one subdomain and manually switch to another for the callback.

The packaged-server validation script checks both authorization-start URLs on the main domain and all six products, their explicit callback parameters, PKCE/state, and host-only HttpOnly/Secure flow cookies. These checks do not verify live provider registration, real login completion, or database identity; those require a manual sign-in after configuration.
