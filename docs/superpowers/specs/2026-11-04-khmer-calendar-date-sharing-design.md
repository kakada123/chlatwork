# Khmer Calendar date details and sharing

## Intent

Reduce desktop scrolling, open selected dates as detail pages on mobile, and let anyone share a date or a particular public holiday, celebration, or remembrance event.

## Approach

Use dedicated public date pages alongside the existing monthly calendar. This directly supports the requested mobile page and links that open correctly without prior calendar state. A dialog alone would not provide the requested page; separate standalone pages for every event would duplicate the date and lunar information. Reuse the existing calendar data and shared controls.

## Behavior

- Desktop: keep date selection in the existing sidebar. Reduce calendar cell heights to fit typical desktop windows, with readable minimum sizes and normal page scrolling on short windows. Bound long sidebar event lists instead of letting them stretch the page.
- Mobile and tablet at the existing single-column breakpoint: tapping a date opens its detail page. Month/year navigation stays on the calendar. Back to calendar restores the selected month/date.
- Public route: `/tools/khmer-calendar/date/2026-11-09`. An optional `event=independence-day` query selects one event on that date; `lang=en` preserves English. Default language remains Khmer.
- Detail content: Gregorian and Khmer lunar dates, holy-day status, holidays and observances, existing notes, estimated-date labels, and source references. Event-focused links lead with that event while retaining the date context.
- Share the date or any listed event from desktop and mobile, using native sharing where available and a copy-link fallback with clear success/error feedback. Cancellation is silent.
- Server-render meaningful titles, descriptions, and canonical/social URLs for date and event links. Validate dates and event membership; invalid links return 404 rather than silently showing another date.

## Constraints

Keep existing Khmer/English controls, fullscreen, keyboard date navigation, holiday classification, and verified-year notices. Use only existing public calendar information; no accounts, personal reminder storage, database changes, or new holiday facts.

## Validation

Test strict date parsing, event/date link validation, language and share URL generation, direct server rendering of date/event metadata, navigation back to the selected month, and existing calendar/dropdown behavior. Check compact styles at desktop and mobile widths when a safe local browser preview is available.
