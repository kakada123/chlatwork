# Compact PrepHub Overview Implementation Plan

> Execute inline in the current checkout using the approved layout. No commit or deployment is requested.

**Goal:** Keep workspace actions reachable and long text readable without a tall sidebar.

**Architecture:** Move the existing toolbar before the shared overview. Render the overview in one column with full-width description and collapsible dates and goal.

**Tech Stack:** Vue, Nuxt, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-11-17-prephub-compact-overview-design.md`

## Global Constraints

Preserve content, formatting, translations, status actions, and shared-page read-only behavior. No dependencies, backend changes, secret inspection, or deployment.

## Review Focus

Check long multiline text, narrow viewports, missing dates or goal, keyboard expansion, and the shared overview. This is a reversible presentation change; use existing behavioral tests and rendered visual checks rather than tests that assert implementation markup.

## Task 1: Compact overview and reachable actions

**Files:** `app/components/prephub/PrepWorkspace.vue`, `app/components/prephub/PrepOverview.vue`, `app/assets/css/prephub.css`.

**Interfaces:** Preserve the existing `PrepOverview` props, badge slot, and workspace action handlers.

- [x] Confirm baseline: 22 workspace and notebook tests pass.
- [x] Move the sticky toolbar before the overview.
- [x] Move the description below the title row; retain its preview and expansion.
- [x] Collapse dates and goal at every viewport, expanding at full width without a second goal toggle.
- [x] Remove sidebar column styling; use responsive schedule columns.
- [x] Run existing PrepHub tests, verify runtime expansion and SSR with dummy content, compile the preview, and attempt desktop/mobile browser checks.
- [x] Review the scoped diff and formatting; report validation and a suggested commit message.

## Validation

- All 42 existing PrepHub tests pass.
- Full frontend suite: 826 pass, 1 fails in the unchanged Creator proxy test (`tests/creator-proxy.test.ts`, `getHeader is not defined`).
- Runtime expansion/collapse, description expansion, complete goal retention, timezone rendering, and empty optional details checks pass.
- Vue fixture bundle and Tailwind CSS compile; formatting and diff whitespace checks pass.
- Independent source review found no concrete issues.
- Visual browser checks remain unverified: the browser-control process fails to start, and isolated headless Chrome exits before producing output. No live app or deployment was verified.
