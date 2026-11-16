# PrepHub dashboard reference layout

The dashboard follows the supplied reference using existing subject data. No schema migration, SQL execution, new environment variable, dependency, or deployment is required.

## Behavior

- Compact banner with working Quick capture and Create subject actions.
- Five summary filters show actual owner-scoped counts. Counts stay unavailable until the summary loads, rather than displaying invented zeroes.
- Search, existing modern category/status/sort controls, and category chips remain functional. Category facets match the current search/status scope across all pages and exclude the selected category filter, allowing users to compare categories. These aggregates always retain authenticated ownership restrictions.
- Wide subject rows show title, description, category, status, event/deadline, the account time zone, last update, and tracked preparation progress. Empty and optional-only checklists have appropriate text without a misleading percentage.
- Each row has an Add task shortcut into the existing capture dialog, an open-workspace action, and a keyboard-accessible More menu with workspace and Ready review links. Generic Quick capture retains research capture support.
- Mobile uses stacked subject content/actions, horizontally scrollable summary/category controls, and the existing collapsible filter component. Dark mode and English/Khmer translations are preserved.
- List and summary request versions prevent stale responses from restoring an earlier account's dashboard. Changing filters from a later page reloads page one once.

The API adds derived `categoryCounts` and `taskCount` response fields. Neither changes stored records or preparation calculations. Frontend fallbacks tolerate an older API without displaying false counts. Sharing, public pages, reminders, and existing subject workflows remain unchanged.

## Changed files

- `app/pages/prephub/index.vue`
- `app/components/prephub/PrepSubjectCard.vue`
- `app/components/prephub/PrepCategoryIcon.vue`
- `app/components/prephub/PrepCapture.vue`
- `app/lib/prephub.ts`
- `app/assets/css/prephub.css`
- `app/locales/en/prephub.ts`
- `app/locales/km/prephub.ts`
- `api/src/prephub/prephub.service.ts`
- `api/src/prephub/prephub.dashboard.spec.ts`
- `tests/prephub-dashboard.test.ts`
- `docs/prephub-dashboard-reference.md`

## Validation

- Dashboard tests: **6 passed**, including capture context, pagination/filter requests, stale summary responses, category facets, rendered progress, schedule/time-zone labels, and real workspace/review links.
- Full frontend suite: **826 passed, 1 failed** (827 total). The existing unrelated Creator proxy test fails with `getHeader is not defined`.
- PrepHub API suite: **41 passed**, including owner-scoped category aggregates and optional task counts.
- API TypeScript compilation passed, with output under `.tmp/`.
- Isolated Nuxt client, SSR, and Nitro production build passed with dotenv/rc loading and Vite envDir disabled. Logs and artifacts are under `.tmp/prephub-dashboard-*`. Existing build warnings concern unrelated food assets, large chunks, sourcemaps, and expense-tracker BigInt targets.
- Targeted Prettier checks and independent source review passed.
- Live mobile/desktop visual QA remains unverified: browser automation cannot start because its OpenSSL configuration file is blocked by host permissions. Responsive source and SSR tests do not establish live browser, database, or deployment behavior.

Reproduce the test and TypeScript checks without loading environment files:

```sh
OPENSSL_CONF=/dev/null node --test --experimental-test-isolation=none --experimental-strip-types tests/prephub-dashboard.test.ts
OPENSSL_CONF=/dev/null node --test --experimental-test-isolation=none --experimental-strip-types tests/*.test.ts
OPENSSL_CONF=/dev/null node api/node_modules/jest/bin/jest.js --config api/jest.config.cjs --runInBand --testPathPatterns=prephub
OPENSSL_CONF=/dev/null node api/node_modules/typescript/bin/tsc -p api/tsconfig.build.json --outDir .tmp/prephub-dashboard-api-build --tsBuildInfoFile .tmp/prephub-dashboard-api.tsbuildinfo
```

The test-isolation flag avoids subprocess spawning blocked in this sandbox. Normal unrestricted environments can use the repository's existing frontend test command.
