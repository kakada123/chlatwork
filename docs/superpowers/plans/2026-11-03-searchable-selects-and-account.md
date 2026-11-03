# Searchable Selects and Desktop Account Plan

**Goal:** Apply the Add Expense searchable-select style project-wide and make desktop Account a viewport workspace with navigation.

**Architecture:** A shared `ModernSelect` wraps existing option slots and retains a native select for form and change-event compatibility. Account reuses its default site layout, with desktop-only containment, a section menu, and an internal scrolling pane. The outer app shell allocates remaining height beneath ads rather than changing ad eligibility.

**Tech Stack:** Vue, Nuxt, TypeScript, existing Lucide icons, browser Popover API, scoped CSS, Node test runner.

**Spec:** The two user requests and requirements below.

## Requirements

- Convert every native dropdown in the Vue application to the shared searchable picker.
- Preserve existing values/types, disabled options, groups, labels, form names, and change handlers.
- Keep keyboard navigation, focus restoration, dialog focus traps, responsive popup positioning, and readable light/dark states.
- Preserve Add Expense's approved category behavior and add search to its mobile category picker.
- On desktop Account, show one section at a time with persistent navigation and internal scrolling. Preserve existing mobile flows and account actions.
- Keep ad eligibility, authentication, data ownership, and backend behavior unchanged.
- Keep temporary output under `.tmp/`; never inspect real configuration secrets. Do not install, deploy, or alter databases.

## Review focus

- Numeric selections and `v-model.number` cannot turn calculations into string arithmetic.
- Async option lists and optgroups must remain searchable without selecting disabled choices.
- Wrapping labels must name the actual keyboard-focusable control; active options must remain visible.
- Desktop Account must fit with and without an advertising banner and narrow ad-supported center columns.
- Mobile Account visibility and section spacing must remain intact.

## Implementation

- [x] Inventory dropdown bindings and preserve the original slots and business handlers.
- [x] Implement and test option parsing, search, typed selection, native event targets, disabled controls, and SSR.
- [x] Migrate 58 dropdowns in 32 Vue files and compile each migrated component for client/SSR.
- [x] Register the real shared picker in existing rendering tests.
- [x] Add desktop Account section navigation, preserve section state, and contain content scrolling.
- [x] Review the combined work independently and fix material findings with failing/passing tests.
- [x] Run final focused/full tests, Vue/CSS compilation, migration coverage, and scoped Git checks.
- [x] Report changed files, behavior, validation limits, and a suggested commit message; leave changes uncommitted.

## Review resolutions

- Fixed accessible trigger names for wrapping labels and keyboard scrolling for long option lists.
- Fixed first-choice keyboard behavior when no enabled selection exists.
- Fixed Account banner sizing in the parent app shell without changing ad eligibility; sidebar width adapts to the available pane.
- Preserved mobile section spacing and kept desktop panel gaps independent of hidden sections.
- Browser verification is currently unavailable: CUA fails at OpenSSL startup and isolated headless Chrome exits 134. Source, rendered-component, and compilation evidence must not be described as live browser proof.

## Final validation

- 46 focused control, Account, expense, privacy, Food, and JekLuy checks passed.
- Full suite: 496 passed out of 498. Existing failures remain `daily Telegram voting keeps per-day history and owner insights` and `published Moment surfaces are unlisted and validate image content`.
- Client, SSR, and scoped CSS compilation passed for all 38 changed Vue source files.
- Only `ModernSelect.vue` retains a native select, intentionally for form compatibility. All 58 application call sites migrated.
- Git whitespace checks passed. No dependencies, database changes, commits, deployments, or live UI claims.
