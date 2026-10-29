# ChlatWork Food menu catalog

This directory contains **1,000 AI-assisted bilingual menu records**, in 20 batches of 50. They cover foods/menu variations consumed in Cambodia, not 1,000 traditional Khmer recipes. Thai cuisine and named Thai dishes are excluded.

The data is menu inspiration, not verified restaurant inventory. Ingredient lists are representative; preparation, availability and dietary suitability vary. There are no invented prices, coordinates, restaurants or nutrition claims. Names and Khmer wording should be reviewed by the operator before publishing.

## Easiest import

1. Open [`database/seeds/2026-10-28-food-menu-catalog-1000.sql`](../../database/seeds/2026-10-28-food-menu-catalog-1000.sql).
2. Review it, then execute it manually in the same database/schema as the API. It creates the catalog schema, upgrades the earlier category check to accept `FAST_FOOD`, and inserts the 1,000 records. Existing names/content are preserved. For records from the early draft, only meal/style metadata still matching the original defaults is upgraded; manually changed metadata is preserved.
3. If an earlier attempt failed, run `ROLLBACK;` in that SQL session first. For an existing table needing only the category fix, use [`database/updates/2026-10-28-expand-food-menu-categories.sql`](../../database/updates/2026-10-28-expand-food-menu-categories.sql).
4. Deploy the API and frontend. On ChlatWork Food, open **មើលបញ្ជីមុខម្ហូបនៅកម្ពុជា / Food ideas** above the live results. Counts come from the database. A card can start a Google restaurant search or a fresh Gemini recipe generation.

No database change is executed by the preparation script or during local validation.

## Distribution

| Category | Records |
| --- | ---: |
| Rice | 100 |
| Noodles/pasta | 120 |
| Soup | 80 |
| Curry | 50 |
| Stir-fry | 80 |
| Grill/roast | 60 |
| Salad | 50 |
| Seafood | 40 |
| Snacks | 90 |
| Dessert | 80 |
| Bakery | 50 |
| Fast food | 70 |
| Drinks | 130 |
| **Total** | **1,000** |

`manifest.json` records category/cuisine totals and the standalone SQL's SHA-256. `generated/batch-NN.json` are the editable canonical records. Distinct protein, preparation and flavour variations are included; normalized duplicate Khmer/English names and slugs are rejected.

## Regenerate SQL or use ChatGPT

Use the [copyable ChatGPT prompt](../../docs/prompts/food-menu-catalog-1000.md) to generate replacement batches with the same schema and exclusions. Then run:

```bash
npm run food:catalog:prepare -- --input data/food-menu-catalog/generated --output .tmp/food-menu-catalog/review-import.sql --expect-count 1000
```

Requires the project's API dependencies, including its existing TypeScript compiler. Works with Node 20+ and does not load environment files. Only regular files named `batch-01.json` through `batch-20.json` are accepted. Validation and duplicate/count errors produce no SQL output; existing output files are never overwritten.

The resulting SQL is insert-only with conflict preservation. It neither executes SQL nor edits the saved personal recipe table. It is not a substitute for ingredient/allergen or culinary fact review.

Background references for local food context and representative names: [Cambodian government visitor information](https://francophonie2026.gov.kh/en/InformationForVisitor), [ASEAN tourism's Cambodia food guide](https://www.visitsoutheastasia.travel/guides/food-spots-in-cambodia-for-culinary-adventures/), [BROWN's public menu](https://www.browncoffee.com.kh/page/Menu/). These are context references, not verification of every catalog record or current restaurant availability; descriptions here were generated independently.
