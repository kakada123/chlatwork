# Mobile Food discovery

The user requested a mobile flow with tap choices in this order: food, meal time, budget, people, location; current GPS when available; a search menu; much less scrolling. Existing authorization to choose implementation details without design questions applies.

## Approach

- Add a mobile-only guided card and compact navigation (discover, search, menu). Reuse the existing discovery state and provider methods. Keep desktop controls/results.
- Five small steps, explicit back/next controls, editable values, fixed-price choices with clear per-person/group basis, and a final results action. No provider calls while answering questions.
- GPS defaults to the current position when permission is already granted. Explicit GPS selection can request permission; denied/unavailable GPS leaves manual districts available. Location acquisition must not automatically submit unfinished mobile criteria.
- Menu views expose results, food catalog, saved recipes, quick presets and advanced filters. Results appear without the full form/catalog ahead of them. Mobile place results switch between list and map.
- Preserve account boundaries, allergies and other advanced restrictions, recent-history exclusions, errors, desktop Load More and mobile infinite scroll. Do not auto-generate recipes on mount or on mobile menu changes.

## Validation

- Regression tests for step navigation and final submission, no eager mobile provider call, pending GPS cancellation/manual choice and account changes, choice-to-request state, and hidden-list pagination.
- Compile the changed Vue components and run focused Food tests, then the frontend production build without loading dotenv files. Keep all artifacts under `.tmp/food-mobile`.
- No database, deployment, real provider or secret operations.

## Implemented and verified

- Mobile-only five-step choices and quick search, with sticky navigation while browsing results/catalog/saved recipes/advanced filters. Menus open the catalog and saved recipes directly; desktop disclosures retain their original behavior.
- Results appear ahead of other mobile panels and can switch between list and map. Hidden lists cannot trigger infinite-scroll callbacks. Existing location radius and dietary restrictions survive changes to the mobile location anchor.
- GPS supports acquisition without submitting, account revisions reject old callbacks, and manual district selection invalidates an in-flight GPS callback. Mobile initial load performs no restaurant/recipe generation request.
- All 51 focused Food tests passed, including complete mobile submission, choice preservation, GPS races and observer behavior. Frontend regression: 442 of 444 passed; the two existing failures are daily Telegram voting and published Moment surface source assertions.
- Dotenv-disabled production build passed; `git diff --check` passed. Browser visual inspection could not run because the computer-use Node kernel failed on local OpenSSL configuration. No live provider, database or deployment actions ran.
