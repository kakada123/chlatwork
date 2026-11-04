# Khmer calendar

The user chose a native ChlatWork calendar and delegated remaining product and implementation choices.

Build `/tools/khmer-calendar` as a Khmer-first, responsive, full-window page with an optional browser fullscreen button. Include month/year navigation, today, Gregorian and Khmer lunar dates, waxing/waning phases, Buddhist holy days, Buddhist Era, animal year and sak, day details, public holidays and commemorative days. English is an optional local display setting. Use Phnom Penh time for today regardless of the viewer's timezone.

## Approaches

Use the existing Nuxt/Vue tool registry and a bundled, pinned Khmer lunar library. This fits ChlatWork's styling, discovery and availability controls. An external embedded calendar was considered but loses layout and data control. The user selected the native approach.

## Data and constraints

Store the complete official 2026 and 2027 holiday schedules with source links. Never project movable holidays from one year into another. Unverified years retain date conversion and clearly state that the official holiday schedule is unavailable. Label observances separately from statutory days off. Preserve multiple holidays on one date. Validate all date inputs and bound navigation to 1900–2100. Verify lunar dates against independent published Cambodian calendar fixtures, including leap-month and New Year boundaries.

No login, database migration, secrets or environment configuration is needed. Register the feature in tool discovery, Date & Time and Khmer categories, localization, public routes, SEO guide data and icons. Add its existing admin availability switch to the API catalog. Preserve unrelated layout and behavior. Temporary artifacts stay under `.tmp/`.

## Expanded celebrations

The user expanded the scope to Cambodian and international celebrations, explicitly including Chinese New Year, Halloween, Christmas and Valentine's Day. Include a broad bilingual catalog, annual search and category filters. Public holidays retain their official status while keeping their cultural category; celebrations do not imply leave. Include Buddhist festivals, family occasions, Western Christian movable feasts, Chinese lunar festivals, and Muslim observances with moon-sighting caveats. Explain that local ceremonies and regional practices vary.

Use the published Hong Kong Observatory month starts for Chinese lunar dates in 2026–2027; ICU is one day late for New Year 2027. Mark other calculated Chinese years as estimates. Mark all calculated Muslim dates as estimates subject to local announcement and moon sighting, visible in monthly lists, details and the annual browser. Deepavali uses the stated Southeast Asian convention. Khmer New Year ends on Lerng Sak and can last four days. The Songkran civil date displays the incoming animal year.

The package registry was unavailable even with approved network access. Bundle the pinned MIT-licensed MomentKH engine from upstream commit `ff2bfd558385bd5403780b671fd2eca43b3e2228` with its license and provenance instead of adding an unresolved dependency.

## Availability during API outages

The calendar is a public tool backed entirely by bundled local data. It opts into `availabilityOptional` in the tool registry: navigation still refreshes the public admin policy, but an API failure does not block conversion or the event catalog. Any known disabled setting, including a previously loaded snapshot, still blocks navigation. All other gated tools keep their existing fail-closed behavior. This exception does not bypass authentication or allow backend operations.

## Verification

Use Node tests for date validation, leap days, month navigation, Phnom Penh timezone, lunar fixtures, Buddhist holy days, official schedule completeness, overlapping holidays and unsupported-year notices. Compile the Vue page and verify rendered controls and layout where local browser tooling permits. Run the repository test command and report baseline failures separately.

Sources: https://lrc.gov.kh/en/annual-holiday-calendar-2026/ and https://mef.gov.kh/public-holiday-2027/.
