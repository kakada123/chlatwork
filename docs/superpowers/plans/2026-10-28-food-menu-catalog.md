# Cambodia food menu catalog (1,000 items)

User requests a database designed for 1,000 menu foods eaten in Cambodia, a ChatGPT prompt producing importable records, and a place to display them in ChlatWork Food. Existing authorization to make implementation choices without design questions remains active.

## Design

- Public catalog of distinct menu items, separate from private saved Gemini recipes. Include Khmer and regional/international foods commonly eaten in Cambodia; never pretend there are 1,000 distinct traditional Khmer dishes.
- `food_menu_items`: ASCII slug primary key, unique normalized Khmer/English name keys, bilingual names/descriptions, one category/cuisine, meal-time and discovery-tag arrays, bilingual ingredient JSON, active flag, import-batch provenance and timestamps. No invented restaurants, coordinates, prices, nutrition or dietary guarantees. Thirteen categories, searchable Khmer/English, category/cuisine/meal/tag filters, indexed keyset paging.
- Manual additive SQL and matching Prisma model. Public read-only API uses parameterized Prisma raw SQL and bounded validated queries. No public write endpoint, automatic migration or database execution.
- Strict shared TypeScript record contract. ChatGPT produces 20 JSON batches of 50. A Node20-compatible preparation CLI loads that trusted contract via the already-installed API TypeScript compiler, validates every record/count, detects duplicate slugs/names across batches, and writes reviewable UTF-8 SQL (`ON CONFLICT DO NOTHING`). No LLM-authored SQL, overwrite of existing records, secrets/env loading or DB connection.
- Deliver complete copyable generation prompt, category allocation, workflow commands and import checks. User subsequently explicitly requested the actual 1,000-record SQL and excluded Thai menu items. Supplied 20 real bilingual batches and a self-contained schema/seed file; no numbered placeholder foods. Thirteen categories include FAST_FOOD.
- Collapsible public Food catalog section above live results, actual database counts, search/filter cards, desktop Load More/mobile infinite scroll. Explicit card actions find nearby via Google or request a Gemini recipe; existing restrictions/identity safety remain intact. Catalog does not replace generated Cook at Home.

## Tasks

- [x] Contract, validators, manual schema and importer with failure/1,000-record/SQL-escaping tests.
- [x] Public read API/proxy and pagination/filter tests.
- [x] Catalog browsing UI and explicit menu-to-discovery actions with behavioral tests.
- [x] Actual 1,000-record seed, prompt and operator workflow.
- [x] Focused/regression validation, offline Prisma validation, dotenv-disabled build and final read-only review.

## Constraints

Never read real env/secret files; no installs, migrations, DB writes, deployments or paid provider calls. Use `.tmp/food-menu-catalog` for outputs. Preserve the existing budget-icon fix in `app/pages/food.vue`. Prior saved-recipe/quick-preset work is committed and must remain unchanged except necessary integration.

## Reviewable data and compatibility

- Canonical records are in `data/food-menu-catalog/generated/batch-01.json` through `batch-20.json`; manifest records totals and the standalone SQL checksum. This is an AI-assisted catalog of recognized menus/meaningful preparation/protein/flavour variants, not verified current restaurant inventory or 1,000 traditional Khmer dishes.
- User reported an existing-table FAST_FOOD check failure. Fixed with an explicit transactional constraint upgrade in both schema and standalone seed; CREATE TABLE IF NOT EXISTS alone does not upgrade checks. A separate category-fix SQL is supplied. No SQL was executed by the agent.
- Corrected early default meal/style metadata. Standalone seed includes a guarded compatibility update matching source batch plus old metadata values; it preserves existing names/content and manually changed metadata. Source JSON and generated SQL are checked for consistency.
- Food catalog checks: bounded fields, exactly 1,000 records, 20 batches, unique slugs and normalized names, zero excluded cuisine/named dishes, real breakfast/street-food discovery tags and seed checksum. All output SQL is prepared locally without DB connections.

## Final validation

- API regression: 100 suites and 1,522 tests passed; separate schema suite: 3 tests passed. API TypeScript check passed.
- Root tests: 433 of 435 passed. The two existing failures are unrelated Moments source assertions for daily Telegram voting and published Moment surfaces.
- Offline Prisma schema validation passed with explicit dummy configuration and environment loading disabled. Frontend production build passed with dummy configuration and dotenv loading disabled.
- `git diff --check` passed. Independent read-only review found no Important or Critical issues. PostgreSQL execution, live catalog browsing and provider calls remain unverified; no database or deployment actions were performed.
