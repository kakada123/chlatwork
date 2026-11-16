# PrepHub implementation plan

Goal: private, flexible preparation workspaces using the current Nuxt/Nest/Prisma stack.
The supplied PrepHub specification is the product contract. Implementation is authorized inline.

- [x] Add normalized subject, section, item, resource, reminder and history models plus standalone PostgreSQL migration. No database commands will be executed.
- [x] Test and implement readiness, URL/file validation, templates and time-zone helpers.
- [x] Implement authenticated subject/dashboard APIs, transactional nested mutations, exact-membership reordering, private database attachments, persistent in-app reminder inbox and history.
- [x] Build responsive dashboard, subject editor, section/item editors, quick capture and focused review page; connect through an allowlisted, same-origin Nuxt proxy.
- [x] Add navigation entry and operating instructions. No new dependencies or production configuration.
- [x] Test ownership boundaries, validation and workflows; compile API and Vue components; run existing test suites and report baseline failures separately.

Review focus: cross-account nested IDs and file access; requirements versus informational content; archive/restore retention; hostile URLs/files and bounded uploads; optional schedules and configured time-zone conversions (including daylight-saving transitions).

Storage follows existing ProfileImage database-byte storage, bounded to 5 MiB/file and 20 files/subject. Notes use explicit save and safe basic Markdown rendering. In-app reminders are durable due-time records shown while PrepHub is open and on return, without promising background push. Dates are stored as UTC instants, displayed/entered in the saved account time zone. All removals require confirmation in the UI. No sharing or collaboration.

Validation: final results and operating limits are in docs/prephub.md. The additive SQL was generated and reviewed, not applied. The production build uses an isolated output directory with dotenv/rc loading disabled. Independent review findings (multipart thresholds, DTO inheritance, saved-zone display, DST ambiguity, removal confirmation) were repaired and regression-tested; stale workspace responses were also tested and guarded.
