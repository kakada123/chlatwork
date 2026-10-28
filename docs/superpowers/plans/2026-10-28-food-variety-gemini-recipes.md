# Food variety, Gemini recipes and discovery filters

User requested avoiding repeated suggestions, generating full Cook at Home recipes with existing Gemini, all listed discovery filters, desktop Load More, mobile infinite scrolling, and repaired card padding. Implementation without further design questions remains authorized. The user clarified that Google Routes should remain available when its optional server key is configured.

## Implementation

- [x] Validate bounded recent IDs/names; exclude recent restaurants before ranking or AI picking.
- [x] Generate up to three full bilingual recipes using existing Gemini. Validate ingredients, steps, servings, estimates, metadata and normalized recent-name exclusions. Generate one recipe directly for cooking picks, without a static candidate list or second AI selection.
- [x] Store only bounded recent IDs/names in session storage. Coordinate concurrent actions, reject stale responses and provide an explicit reset. Preserve legacy catalog endpoints only for compatibility.
- [x] Open generated recipe details and identify cost estimates.
- [x] Provide the complete grouped core and extra filter catalog with strict value validation; send human-readable preferences to Google and Gemini.
- [x] Resolve cities/areas/addresses through Google. Compute real route polylines with optional Google Routes and reuse them on later pages.
- [x] Preserve provider parameters/cursors across pages; deduplicate results and stop repeated cursors. Desktop Load More and mobile observer with manual fallback after errors or unsupported browsers.
- [x] Replace unsupported padding, stack mobile title/price rows and wrap addresses/actions.
- [x] Review the implementation and fix budget normalization, reactive paging, full Gemini criteria propagation and resolved-meal metadata.

## Rulings

Provider-supported type/open-now/rating constraints are actual filters. Facilities, diets, payment, waiting time and similar selected labels are semantic discovery preferences; the UI requires confirming unverified facts with the business. Meal windows are discovery preferences, not opening hours.

Budget ranges replace the numeric amount. Their upper per-person bound becomes the group ceiling; $100+ and Flexible are open-ended. A selected city outside Phnom Penh overrides a stale Phnom Penh area.

## Constraints and verification

No secrets, provider calls, installs, deployments or database changes. Test new behavior before implementation with fake provider responses; verify real parsers/composable behavior, focused suites, API compilation and the dotenv-disabled frontend build. Review the complete change. Keep temporary outputs in `.tmp/` and report live-provider limitations separately.

Session history is bounded to 40 restaurant IDs and 40 recipe names. Current visible IDs also enter pagination/pick exclusions (maximum 100 IDs per request). This prevents bounded recent exact/normalized-name repeats, not semantic duplicates forever or cross-device repetition. Invalid or repeated-only AI output fails safely without automatic paid retries or a catalog fallback.

Local verification: 119 Food API tests, API TypeScript compilation and the dotenv-disabled production frontend build passed. Food discovery/maps/mobile observer tests cover paging, history and GPS requests. Broad API regression testing passed 1,460 tests plus three schema tests; the final GPS guard adds one focused test. Root frontend regression testing passed 412/414, retaining two unrelated Moments source-assertion failures. Logs are in `.tmp/food-validation`.

Browser automation failed to initialize; no live iPhone visual proof or Google/Gemini integration proof is claimed. No paid calls, installs, deployments or database changes occurred.
