# PrepHub public workspace links

Implement an opt-in, revocable, read-only link to a live workspace. Keep private workspace/review URLs authenticated. Public visitors can read all sections and completed requirements; no editing, reminders, history or account details. Sharing includes notes, findings, sources and links, clearly disclosed before enabling. Attachments require a separate opt-in (off by default).

Use a cryptographically random 256-bit URL token with a unique index. Only the owner can create, change or revoke it; regenerate changes the token and invalidates the previous URL. Public GET endpoints explicitly select safe content. File reads check both the token and attachment permission for every request. No public mutation endpoint. Responses and page documents use no-store, noindex and no-referrer.

Reuse existing Nest/Prisma, Nuxt proxy, PrepHub section renderer, dialogs and mobile controls. Public page has a read-only badge, schedule/goal/progress, section navigation and full preparation materials. Owner Share dialog shows Private or Anyone with link, attachment scope, Copy/Open link and Turn off sharing. User-requested implementation continues with these defaults.

Implementation sequence: write authorization/projection/revocation tests; add additive SQL and models; add private share management and separate public APIs/proxy; build the owner dialog/public reader; add UI/routing tests; run frontend/API tests and isolated builds; independent code review.

Migration must be a NEW manually executed standalone SQL file. Never edit or rerun the already applied initial PrepHub SQL. No database execution or deployment is authorized by this implementation request.

## Using the feature

1. Open a subject or its Ready review and select **Share**.
2. Read the sharing scope. Optionally enable **Include attachments**.
3. Select **Enable link sharing**, then **Copy link**. A teammate can open it without signing in.
4. Use **Open preview** to see the read-only page. Current section anchors are preserved in copied links.
5. **Turn off sharing** revokes the URL. **Replace link** invalidates the previous token and creates a new URL. Both actions ask for confirmation. Copying a link never automatically sends a message.

The public URL is `/shared/<token>` on `prep.chlatwork.com`, or `/prephub/shared/<token>` on the main host. Existing UUID workspace/review URLs still require their owner's login. The public reader shows completed requirements as well as unfinished items. Saved changes appear when viewers load/refresh the link. Archiving retains sharing settings; owners can turn sharing off separately. Turning sharing off cannot retract information a recipient has already read or downloaded.

## Migration and configuration

Run **only** `database/2026-11-16-add-prephub-public-sharing.sql` against the existing database, **before deploying the updated API**. The original `database/2026-11-16-add-prephub.sql` was not modified. The incremental migration adds nullable `share_token`, nullable `shared_at`, a default-false attachment flag and a unique token index. Existing subjects stay private. It can be reviewed/copied and executed manually; it was not executed here.

After applying the migration, regenerate Prisma Client and build both applications:

```sh
npm --prefix api run prisma:generate
npm --prefix api run build
npm run build
```

No new environment variables or external providers are required. Existing API URL, database and product-domain configuration continue to apply. Public sharing is implemented in source; no production deployment or live workspace publication was performed.

## Privacy and security

Owner management remains behind the existing JWT guard and ownership-scoped transaction lock. Only separate public GET routes accept the capability token. Public content is explicitly projected; reminders, history, ownership identifiers and account records are omitted. Each file request checks the current token, attachment flag and resource's subject relation. Responses and shared documents use no-store/noindex/no-referrer; advertisements are disabled on the public reader.

Shared URLs are excluded from Vercel analytics and Speed Insights. The existing Speed Insights package is initialized by a small application plugin so its beforeSend filter can be supplied. Google tracking is disabled at provider level before initial configuration and on entry/history navigation to a public link. It stays disabled for the remainder of that document's lifetime, including after leaving the share, so delayed events cannot contain the capability URL. This uses Google's [documented programmatic disable mechanism](https://developers.google.com/tag-platform/security/guides/privacy).

## Verification

- PrepHub API: **39 passed**, including ownership, DTO validation, public projection, controller GET-only boundary, rotation/revocation and file authorization.
- New sharing frontend/proxy/privacy tests: **10 passed**. Includes read-only SSR, completed requirements, section links, owner state/error handling, clipboard fallback and telemetry guards.
- Full frontend suite: **805 passed, 1 failed**. The unchanged existing Creator proxy test fails with `getHeader is not defined`; reproduced independently with `tests/creator-proxy.test.ts`. No Creator code was modified.
- API TypeScript compilation and isolated Nuxt client/SSR/Nitro production build passed. Prisma Client generated successfully with explicit config that skips dotenv loading and uses the installed engines; no database connection or migration execution.
- Targeted Prettier checks and `git diff --check` passed. Existing ESLint 9 command cannot run because the repository has no `eslint.config.*` file.
- Independent security review passed after correcting automatic Google telemetry suppression.
- Live PostgreSQL behavior and authenticated end-to-end deployment remain unverified. Browser automation fails to start because of the host OpenSSL permission error, so actual mobile/desktop visual QA remains unverified.

Reproduce tests without package hooks:

```sh
OPENSSL_CONF=/dev/null TMPDIR="$PWD/.tmp" node --test --experimental-test-isolation=none --experimental-strip-types tests/prephub-sharing.test.ts
OPENSSL_CONF=/dev/null TMPDIR="$PWD/.tmp" node --test --experimental-test-isolation=none --experimental-strip-types tests/*.test.ts
OPENSSL_CONF=/dev/null TMPDIR="$PWD/.tmp" node api/node_modules/jest/bin/jest.js --config api/jest.config.cjs --runInBand prephub
OPENSSL_CONF=/dev/null node api/node_modules/typescript/bin/tsc -p api/tsconfig.build.json --outDir .tmp/prephub-share-api-build --tsBuildInfoFile .tmp/prephub-share-api.tsbuildinfo
```

## Changed files

- `api/prisma/schema.prisma`
- `api/src/prephub/prephub.controller.ts`
- `api/src/prephub/prephub.public.controller.ts` (new)
- `api/src/prephub/prephub.public.controller.spec.ts` (new)
- `api/src/prephub/prephub.service.ts`
- `api/src/prephub/prephub.sharing.spec.ts` (new)
- `api/src/prephub/prephub.dto.ts`
- `api/src/prephub/prephub.dto.spec.ts`
- `api/src/prephub/prephub.module.ts`
- `database/2026-11-16-add-prephub-public-sharing.sql` (new)
- `server/utils/prephub-routes.ts`
- `server/api/prephub/public/[...path].ts` (new)
- `server/middleware/prephub-sharing.ts` (new)
- `app/components/prephub/PrepWorkspace.vue`
- `app/components/prephub/PrepSection.vue`
- `app/components/prephub/PrepShareSettings.vue` (new)
- `app/pages/prephub/shared/[token].vue` (new)
- `app/layouts/prep-public.vue` (new)
- `app/lib/prephub.ts`
- `app/lib/prephub-sharing.ts` (new)
- `app/lib/product-domains.ts`
- `app/locales/en/prephub.ts`
- `app/locales/km/prephub.ts`
- `app/app.vue`
- `app/plugins/google-tag.client.ts`
- `app/plugins/speed-insights.client.ts` (new)
- `nuxt.config.ts`
- `tests/prephub-sharing.test.ts` (new)
- `tests/ad-settings.test.ts`
- `tests/food-geolocation-policy.test.ts`
- `docs/prephub-public-sharing.md` (new)
