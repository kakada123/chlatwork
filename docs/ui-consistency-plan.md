# Consistent product UI and mobile workspaces

Implemented with the existing Nuxt/Vue components, Tailwind styles and Lucide icons. No dependencies, backend behavior, SQL scripts or environment variables were changed for this UI work.

## Behavior

- One shared 64px product header on every configured product host, including custom and layout-free pages. Product identity, compact language switch, theme, account and More appear in the same positions. Product-specific actions, Creator credits/admin links and gated Quick Expense remain available.
- Shared ModernSelect and ModernDateInput replace remaining native application select/date fields. Date inputs preserve native required/min/max/disabled validation, names, values and change-event targets, with visible errors, accessible field names and dialog-safe popovers. Calendar language links and the header switch use the same locale without mutating cookies during SSR.
- Tasks defaults to the task list. Mobile has compact rows, collapsible filters, a bottom navigation with access to every view, and a prominent Add action. Navigation hides during text entry; task details focus and scroll into view, with a Back to list action. Desktop retains its sidebar, filters and detail layout.
- PrepHub has compact mobile summaries, search-first filters, responsive creation/capture actions and collapsible workspace settings/readiness details. Checklist touch areas are larger; editing stays visible while secondary item actions collapse into More on phones.
- Existing completion, research, capture, attachment, archive, report and persistence APIs remain in use. Previously applied SQL files were not modified.

## Changed files

Shared UI and layouts:

- `app/app.vue`
- `app/components/ModernDateInput.vue`
- `app/components/ModernSelect.vue`
- `app/components/layout/ProductNavigation.vue`
- `app/components/layout/WorkspaceFilters.vue` (new)
- `app/composables/useCalendarLanguage.ts` (new)
- `app/layouts/creator.vue`
- `app/layouts/default.vue`
- `app/layouts/food.vue`
- `app/layouts/jekluy.vue`
- `app/layouts/tasks.vue`

Tasks and PrepHub:

- `app/assets/css/work-tasks.css`
- `app/assets/css/prephub.css`
- `app/pages/tasks/index.vue`
- `app/pages/prephub/index.vue`
- `app/components/tasks/TasksMobileNavigation.vue` (new)
- `app/components/tasks/TaskDetail.vue`
- `app/components/tasks/TaskFollowUps.vue`
- `app/components/tasks/TaskForm.vue`
- `app/components/tasks/TaskList.vue`
- `app/components/tasks/TaskOrganization.vue`
- `app/components/tasks/TaskReportBuilder.vue`
- `app/components/prephub/PrepCapture.vue`
- `app/components/prephub/PrepItemForm.vue`
- `app/components/prephub/PrepReminders.vue`
- `app/components/prephub/PrepSection.vue`
- `app/components/prephub/PrepSubjectForm.vue`
- `app/components/prephub/PrepWorkspace.vue`

Other shared-control integrations and translations:

- `app/components/moments/MomentCreator.vue`
- `app/components/roster/RosterSettingsModal.vue`
- `app/pages/tools/khmer-calendar/index.vue`
- `app/locales/en/index.ts`
- `app/locales/km/index.ts`
- `app/locales/en/ui.ts` (new)
- `app/locales/km/ui.ts` (new)

Tests:

- `tests/ui-consistency.test.ts` (new)
- `tests/helpers/component-host.ts` (new)
- `tests/helpers/load-calendar-language.ts` (new)
- `tests/helpers/load-calendar-component.ts`
- `tests/account-workspace-layout.test.ts`
- `tests/birthday-story-creator.test.ts`
- `tests/homepage-ux.test.ts`
- `tests/khmer-calendar-page.test.ts`
- `tests/modern-select.test.ts`
- `tests/product-mobile-pages.test.ts`
- `tests/sitewide-mobile-ux.test.ts`

## Validation

Full frontend test command:

```sh
OPENSSL_CONF=/dev/null TMPDIR="$PWD/.tmp" node --test --experimental-test-isolation=none --experimental-strip-types tests/*.test.ts
```

Result: 796 passed, 0 failed. Coverage includes product header rendering, date/select model and event behavior, native validation proxies and implicit labels, mobile filters/navigation, calendar language links, and existing Tasks/PrepHub functionality. Independent review found no remaining must-fix issues after corrections.

The Nuxt production build passed (client, SSR and Nitro server), using isolated `.tmp/` output directories with dotenv/rc loading and Vite envDir disabled. No standalone frontend lint or Vue typecheck command is configured in package.json. The production build compiles client/server Vue and TypeScript; it does not substitute for a separate semantic Vue typecheck.

Live mobile/desktop visual QA remains unverified: localhost preview startup fails with EPERM, and computer-use browser automation fails on the host OpenSSL configuration. Automated component/SSR checks do not establish browser layout or live signed-in API/database behavior. No deployment was performed.
