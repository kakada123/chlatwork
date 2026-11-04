# Khmer Calendar Date Sharing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. The user approved implementation in the current session.

**Goal:** Compact desktop browsing and public, shareable mobile date/event detail pages.

**Architecture:** Reuse calendar data through a pure route/metadata helper. Add a dedicated SSR date page and a reusable share control; connect these to the existing calendar without changing its calculations.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, existing Node tests and Vue SSR test harness.

**Spec:** `docs/superpowers/specs/2026-11-04-khmer-calendar-date-sharing-design.md`

## Global Constraints

- Preserve existing calendar calculations, Khmer/English controls, fullscreen, keyboard navigation, holiday classification, and verified-year notices.
- Use existing public data only; no database or secret/environment file access.
- Keep generated validation artifacts under `.tmp/`.
- Keep prior user changes and implement in the current workspace; do not commit without a user request.

## Review Focus

- Invalid dates and repeated event query parameters must not resolve to another date/event.
- Overlapping holidays and observances must each have distinct event URLs.
- Shared English links must retain English after opening and returning to the calendar.
- Native share cancellation must be silent; denied clipboard access must leave a usable link.
- Short desktop windows and narrow mobile windows must retain readable, reachable content.

### Task 1: Validated route and sharing helpers

**Files:** `app/lib/calendar-sharing.ts`, `tests/calendar-sharing.test.ts`.

**Interfaces:** `parseCalendarDate(value: unknown): CalendarDate | null`, `getCalendarDetail(dateKey: unknown, eventId?: unknown)` returning validated date/day/event, `calendarDetailPath(date: CalendarDate, eventId?: string, khmer?: boolean): string`, `calendarMonthPath(date: CalendarDate, khmer?: boolean): string`, `getCalendarDetailMeta(day: CalendarDay, event: CalendarEvent | null, khmer: boolean)`.

- [x] Add tests for impossible/boundary dates, event membership/overlap, language URLs, and event/date metadata; run and confirm failure.
- [x] Implement pure helpers using existing calendar validation and data; verify tests pass.
- [x] Test native sharing, cancellation, clipboard fallback, and failure through an injectable browser-sharing helper.

### Task 2: Public detail page and reusable share control

**Files:** `app/pages/tools/khmer-calendar/date/[date].vue`, `app/components/khmer-calendar/CalendarShareButton.vue`, `tests/calendar-detail-page.test.ts`.

**Interfaces:** Detail page consumes Task 1 helpers and `useProductDomain().config.mainOrigin`. Share control receives `path`, `title`, and `khmer`; generates an absolute public URL.

- [x] Add failing SSR tests for date/event content, titles, canonical/OG URLs, invalid links, and language-aware calendar return links.
- [x] Implement validated SSR route, localized detail information and source attribution; add native share/copy feedback and a selectable fallback link.
- [x] Run detail and sharing tests and confirm pass.

### Task 3: Calendar navigation, sharing, and desktop density

**Files:** `app/pages/tools/khmer-calendar/index.vue` (moved from `app/pages/tools/khmer-calendar.vue` for sibling date routes), `app/components/khmer-calendar/CelebrationBrowser.vue`, `tests/khmer-calendar-page.test.ts`.

**Interfaces:** Main calendar reads validated `date`/`lang` query state, uses Task 1 paths, selects inline on desktop, and navigates on date activation at `max-width: 850px`.

- [x] Add tests for selected-date restoration, language persistence, mobile navigation, desktop inline selection, and individual event links.
- [x] Connect date/event links and sharing to the sidebar and annual browser. Keep keyboard navigation inline and month/year controls unchanged.
- [x] Compact desktop rows, toolbar, and sidebar; hide duplicated sidebar content on mobile while retaining date details through public pages.
- [x] Run focused calendar, sharing, dropdown, and SSR tests; run diff checks and inspect rendered layouts when safe preview tooling is available.
