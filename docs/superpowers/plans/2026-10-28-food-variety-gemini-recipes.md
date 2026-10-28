# Food variety and Gemini recipes

User requested avoiding repeated suggestions and generating Cook at Home recipes with the existing Gemini integration, without choosing from the constant catalog. Their earlier instruction to implement Food changes without further design questions remains in force.

## Implementation

- [ ] Add bounded recent restaurant IDs and recipe names to validated recommendation criteria. Exclude recent restaurants before ranking or AI picking; report exhausted choices rather than recycling them.
- [ ] Generate up to three full bilingual recipes per Cook at Home request with existing Gemini settings. Validate ingredients, steps, servings, estimates, metadata and recent-name exclusions. A cook-at-home pick generates one recipe directly, without a static candidate list or a second AI selection.
- [ ] Persist only a bounded recent-name/ID list in browser session storage. Remember results and picks across searches and refreshes, coordinate concurrent actions, and provide an explicit reset. Preserve standalone legacy recipe-catalog endpoints without using them for discovery or picking.
- [ ] Update recipe cards and the picker so generated ingredients/instructions can be opened and cost estimates are identified as AI estimates.

## Constraints and verification

No secrets, provider calls, installs, deployments or database changes. Test new behavior before implementation with fake provider responses; verify real parsers/composable behavior, focused suites, API compilation and the dotenv-disabled frontend build. Review the complete change. Keep temporary outputs in `.tmp/` and report live-provider limitations separately.

Session history is bounded to 40 restaurant IDs and 40 recipe names. It prevents recent exact/normalized-name repeats, not semantic duplicates forever or cross-device repetition. Invalid or repeated-only AI output fails safely, without paid automatic retries or a constant-catalog fallback.
