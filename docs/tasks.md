# ChlatWork Tasks

A private personal workspace at `/tasks` with Overview, My Tasks, Work Log, Projects, Follow-ups, My Objectives, Achievements, MBO Reports and Archive. Uses the existing Nuxt/Vue/Tailwind/Lucide, NestJS, Prisma/PostgreSQL, login/cookie proxy and English/Khmer localization. No new package, service, notification provider or production credential is required.

## Records and business rules

- Tasks have optional project, multiple objectives, dates, estimated/actual minutes, notes, tags, links/evidence and private files. Lists provide search, status/category/project/objective filtering, sorting, grouping, pagination and optional board view. Subtasks support add, rename, complete and confirmed removal.
- Log Work Done creates real completed work with a user-selected completion time, including backdated entries. Completion dates cannot be in the future.
- Completing, reopening or correcting a completion date records an audit event and content snapshot. Reopening removes current completion while retaining prior events. Ordinary title/notes edits preserve the original instant, including seconds and repeated DST occurrences.
- Duplicate creates fresh unfinished work and subtasks. It does not copy completed timestamps, accomplishments, evidence or claimed impact as new results. Optional automatic recurrence is not implemented; duplicate is the explicit manual alternative.
- Archive preserves all records, file bytes, links and completion history. Completed archived tasks remain reportable; archived unfinished and reopened tasks are not counted as current accomplishments. Deleting a task, after confirmation, cascades its subtasks, audit events, attachments and follow-ups.
- Follow-ups have a due time, note, next action, optional reminder and independent resolved state. Completing a task never resolves its follow-up. Reschedule/snooze edits the follow-up and reminder times without reopening work.
- Personal milestones and highlighted achievements are user-selected. Dashboard counts and contribution counts describe activity; they do not assert equal impact, objective achievement or performance scores. Monthly reflection uses saved report-draft summary, challenges, lessons and next-period priorities.
- Projects and objectives are private organization. Deleting a project keeps tasks and clears their project association; deleting an objective keeps tasks and removes its links. Saved report drafts with a deleted filter reference need that filter cleared or replaced before regeneration.

## Dates and reminders

The account's saved `telegramNotificationTimeZone` is reused. Task times are UTC instants; report and objective periods are calendar dates in the saved account zone. Evaluation dates are inclusive, implemented as an exclusive start of the following local day, including DST changes. Nonexistent local times are rejected; new ambiguous local times use their earlier occurrence. Untouched existing instants retain their exact offset occurrence.

In-app follow-up reminders are durable database records. The open Tasks workspace polls every 30 seconds and displays missed reminders when returning; dismissal persists. This does not promise notifications while Tasks is closed, or Telegram/email/browser push delivery. Archived completed work can still have an open follow-up, as follow-up status is independent. Rescheduling does not guess a new custom reminder time: users can edit that time in the same form.

## MBO reports and exports

The report endpoint selects actual currently completed tasks once each. Many objective links cannot multiply contributions. The same inclusive selected evaluation period and filters drive the preview, PDF, Excel and CSV. Unfinished work is never presented as an accomplished contribution. Pending follow-ups are separately selected within the evaluation period.

User-written impact is labeled as the user's statement. Optional numeric actuals are exported only if the user explicitly checks verification and supplies supporting evidence. Objective metrics retain their own evaluation dates; a quarterly actual in a monthly report is not represented as a monthly result. No AI-generated achievements, guessed metrics, automatic scores or target-achievement percentages.

Draft summary/challenges/lessons/priorities are persisted separately from work records. Editing draft fields invalidates the export preview. Regenerate to export the current draft. Saved drafts generate fresh data from current records; exported files are snapshots, not immutable server-side report versions.

