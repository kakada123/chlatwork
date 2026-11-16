# PrepHub notebook redesign

Adapt the existing Nuxt/Vue feature without changing APIs, Prisma models, SQL, authorization, sharing or progress calculations. Saved sections remain intact. This is a presentation and interaction change.

- Create: title and optional description; dates and advanced subject/template options progressively revealed. New subjects start blank and open immediately after saving.
- Overview: compact title/description/schedule/status with one progress indicator based on existing server totals. No percentage when there are no counted tasks. Ready and Finished remain deliberate status actions.
- Checklist: existing checklist/deliverable sections grouped together, quick inline task creation and title editing, one-tap completion and a row menu for reorder/details/delete.
- Materials: notes, files, links and agenda together, preserving section names/content, resource metadata and download/preview behavior.
- Questions: question and research sections together; hidden when empty, with simple answered controls and full findings/sources/conclusions still accessible.
- Add: one sticky workspace menu for Task, Note, File, Link, Question and Reminder. Context defaults follow the area/section being viewed. A task goes to inline entry; other content uses existing lightweight capture/forms.
- More: subject editing/status, reminder management, advanced progress details, custom sections and section management, history, archive/restore and confirmed deletion. Collapsed on both desktop and mobile.
- Shared view: same overview and notebook grouping, all completed items retained, strictly read-only. Existing restricted-file filtering and capability URLs unchanged.

Tests cover stable grouping, zero-progress display, creation defaults and preserved advanced values, inline creation/edit failure behavior, full-membership reordering, question states, context capture targeting and public read-only rendering. Run frontend tests, PrepHub API regressions, isolated build and formatting/diff checks; distinguish browser/device verification from source checks.

## Implemented flow

1. Create a subject with a title and optional description. Date/deadline and template/category/goal/priority fields are collapsed. A blank subject is the default, and the existing create flow immediately opens it.
2. Write a task in the inline checklist field and press Enter. The first task creates a checklist only when one is needed. Failed saves retain the draft, and retries resolve the saved section before adding again.
3. Use the sticky Add menu for Task, Note, File, Link, Question or Reminder. The current area/section supplies the default. An initial section deep link seeds the context, and subsequent user interactions take precedence.
4. Toggle completion or click a task title to rename it inline. The row menu retains details, full-membership move up/down and confirmed removal. Optional due dates/required flags remain in task details.
5. Find notes, files, links and agenda in Materials. Questions/research appear when they contain information; answering and editing findings preserve sources and conclusions.
6. Choose Mark ready deliberately, then Finish when the activity ends. Neither action depends on the progress percentage. Completed subjects can be prepared again, and archived subjects can be restored.
7. Use More for subject editing, focused review, reminders, detailed progress rules, custom section management/reordering, activity history and archive/delete. Native dialogs keep confirmations reachable over nested settings/editors.

Public links use the same compact overview and notebook groups. They retain all completed items, safe file links and existing attachment permissions, with no editing or reminder/account information. Section IDs and shared URLs are unchanged. Long descriptions can be expanded; zero-task subjects show useful text without a percentage/bar.

The display groups do not migrate, merge, delete or rewrite saved sections. Existing section titles, item IDs, formatting, fields, sort orders and server-owned progress rules remain intact. Custom sections still expose the original full editor through More.

## Validation

- New notebook tests: **10 passed**. Stable grouping, blank creation, preserved advanced values, zero-progress rendering, title-only inline patches/failure recovery, real Vue focus/save behavior, first-task retries, research answer patches, explicit capture targets, manual readiness and stale-hash precedence.
- Full frontend: **815 passed, 1 failed** (816 total). The existing unchanged Creator proxy test still fails with `getHeader is not defined`; it is unrelated to PrepHub.
- PrepHub API regression suite: **39 passed**, including ownership, public projection, file scoping, revocation, input validation and readiness/progress behavior.
- Isolated Nuxt client, SSR and Nitro production build passed. Build ran with dotenv/rc loading and Vite envDir disabled; artifacts remain under `.tmp/`.
- Targeted Prettier and `git diff --check` passed. No frontend semantic Vue typecheck/lint command is configured. No dependency was added for these checks.
- Independent review passed after correcting task refs and stale deep-link context. Menus reuse existing viewport-safe picker placement and native popovers for small screens; inline save/cancel restores focus.
- Browser automation remains blocked by the host OpenSSL permission error, so actual desktop/mobile visual QA and live authenticated/database flows remain unverified. No database changes or deployment were performed.

Reproduce checks:

```sh
OPENSSL_CONF=/dev/null TMPDIR="$PWD/.tmp" node --test --experimental-test-isolation=none --experimental-strip-types tests/prephub-notebook.test.ts
OPENSSL_CONF=/dev/null TMPDIR="$PWD/.tmp" node --test --experimental-test-isolation=none --experimental-strip-types tests/*.test.ts
OPENSSL_CONF=/dev/null TMPDIR="$PWD/.tmp" node api/node_modules/jest/bin/jest.js --config api/jest.config.cjs --runInBand prephub
npm run build
```

No SQL, new environment variables, backend API changes or deployment configuration changes are required for this redesign. Existing public-sharing migration requirements remain as documented in `docs/prephub-public-sharing.md`.

## Changed files

- `app/components/prephub/PrepOverview.vue` (new)
- `app/components/prephub/PrepNotebook.vue` (new)
- `app/components/prephub/PrepAddMenu.vue` (new)
- `app/components/prephub/PrepItemActions.vue` (new)
- `app/components/prephub/PrepWorkspace.vue`
- `app/components/prephub/PrepSection.vue`
- `app/components/prephub/PrepSubjectForm.vue`
- `app/components/prephub/PrepCapture.vue`
- `app/components/prephub/PrepItemForm.vue`
- `app/pages/prephub/index.vue`
- `app/pages/prephub/shared/[token].vue`
- `app/lib/prephub.ts`
- `app/assets/css/prephub.css`
- `app/locales/en/prephub.ts`
- `app/locales/km/prephub.ts`
- `tests/prephub-notebook.test.ts` (new)
- `tests/helpers/component-host.ts`
- `docs/prephub-notebook-redesign.md` (new)
