# Vercel Deployment

This repo deploys the Nuxt app to Vercel. The Expense Tracker API in
`expense-tracker-api/` is a separate NestJS service and should be deployed as
its own backend.

## Branches

- Production: `main`
- Dev / preview: `develop`

Vercel creates Preview deployments for non-production branches, so pushes to
`develop` should be treated as the dev deployment. Merging `develop` into
`main` should be treated as the production release.

## Vercel Project Settings

- Framework preset: Nuxt.js
- Root directory: `.`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave empty/default
- Node.js version: 20 or newer

The root `vercel.json` pins the build command to `npm run build` so Vercel does
not infer `vite build`.

## Environment Variables

Set these in Vercel Project Settings -> Environment Variables.

Production:

```env
NARAKEET_API_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
NUXT_PUBLIC_EXPENSE_TRACKER_API_BASE_URL=https://api.chlatwork.com/api
NUXT_PUBLIC_TELEGRAM_BOT_USERNAME=
```

Preview / develop:

```env
NARAKEET_API_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
NUXT_PUBLIC_EXPENSE_TRACKER_API_BASE_URL=https://dev-api.chlatwork.com/api
NUXT_PUBLIC_TELEGRAM_BOT_USERNAME=
```

Only values with the `NUXT_PUBLIC_` prefix are exposed to the browser. Keep API
keys and Redis tokens server-only.

## Git Deployment Flow

Deploy dev:

```bash
git switch develop
git push origin develop
```

Deploy production:

```bash
git switch main
git merge develop
git push origin main
```

## CLI Deployment

Use Git deployment as the default workflow. These scripts are useful for a
manual deploy from the local checkout:

```bash
npm run deploy:dev
npm run deploy:prod
```

## Expense Tracker API Notes

If the Nuxt app and NestJS API are deployed on different sites, configure the
API CORS and cookie settings for the frontend URLs:

```env
CORS_ORIGIN=https://chlatwork.com,https://chlatwork-git-develop-<team>.vercel.app
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=None
```

If both frontend and API are under the same site, keep CORS pinned to the exact
frontend origins and avoid broad wildcard origins.

## References

- Vercel Git deployments: https://vercel.com/docs/deployments/git
- Vercel deployment environments: https://vercel.com/docs/deployments/custom-environments
- Vercel domain assignment behavior: https://vercel.com/docs/projects/domains/deploying-and-redirecting
