# Saved AI recipes and quick discovery filters

User requests saving generated AI content to the database and easy, attractive popular quick filters: after-work drinks/date, low-budget drinks, easy street food and solo lunch, plus more useful choices. Existing authorization to choose sensible implementation details without design questions remains active.

## Design

- Save validated Gemini recipes after generation and before returning success, using the existing Prisma/PostgreSQL infrastructure. Store only normalized recipe content, stable recipe ID, an opaque saved ID, generation timestamp and optional authenticated owner. Never store prompt/filter/location/allergy/history inputs. Anonymous generation continues; anonymous records have no public browse endpoint. Signed-in accounts can privately browse/reopen their own saved recipes.
- Use the repository's parameterized raw-query pattern with a standalone reviewable SQL file and corresponding Prisma model. No migration, schema synchronization, database connection, real env inspection or client generation that loads env files. Missing storage must fail before paying for generation; log only a fixed storage failure category.
- Optional Food authentication accepts guests but rejects invalid supplied bearer tokens. Nuxt forwards sessions through the existing authenticated proxy so refresh happens before any paid operation. Saved-history routes always require authentication and constrain every query by the authenticated user ID.
- Add curated quick presets as filter shortcuts, never as restaurant or recipe data. One tap fills existing filters, group size and budget; users explicitly search/pick afterward. Preserve location, dietary/accessibility constraints and allergies. Show a compact common set with a More toggle, Khmer labels, English subtitles and active state. Include work drinks/date, cheap drinks, street food, solo lunch, office lunch, student food, breakfast, café/work, family dinner, romantic dinner, rainy hotpot, vegetarian lunch and cheap cooking.
- Add private saved-recipe history to Cook at Home; opening saved recipes uses the existing details modal. Clear history immediately when the account changes and ignore stale responses.

## Tasks

- [x] Storage schema/manual SQL, repository validation and tests.
- [x] Generation persistence, optional-auth ownership and protected saved endpoints/proxies, with integration tests.
- [x] Quick preset definitions, selection logic and responsive component/tests.
- [x] Saved-history UI, saved metadata and stale-account tests.
- [x] Documentation, focused/backend/frontend checks, dotenv-disabled production build and final read-only review.

## Verification and review ledger

- Storage/auth API coverage: 152 Food tests passed. Broader API: 98 suites / 1,494 tests passed (schema suite uses its own working directory).
- Prisma schema validation passed using explicit dummy config, installed engines and confirmed dotenv skipping. No database connection, SQL execution, client generation or real environment file access occurred.
- Frontend production build passed with explicit dummy environment and dotenv disabled.
- Review found and corrected: open/late recipe state after account changes, cross-account browser name history, hidden minimumRating left by presets, and a stale GPS callback after account changes. Tests reproduced each issue before fixes.
- Saved browser history is now account-scoped v2; initial auth resolves before generation; account revisions protect recommendations, picks, saved-list responses and GPS callbacks. Presets preserve hard dietary/location/accessibility choices while clearing hidden rating state.
- Final frontend regression: 424/426 passed, with only two pre-existing Moments source-assertion failures. API schema suite separately passed 3/3, for 1,497 total API/schema tests. Final build and diff checks passed. Reviewer confirmed all findings resolved; no remaining Important/Critical findings.
- Final logs are under `.tmp/food-validation`; live database/provider/browser integration remains unverified. The manual SQL file was not executed.

## Existing work to preserve

Pending four-file deadline recovery changes allow one confirmed upstream deadline retry within a shared 30-second budget, preserving all criteria/exclusions. 137 Food tests and API TypeScript compilation passed; read-only review found no important issues. Do not undo these changes or introduce a static recipe fallback.
