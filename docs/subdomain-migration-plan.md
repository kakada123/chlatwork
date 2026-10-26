# Product subdomain migration plan

The requested architecture is implemented in the existing Nuxt 4 SSR application and NestJS API. One Vercel project serves the main domain and explicitly configured product hosts. No database, deployment, or provider changes are run automatically.

## Implementation sequence

- [x] Audit pages, catalogs, API proxies, authentication, browser persistence, SEO, and deployment configuration; record findings in `docs/subdomain-migration.md`.
- [x] Add a pure, tested domain policy with explicit host matching, staged activation, canonical destinations, query/hash preservation, and a permanent-redirect exception for browser-owned Lucky Draw state.
- [x] Reuse existing Nuxt page records for product entry routes. Preserve nested legacy paths, public `/u/:slug` profiles, `/m/:slug` Moments, account editor paths, and existing route guards. Add focused shared product navigation and a homepage product directory.
- [x] Validate request origins and cookie-authenticated API mutations. Extend exact API origin/callback allowlists; keep tokens in host-only HttpOnly cookies and the existing PostgreSQL identities and ownership checks.
- [x] Update affected share URLs, canonical/OG URLs, robots behavior, and request-aware sitemaps. Keep preview content unindexed and migration disabled by default.
- [x] Document manual Vercel, Cloudflare, Railway, OAuth, local/preview, rollout, browser-data continuity, and rollback steps.
- [x] Run routing/auth regressions, existing frontend/API tests, available type checks, Nuxt's Vite/SSR production build, lint, and diff checks. Report unavailable checks and baseline failures explicitly.

## Decisions and review focus

- Keep established nested paths on product domains to minimize assumptions in existing components: Creator retains `/creator/*`, Link retains `/account/link/:section?` and `/u/:slug`, Moments retains `/moments`, `/m/:slug`, and `/i/:token`. Product entry pages additionally live at `/`; Games starts at `/kla-klok`.
- Keep independent host-only login sessions. The same Google/Telegram identity resolves the same account on every host; seamless cross-host SSO would require a separate reviewed exchange protocol and is not introduced.
- Never redirect Lucky Draw's main-domain route automatically. The new origin cannot read the legacy origin's localStorage; expose legacy access from the new app.
- Tools and PayBack destinations are configurable but inactive. Small utilities and PayBack remain on the main domain.
- Review unsupported hosts, route collisions, disabled feature gates, OAuth state/PKCE continuity, sibling-origin CSRF, per-request SSR isolation, locale queries, private Moments, and query/hash preservation.

The user's detailed migration specification is the binding design. Existing unrelated Creator Telegram working-tree changes are outside this task.