- PDF uses existing `jspdf` and `html-to-image`, with browser font rendering to preserve Khmer/Unicode. Text is rasterized; it is not a selectable-text PDF. Oversized content splits at blank text rows where possible. Page numbers are included.
- XLSX is a real OOXML workbook with Report, Objectives, Contributions and Follow-ups sheets, styled headers, wrapped cells, filters, frozen first rows and usable column widths. Its small stored-ZIP writer uses no new dependency. Strings are explicit text cells, never formulas or external workbook links.
- CSV contains raw selected completed contribution records, with multiline quoting and formula-injection protection. It does not include unrelated unfinished tasks or archived unfinished work.

Reports reject selections above 500 contributions or 500 follow-ups rather than silently omitting records. Narrow dates or filters for larger histories. Lists page at 20 (API supports up to 50); projects/objectives/report drafts are limited to 200 each. Tasks allow 100 subtasks and 50 follow-ups.

## Private attachments

Reuse of the existing database-byte upload mechanism, file type/signature validation and multipart limits. Up to 5 MiB/file and 20 files/task. PDF, PNG, JPEG, WebP, DOCX, PPTX, XLSX and UTF-8 TXT are supported. Every upload/download/rename/delete checks task ownership. Workspace list/detail responses exclude stored bytes. Binary responses have private/no-store, safe filename/disposition, nosniff and sandbox headers. Images/PDFs have an authenticated preview; other files download only. File validation does not provide malware scanning.

## Manual database rollout

The original `database/2026-11-16-add-work-tasks.sql` is the initial ten-table schema and is preserved. Later changes live only in `database/updates/2026-11-16-update-work-tasks-milestones-validation.sql`. If you already executed the Tasks creation script, run only the new incremental update; do not rerun table creation. If you executed only the earlier PrepHub schema, Tasks still needs its separate initial script, followed by this update. The update adds the milestone flag and missing validation constraints without recreating tables or deleting data. Existing rows are preserved by adding missing checks as NOT VALID; new writes are checked immediately. Existing constraints/columns are skipped, including when a later draft was already applied. Validate old rows/constraints manually after review. It does not change the Telegram assistant's `PersonalTask` data or PrepHub tables. Neither Tasks script has been executed by Codex. For a fresh Tasks installation only, after the existing base ChlatWork schema is present:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/2026-11-16-add-work-tasks.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/updates/2026-11-16-update-work-tasks-milestones-validation.sql
npm --prefix api run prisma:generate
npm run build:api
npm run build
```

For an already-created Tasks database, the only SQL command needed is:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/updates/2026-11-16-update-work-tasks-milestones-validation.sql
```

Rollback by restoring the prior application build and retaining the new tables; do not drop personal work records. No new environment variables. Existing API authentication/database variables and `NUXT_AUTH_API_BASE_URL` remain required, configured separately using safe `.env.example` names.

## Domain routing: Tasks and PrepHub

Source mappings are registered as:

- `tasks`: `tasks.chlatwork.com/` → `/tasks` (views/task detail use query parameters).
- `prep`: `prep.chlatwork.com/` → `/prephub`, `/:id` → `/prephub/:id`, `/:id/review` → `/prephub/:id/review`.

Legacy main-host paths remain usable. PrepHub links now use existing product-aware routing. Domains remain disabled unless included in `NUXT_PUBLIC_DOMAINS_ENABLED_PRODUCTS`. Registration does not attach DNS, issue TLS, activate hosting, configure provider login origins, share host-only auth cookies or deploy anything.

After hosting/DNS/TLS are ready, add `tasks` and/or `prep` to the existing enabled-products value, preserving every already enabled product. The existing `NUXT_PUBLIC_DOMAINS_PRODUCT_ORIGINS` setting may override origins for local/staging tests. Keep canonical and redirect values unchanged initially. Verify direct loads, reloads, sign-in/out, private files and deep review links on each hostname. Users sign in separately on each origin because auth cookies are host-only. Configure the existing frontend allowed origins/provider redirects for those domains before calling login live. Only then consider canonical/redirect activation through the existing staged settings.

## Run and verify

