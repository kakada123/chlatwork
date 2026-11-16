# ChlatWork Tasks implementation plan

Goal: a private personal task, accomplishment and MBO workspace using existing Nuxt/Vue, Nest, Prisma/PostgreSQL and authentication.

- [ ] Add WorkTask, completion events, subtasks, projects, objectives, task/objective and project/objective links, follow-ups, private attachments and saved report drafts. Generate additive standalone SQL; do not execute it.
- [ ] Test completion/reopen/archive semantics, backdated work logs, date periods and report deduplication. Implement transactional owner-scoped APIs, relation validation, pagination and in-app follow-up reminders.
- [ ] Implement Tasks shell with overview, list/optional board, work log, project/objective CRUD, follow-ups, accomplishments and report builder. Use explicit save and existing confirmation controls.
- [ ] Generate real PDF, styled XLSX and injection-safe CSV from one server-selected report dataset; draft summary editing does not mutate task records. Report outcomes remain user statements, and numeric results require explicit verification evidence.
- [ ] Add tasks product mapping, host-root routing, navigation and locale copy. Domain remains gated by existing enabled/canonical/redirect settings; no DNS/provider mutations.
- [ ] Validate ownership, state transitions, selected-period consistency, exports and frontend behaviors; compile/test/build; independent review; document actual limits.

Review focus: archived completions stay reportable, reopened work is not currently completed, multi-objective links never multiply report rows, nested IDs cannot cross owners, saved timezone defines calendar boundaries, missing outcomes/metrics remain blank, downloads remain authenticated, CSV/XLSX cannot execute formulas.

No new dependency/provider. Optional recurrence will use manual duplicate rather than a background recurrence engine unless existing infrastructure offers an appropriate contract. Follow-up reminders reuse durable due-time in-app inbox behavior and remain independent of task status. Lists are paginated; reports reject oversized selections rather than silently truncating them. PDF uses the existing jsPDF and HTML rendering utilities to retain Khmer text; XLSX uses a small standards-based OOXML stored-ZIP writer without new dependencies.
