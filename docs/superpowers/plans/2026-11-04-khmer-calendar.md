# Khmer Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-window Khmer calendar with lunar details and complete verified Cambodian public holiday schedules.

**Architecture:** Pure calendar helpers wrap a pinned lunar library. Year-specific holiday data is separate from observances. A standalone Nuxt tool page consumes these helpers and participates in existing discovery and availability controls.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Tailwind, bundled MIT MomentKH engine, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-04-khmer-calendar-design.md`

## Global Constraints

- Native implementation; user delegated remaining choices and execution.
- No secrets or database changes; the only API change registers the existing admin availability switch. Temporary artifacts stay under `.tmp/`.
- Khmer-first; full-window responsive page and optional browser fullscreen.
- Verified holiday coverage: 2026 and 2027; no inferred official holidays in other years.
- Navigation and conversion bounded to 1900–2100.

## Review Focus

- Leap-month and New Year boundaries must preserve the correct lunar date and animal year.
- Visitors in other timezones must see Phnom Penh's current date.
- Overlapping holidays must both appear without double-counting holiday dates.
- Unknown years must not imply that an empty holiday list is a complete schedule.
- Narrow/mobile and denied browser fullscreen must retain usable navigation and day details.

### Task 1: Calendar engine and sourced holiday data

**Files:** `app/lib/khmer-calendar.ts`, `app/data/cambodia-holidays.ts`, `tests/khmer-calendar.test.ts`, `package.json`, `package-lock.json`.

**Interfaces:** `CalendarDate = { year, month, day }`; `getCalendarMonth(year, month)` supplies date cells with lunar details and events; `getDayDetails(date)` returns year/phase/holy-day data; `getPhnomPenhToday(now)` returns a date; `getHolidaySchedule(year)` returns verified/source metadata and events; `moveCalendarMonth(year, month, offset)` bounds navigation.

- [x] Write tests using independent literal fixtures for 2026-05-01 (Visak Bochea + Labour Day), 2026-07-29 (15 waxing, second Asadha), 2027-09-29 through 2027-10-01 (Pchum Ben), leap days and timezone rollover.
- [x] Observe the missing-feature failure, using direct Node execution because sandboxed test child processes are blocked.
- [x] Bundle the pinned MIT engine after approved registry access failed; implement validation/date helpers and complete sourced schedules.
- [x] Re-run focused tests; all pass.

### Task 2: Full-window calendar and discovery

**Files:** `app/pages/tools/khmer-calendar.vue`; registry, categories, localization, icon and public route files; rendered-page tests if needed.

**Interfaces:** Consumes Task 1's helpers. Calendar page owns month selection, selected day, language and fullscreen lifecycle.

- [x] Implement accessible month navigation, selectors, Today, optional fullscreen with failure feedback, day details, holiday list and sources.
- [x] Register tool in discovery, localization, public routes, required SEO guide catalog and API admin availability catalog.
- [x] Add 145 distinct annual occasion types, annual bilingual search, category filters and explicit estimate labels. Test HKO Chinese dates, Easter, family occasions, four-day Khmer New Year and category-preserving holiday merges.
- [x] Compile and SSR-render the actual Vue components; Nuxt production build passes with `--dotenv /dev/null` and all output in `.tmp/khmer-calendar/`.
- [x] Run full suite: 621/623 pass. Existing failures: `daily Telegram voting keeps per-day history and owner insights`; `published Moment surfaces are unlisted and validate image content`. All 28 focused feature tests pass; API availability suite passes 5 tests.
- [x] Independent review completed; category merging, variable New Year length and monthly estimate labels corrected with regressions.

Browser verification was attempted through CUA and native Chrome. CUA failed on its OpenSSL configuration; native Chrome exited with status 134. No visual/browser success is claimed. SSR interaction tests cover month clamping, keyboard focus, fullscreen rejection, annual search/filter and date-selection events.

Do not commit automatically; provide a suggested scoped commit message in the final response.