```sh
npm run dev:api
npm run dev
node --test --experimental-strip-types --experimental-test-isolation=none tests/*.test.ts
./api/node_modules/.bin/jest --config api/jest.config.cjs --runInBand work-tasks
./api/node_modules/.bin/tsc -p api/tsconfig.build.json --outDir .tmp/tasks-api-build --tsBuildInfoFile .tmp/tasks-api.tsbuildinfo
```

All generated validation output stays under `.tmp/`. Restricted macOS environments may require `OPENSSL_CONF=/dev/null` and `TMPDIR="$PWD/.tmp"`. For Codex validation, Nuxt/Prisma were run against isolated temporary configuration/schema with dotenv/rc loading disabled and only dummy configuration, never a live database.

Verified locally: 779/779 frontend tests, 25/25 Tasks API tests, API TypeScript compilation, feature Vue compilation, formatting and an isolated Nuxt production build. XLSX ZIP checksums/XML/relationships and CSV parser round trips passed. Broader API tests passed 1,788 and failed 12 existing YouTube subprocess cases; the existing Telegram schema suite passes separately from its expected API directory. Existing broad checks may expose unrelated YouTube child-process sandbox failures, a Telegram schema test that expects `api/` as cwd, Nuxt server typing baseline errors, and missing ESLint configuration. Live PostgreSQL persistence, authenticated browser/mobile/desktop flows, browser PDF downloads and Excel application rendering require a configured development instance. No database, hosting or domain activation is claimed.

## Changed files

- `api/prisma/schema.prisma`
- `api/src/app.module.ts`
- `api/src/work-tasks/work-tasks.controller.ts`
- `api/src/work-tasks/work-tasks.domain.spec.ts`
- `api/src/work-tasks/work-tasks.domain.ts`
- `api/src/work-tasks/work-tasks.dto.spec.ts`
- `api/src/work-tasks/work-tasks.dto.ts`
- `api/src/work-tasks/work-tasks.files.spec.ts`
- `api/src/work-tasks/work-tasks.files.ts`
- `api/src/work-tasks/work-tasks.module.ts`
- `api/src/work-tasks/work-tasks.organization.ts`
- `api/src/work-tasks/work-tasks.reports.spec.ts`
- `api/src/work-tasks/work-tasks.reports.ts`
- `api/src/work-tasks/work-tasks.service.spec.ts`
- `api/src/work-tasks/work-tasks.service.ts`
- `api/src/work-tasks/work-tasks.store.ts`
- `database/2026-11-16-add-work-tasks.sql`
- `database/updates/2026-11-16-update-work-tasks-milestones-validation.sql`
- `server/api/tasks/[...path].ts`
- `server/utils/tasks-routes.ts`
- `app/composables/useTasksClient.ts`
- `app/lib/work-tasks.ts`
- `app/lib/tasks-report-export.ts`
- `app/lib/product-domains.ts`
- `app/lib/product-mobile-navigation.ts`
- `app/assets/css/work-tasks.css`
- `app/components/tasks/TaskDetail.vue`
- `app/components/tasks/TaskFollowUps.vue`
- `app/components/tasks/TaskForm.vue`
- `app/components/tasks/TaskList.vue`
- `app/components/tasks/TaskOrganization.vue`
- `app/components/tasks/TaskReportBuilder.vue`
- `app/components/tasks/TasksOverview.vue`
- `app/pages/tasks/index.vue`
- `app/layouts/tasks.vue`
- `app/locales/en/tasks.ts`
- `app/locales/km/tasks.ts`
- `app/locales/en/index.ts`
- `app/locales/km/index.ts`
- `app/layouts/default.vue`
- `app/pages/account.vue`
- `app/components/layout/ProductNavigation.vue`
- `app/components/prephub/PrepWorkspace.vue`
- `app/components/prephub/PrepInbox.vue`
- `app/pages/prephub/index.vue`
- `tests/prephub-workspace.test.ts`
- `tests/work-tasks.test.ts`
- `tests/work-tasks-ui.test.ts`
- `tests/prep-tasks-domains.test.ts`
- `.env.example`
- `docs/tasks-plan.md`
- `docs/tasks.md`

- `tests/tasks-migration.test.ts`
