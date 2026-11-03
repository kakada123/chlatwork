# Admin Dashboard Implementation Plan

**Goal:** Replace the long `/admin` page with a viewport-sized dashboard, charts, and section navigation.

**Architecture:** Keep the existing authenticated analytics API and admin middleware. A dedicated layout serves only `/admin`; a presentational dashboard owns local section navigation and a separate SVG chart renders daily activity. Bot Admin and Tools & Ads remain linked routes.

**Tech Stack:** Nuxt, Vue, TypeScript, existing Lucide icons, CSS, SVG, Node test runner.

**Spec:** Scope and requirements below, confirmed in the conversation on 2026-11-03.

## Scope and requirements

- Apply the new layout only to `/admin`.
- One screen contains navigation, date filters, five existing metrics, an activity chart, an event-mix chart, and compact tool/activity previews.
- Overview, Tools, Users, Activity, and Member KHQR switch the visible panel. Detail panels scroll internally; the page does not grow with the data.
- Keep links to `/admin/bots`, `/admin/tools`, and the main site.
- Preserve 7/30/90-day filtering, refresh, light/dark contrast, role checks, privacy copy, and existing KHQR behavior.
- Defer loading Member KHQR until selected and preserve its state across section switches.
- Use existing data only, with truthful empty/loading/error states. Do not show a previous range under a newly selected range.
- Preserve a single page root for Nuxt out-in transitions.
- No dependency installation, database changes, API changes, or deployment.

## Review focus

- Short/narrow viewports keep navigation accessible and detail content reachable.
- Zero events, a single day, and 90-day series produce valid, legible chart geometry.
- Range changes do not mislabel stale analytics.
- Switching away from Member KHQR does not discard an upload draft.
- Leaving `/admin` still mounts Bot Admin and other routes.

## Task 1: Dashboard behavior and chart

**Files:** `app/components/admin/ActivityDashboard.vue`, `app/components/admin/ActivityTrendChart.vue`, `app/lib/admin-dashboard.ts`, `tests/admin-dashboard-view.test.ts`.

- [x] Write rendered-component tests for overview/chart output, section switching, range/refresh events, empty/error/stale data, and deferred KHQR mounting.
- [x] Run tests and confirm failure before implementation.
- [x] Move the existing analytics types into the shared library. Implement the presentational dashboard and SVG chart without new dependencies.
- [x] Run focused tests and Vue client/SSR compilation.

## Task 2: Route integration and verification

**Files:** `app/pages/admin/index.vue`, `app/layouts/admin.vue`, related admin/transition tests.

- [x] Wire the existing fetch and filters into the dashboard; select the admin-only layout and exclude public ad/cookie overlays from this full-screen workspace.
- [x] Preserve the previous filter styling fix and single page root. Keep other admin routes unchanged.
- [x] Update existing checks to inspect the owning dashboard component.
- [x] Run focused admin and navigation tests, the full root test suite, Vue compilation, CSS generation, and Git diff checks.
- [x] Request a fresh code review; resolve material findings and rerun affected checks.
- [x] Report changed files, behavior, validation limits, and a suggested commit message. Leave changes uncommitted for the user.

## Validation and review record

- 21 focused admin, dashboard, navigation, and shell checks passed.
- Full root suite retains the two existing Moments failures: daily voting history/owner insights and published surfaces/image validation.
- Client/SSR compilation and scoped CSS compilation passed for all four Vue files. Standalone light/dark preview HTML and generated Tailwind CSS are under `.tmp/`, using synthetic data only.
- Fresh review identified scoped dark selectors losing their component target and SVG labels shrinking on mobile. Both were reproduced in failing tests and corrected. Additional coverage checks single-day/90-day geometry and resizing to a 270-by-190 panel.
- Browser verification remains blocked: computer-use startup fails with an OpenSSL configuration error; isolated headless Chrome exits with status 134 before producing a screenshot. No authenticated browser or production proof is claimed.
- Layout choice: narrow screens prioritize KPIs and the activity chart; short landscape screens can scroll the workspace internally. Other admin routes retain their current layouts.
