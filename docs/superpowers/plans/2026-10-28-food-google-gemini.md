# Food Google Maps and Gemini Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. The user explicitly requested implementation without further design questions.

**Goal:** Replace Food's OpenStreetMap discovery with Google Places and make “Pick for me” use the existing Gemini configuration.

**Architecture:** A server-only Google Places adapter returns real restaurant candidates. The existing deterministic ranking remains for normal discovery; a Food Gemini selector chooses only known candidate IDs for the picker. A Google Maps Embed frame follows the selected restaurant, with Google Maps links available when embedding is unconfigured.

**Tech Stack:** Nuxt/Vue, NestJS, existing @google/genai, Google Places API (New), Google Maps Embed API.

**Spec:** User request and explicit instruction to choose the approach and implement without more design questions. Google Places is selected because the existing structured cards need authoritative coordinates and place IDs; Gemini Maps grounding would require a different response flow.

## Global Constraints

- Never inspect real environment or secret files. Update only dummy `.env.example` values.
- Keep generated validation files and logs in repository-root `.tmp/`.
- Keep source tests beside API source or in `tests/`.
- Preserve the recipe catalog, existing filters, normal recommendation ranking, and Khmer UI.
- Do not make live paid provider calls, install packages, deploy, or run database changes.
- AI must select existing candidates and must not invent restaurant records, prices, or recipes.
- Respect `AI_ENABLED`; reuse `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, and provider timeout configuration.
- Do not commit or push automatically; supply the commit message at completion.

## Review Focus

- Missing/invalid Maps configuration and provider failures must produce safe errors, without an OSM or fabricated-place fallback.
- Malformed, closed, duplicate, or out-of-radius Google results must not reach recommendation cards.
- AI output with unknown IDs, missing text, incomplete generation, or malformed JSON must be rejected.
- Picker requests must carry current filters and avoid automatic retries on billable calls.
- Missing browser Maps key must retain working Google Maps links; user-controlled/provider text must never enter raw HTML.

### Task 1: Google Places discovery

**Files:** `api/src/food/google-places-provider.adapter.ts`, its spec, Food service/module/types/spec, DTOs.

**Interfaces:** `searchNearby(lat, lng, radiusMeters, cuisine?)` returns `{ places: Place[], dataSource: 'google' }`; Google records include `googlePlaceId`, `googleMapsUri`, and optional provider attributions. Food search and dine-out recommendations use this adapter.

- [x] Write provider and Food-service tests for normalization, nearby/text queries, radius, unavailable configuration, safe failures, and preservation of recipe mode.
- [x] Run focused Jest tests and observe the missing behavior fail.
- [x] Implement the adapter, update Food contracts, validate bounded filter strings and coordinate pairs, and wire Google into the module.
- [x] Run focused tests; expect all passing with fixture-only network responses.

### Task 2: Gemini picker

**Files:** `api/src/food/food-ai-picker.service.ts`, its spec, Food service/controller/spec, `server/api/food/pick.post.ts`, legacy random route.

**Interfaces:** `pick(dto: FoodRecommendationDto)` returns `RandomFoodSuggestion` with `selectionSource: 'gemini'`. New POST `/food/pick` and legacy GET `/food/random` use validated current criteria; the latter retains its legacy default behavior of allowing a recipe choice.

- [x] Write tests for candidate selection, filter propagation, recipe selection, invalid AI IDs/JSON, disabled AI, and provider failures.
- [x] Observe failing tests, then implement bounded Gemini requests with one attempt, safe diagnostics, and validated selection from supplied candidates.
- [x] Retain the existing application-wide throttler and prevent caching of paid responses. Review ruling: tighter Food limits would unintentionally cap all visitors sharing a frontend proxy IP; no new tight shared limit is introduced.
- [x] Run focused tests; expect all passing.

### Task 3: Google map and picker UI

**Files:** Food map component, composable/page/layout, `app/lib/food-maps.ts`, frontend tests, Nuxt config, example environment files, `docs/food.md`.

**Interfaces:** Google map helpers build official embed/search/directions URLs using Google place IDs. The picker posts the same criteria used by discovery. Provider failure clears the old pick and displays a translated error instead of returning a fake success.

- [x] Add behavioral tests for map URLs and picker filter/error handling; observe failures.
- [x] Replace Leaflet with Google Maps Embed; update source attribution and current-filter picker requests without changing unrelated UI.
- [x] Document separate server Places and browser Embed keys and existing Gemini settings with dummy examples.
- [x] Run focused frontend/API tests, frontend suite, API suite, API TypeScript compilation, Vue compilation/build where available, and diff whitespace validation. API: 95 suites / 1,392 tests passed in split working-directory runs; frontend: 405/407, with two unchanged Moments source-assertion failures. Dummy-config frontend production build and API typecheck passed. Live Google/Gemini and browser rendering remain unverified.
- [x] Review the entire diff with a fresh reviewer and resolve material issues. Recheck reports no remaining Critical/Important findings.
