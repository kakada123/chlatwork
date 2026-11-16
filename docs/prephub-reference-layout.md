# PrepHub visual reference layout

Applied both supplied references using existing content only. No schema, backend, dependency, environment variable or SQL changes are needed. Existing sharing migration requirements are unchanged. Nothing was deployed.

## Layout

- Desktop overview uses the existing subject title, description and manual status in a wider main card, with schedule/time zone and goal cards alongside it. Mobile keeps the activity date visible and collapses detailed metadata to preserve space for the checklist. Long descriptions and goals can be expanded.
- Time zone is labeled accurately; it is not presented as a physical location. No favorite, new tag system, research scope, success criteria or invented summary/metric was introduced.
- A single server-backed preparation indicator sits beside the checklist heading. Files, notes and links do not affect it. Zero counted tasks show no percentage; optional-only checklists are explained without claiming that no tasks exist.
- Checklist entry uses a leading plus icon and a separate submit button. Existing inline editing, failure recovery and task actions remain functional.
- Materials have clearer icons, headings and real item counts. Files use PDF/image/document icons, actual names/type/size, permission-checked download/preview actions and rename/delete controls. On smaller screens, file rows stack and secondary actions move into More.
- Links show their actual title and URL. The existing single label field can display as a chip, and the existing description displays as a callout. Neither is generated or fabricated.
- Existing deliverable items use numbered cards. Their completion state, fields and reorder behavior are unchanged. Inline Save/Cancel controls wrap on narrow cards.
- Private and public readers use the same presentation. Public viewers retain safe resource URLs and no write controls; restricted attachment filtering is unchanged. Existing section anchors and the single main Add action remain intact.

## Validation

- Full frontend suite: **820 passed, 1 failed** (821 total). The unchanged Creator proxy test still fails with `getHeader is not defined`.
- PrepHub API regression suite: **39 passed**.
- Notebook tests include server-count progress placement, optional-only and empty states, accurate time-zone labeling, actual file counts/metadata, safe public download/preview URLs, read-only controls, real label/description rendering, plus the earlier notebook interaction tests.
- Isolated Nuxt client/SSR/Nitro production build passed, with dotenv/rc loading and Vite envDir disabled. Artifacts/logs stay in `.tmp/`.
- Targeted Prettier and `git diff --check` passed. Independent review identified narrow-card action overflow; the controls now wrap.
- Live mobile/desktop visual QA remains unverified because browser automation fails to start with the host OpenSSL permission error. Automated rendering/build checks do not establish live database, browser or deployment behavior.

## Changed files

- `app/components/prephub/PrepOverview.vue`
- `app/components/prephub/PrepNotebook.vue`
- `app/components/prephub/PrepSection.vue`
- `app/components/prephub/PrepItemActions.vue`
- `app/components/prephub/PrepWorkspace.vue`
- `app/pages/prephub/shared/[token].vue`
- `app/assets/css/prephub.css`
- `app/locales/en/prephub.ts`
- `app/locales/km/prephub.ts`
- `tests/prephub-notebook.test.ts`
- `docs/prephub-notebook-redesign.md`
- `docs/prephub-reference-layout.md`

Reproduce checks with the existing frontend test command and the PrepHub API regression command documented in `docs/prephub-notebook-redesign.md`. No new environment variables are required.
