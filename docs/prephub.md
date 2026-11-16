# PrepHub

PrepHub lives at `/prephub`, with private workspaces at `/prephub/:id` and ready review at `/prephub/:id/review`. It uses the existing Google/Telegram login, Nuxt cookie-authenticated API proxy, Nest JWT guard, PostgreSQL/Prisma, Tailwind, Lucide and English/Khmer catalogs.

## Functionality

- Search, category/status filters, upcoming/recent/title sorting, pagination and status dashboard counts. Default lists exclude completed and archived work; both remain searchable through filters.
- Optional event time and deadline; goal, category, priority and editable manual status. Archive/restore preserves materials and records history. Subject, section, item, attachment and reminder deletion require confirmation.
- Customizable ordered checklist, research, notes, links, attachments, questions, agenda and deliverable sections. Items can be edited, removed and moved with keyboard-accessible up/down controls.
- Research questions have objective, findings, source references, investigation status, conclusion and notes. Notes preserve line breaks and support `**bold**`, `_italic_` and inline code through text-only rendering. Changes require explicit Save; failed saves retain the open editor.
- Progress counts only required checklist and deliverable items. It reports incomplete and overdue requirements, unanswered research/questions and missing deliverables. Ready status is independent of percentage.
- Research, meeting, video production and general starter templates create customizable empty sections. Quick capture saves notes, tasks, links, research questions or files into a selected active subject and creates an appropriate section if necessary.
- Ready review shows the goal, schedule, unfinished tasks/deliverables, notes, research findings, questions, agenda, files and links.

## Database rollout

Review `database/2026-11-16-add-prephub.sql`, then execute it manually against the existing ChlatWork PostgreSQL database. It creates six tables, foreign keys, indexes and validation constraints inside a transaction. It does not alter or delete existing user information. Do not run it twice.

Example from the repository root, using your separately configured database connection:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/2026-11-16-add-prephub.sql
npm --prefix api run prisma:generate
npm run build:api
npm run build
```

No migration has been applied by Codex. Deploy the schema before the updated API. For rollback, restore the prior application version and retain the new tables; do not drop user workspaces.

## Configuration and local development

No new environment variables or providers. Existing `DATABASE_URL`, API auth configuration and Nuxt `NUXT_AUTH_API_BASE_URL` remain required; use the existing `.env.example` placeholders and configure real values separately. Existing variables and examples require no changes.

```sh
npm run dev:api
npm run dev
```

The saved account `telegramNotificationTimeZone` is reused for PrepHub date entry/display. UTC instants are stored in PostgreSQL. DST gaps are rejected; repeated local times choose the earlier occurrence, including half-hour changes. Clearing either schedule field removes that date without requiring a replacement.

## Attachments and reminders

Attachments reuse the existing database-byte storage pattern used by profile images. Limits: 5 MiB/file, 20 files/subject, 32 sections and 500 items/subject. Allowed formats: PDF, PNG, JPEG, WebP, DOCX, PPTX, XLSX, UTF-8 TXT. Extensions and signatures are checked; Office containers are never unpacked or executed. This is not malware scanning. Images/PDFs may be previewed; other types download only. Files have no public URLs: every request checks subject ownership. Responses are private/no-store with safe disposition, nosniff and sandbox headers. Workspace responses never include stored file bytes.

Reminders are durable in-app inbox entries. Relative presets use event time, falling back to deadline; custom times use the saved account time zone. The inbox polls every 30 seconds while PrepHub is mounted and shows missed reminders when returning. Dismissal persists. Completed/archived subjects do not appear in the reminder inbox. Existing reminders keep their explicit times if a schedule changes; users can remove/recreate them. No background push, email, Telegram delivery, browser notifications or new paid provider is promised.

Archiving never removes materials or files. Explicit subject/section deletion permanently removes nested content through foreign-key cascades. History contains action descriptions, not copies of private content; it is paginated in groups of 50 and deleted only with its subject.

## Validation

Use installed dependencies, without the package pretest hook, to run tests directly:

```sh
node --test --experimental-strip-types --experimental-test-isolation=none tests/*.test.ts
./api/node_modules/.bin/jest --config api/jest.config.cjs --runInBand prephub
./api/node_modules/.bin/tsc -p api/tsconfig.build.json --outDir .tmp/prephub-api-build --tsBuildInfoFile .tmp/prephub-api.tsbuildinfo
```

Run the broader API suite from the root; its existing Telegram schema test assumes `api/` as the working directory, so run that test separately there. Existing YouTube subprocess tests need an environment that permits spawning child processes. Restricted macOS environments may require `OPENSSL_CONF=/dev/null` and `TMPDIR="$PWD/.tmp"`.

Verified in this workspace: 767/767 frontend tests, 30/30 PrepHub API tests, API TypeScript compilation, all 12 feature Vue components/pages, Prettier checks and an isolated Nuxt production build. A broader API run passed 1,751 tests and failed 12 existing YouTube subprocess tests under sandbox restrictions; its existing Telegram schema suite passes separately from the expected API working directory. Nuxt server type checking reports existing import-extension, Node type and Moments errors outside PrepHub; it reports no new PrepHub errors. The existing API lint script cannot run because ESLint 9 finds no configuration file; Prettier checks pass for all feature files. Live PostgreSQL persistence, actual authenticated end-to-end flows, file previews/downloads in browsers and mobile/desktop visual QA still require a configured development instance. No database changes or production deployments were performed to validate this feature.

## Changed files

- `api/prisma/schema.prisma`
- `api/src/app.module.ts`
- `api/src/prephub/prephub.controller.ts`
- `api/src/prephub/prephub.domain.spec.ts`
- `api/src/prephub/prephub.domain.ts`
- `api/src/prephub/prephub.dto.spec.ts`
- `api/src/prephub/prephub.dto.ts`
- `api/src/prephub/prephub.module.ts`
- `api/src/prephub/prephub.service.spec.ts`
- `api/src/prephub/prephub.service.ts`
- `api/src/prephub/prephub.upload.spec.ts`
- `database/2026-11-16-add-prephub.sql`
- `server/api/prephub/[...path].ts`
- `server/utils/prephub-routes.ts`
- `app/composables/usePrepHub.ts`
- `app/lib/prephub.ts`
- `app/assets/css/prephub.css`
- `app/components/prephub/PrepCapture.vue`
- `app/components/prephub/PrepDialog.vue`
- `app/components/prephub/PrepFormattedText.vue`
- `app/components/prephub/PrepInbox.vue`
- `app/components/prephub/PrepItemForm.vue`
- `app/components/prephub/PrepReminders.vue`
- `app/components/prephub/PrepSection.vue`
- `app/components/prephub/PrepSubjectForm.vue`
- `app/components/prephub/PrepWorkspace.vue`
- `app/pages/prephub/index.vue`
- `app/pages/prephub/[id]/index.vue`
- `app/pages/prephub/[id]/review.vue`
- `app/locales/en/prephub.ts`
- `app/locales/km/prephub.ts`
- `app/locales/en/index.ts`
- `app/locales/km/index.ts`
- `app/layouts/default.vue`
- `app/pages/account.vue`
- `tests/prephub.test.ts`
- `tests/prephub-workspace.test.ts`
- `docs/prephub-plan.md`
- `docs/prephub.md`
