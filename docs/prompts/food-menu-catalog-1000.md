# Copyable ChatGPT prompt: 1,000 Cambodia menu items

The ready-made dataset and SQL already exist under `data/food-menu-catalog/generated` and `database/seeds/2026-10-28-food-menu-catalog-1000.sql`. Use this prompt when generating a replacement dataset. Validate every batch with the repository importer before manually executing SQL.

Copy the following prompt into ChatGPT:

```text
Create a bilingual food-menu catalog for ChlatWork Food in Cambodia.

Goal: exactly 1,000 distinct, recognizable menu items eaten in Cambodia, including Khmer food and common Chinese, Vietnamese, Japanese, Korean, Western and Indian dishes, snacks, desserts, bakery items and drinks. These are menu ideas, not full recipes or restaurant listings. Prioritize familiar local foods and genuine menu variations.

ABSOLUTE EXCLUSION: no Thai cuisine or Thai menu items. Do not include Pad Thai, tom yum, tom kha, massaman, pad see ew, khao soi, Thai milk tea or Thai-inspired dishes. Do not label an excluded item as KHMER, OTHER or FUSION to bypass this rule. Do not mention the excluded cuisine in record descriptions or ingredient names either.

Return 20 batches of exactly 50 records. Output ONLY ONE batch per reply, starting with batch 1. I will say "continue" for the next batch. Remember all earlier names/slugs. Never repeat a dish by changing spelling, translating it, renaming it or changing only its serving size. Meaningful, established preparation/protein/flavour variants are allowed. Do not invent dishes to fill a quota. If you cannot supply real items confidently, tell me instead of padding with fake or numbered foods.

Category allocation across all 1,000 records:
RICE 100; NOODLES 120; SOUP 80; CURRY 50; STIR_FRY 80;
GRILL 60; SALAD 50; SEAFOOD 40; SNACK 90; DESSERT 80;
BAKERY 50; FAST_FOOD 70; DRINK 130.
Assign one primary category per item. NOODLES includes pasta; FAST_FOOD includes burgers, pizza, sandwiches and wraps. Avoid duplicating the same item under a second category.

Allowed cuisine values only:
KHMER, CHINESE, VIETNAMESE, JAPANESE, KOREAN, WESTERN, INDIAN, FUSION, OTHER.
Use the appropriate culinary style. Do not call all 1,000 items traditional Khmer dishes.

Allowed mealTimes: breakfast, lunch, snack, dinner.
Allowed tags: STREET_FOOD, HOME_COOKING, BREAKFAST_STALL, CAFE,
QUICK_MEAL, SHAREABLE, CELEBRATION, COMFORT_FOOD, FAMILY_MEAL.

Output strict UTF-8 JSON, with no Markdown fence, SQL, comments or explanation:
{
  "schemaVersion": 1,
  "batchNumber": 1,
  "items": [
    {
      "slug": "bai-sach-chrouk",
      "nameKm": "បាយសាច់ជ្រូក",
      "nameEn": "Grilled pork with rice",
      "descriptionKm": "បាយជាមួយសាច់ជ្រូកអាំង និងជ្រក់បន្លែ។",
      "descriptionEn": "Rice served with grilled pork and pickled vegetables.",
      "category": "RICE",
      "cuisine": "KHMER",
      "mealTimes": ["breakfast"],
      "ingredients": [
        {"nameKm": "អង្ករ", "nameEn": "Rice"},
        {"nameKm": "សាច់ជ្រូក", "nameEn": "Pork"}
      ],
      "tags": ["STREET_FOOD", "QUICK_MEAL"]
    }
  ]
}

The example illustrates the shape; each real reply must contain 50 items.
Use exactly those keys, with no extra properties:
- slug: unique lowercase ASCII words separated by single hyphens, at most 96 characters. No ordinal or placeholder slugs.
- nameKm/nameEn: unique meaningful names, at most 160 characters each. Khmer fields must contain Khmer script; translate naturally rather than leaving English-only titles.
- descriptionKm/descriptionEn: concise original descriptions, at most 500 characters each. Plain text on one line, no HTML or control characters.
- ingredients: 1–12 common representative ingredients, each with only nameKm/nameEn, each at most 80 characters. These are not guaranteed complete recipes or allergen lists.
- mealTimes: 1–4 distinct allowed values.
- tags: 0–6 distinct allowed values.
- Use realistic discovery times: include breakfast for familiar breakfast foods, and choose meaningful street-food, café, quick-meal or home-cooking tags. Do not assign lunch/dinner and HOME_COOKING to every record by default.
- batchNumber: integer 1–20, matching the requested batch.

Never invent prices, business names, locations, opening hours, calories, nutrition facts, source citations or guaranteed halal/vegan/allergen-free claims. Preparation and ingredients vary. Do not include personal data, prompts, executable code or SQL fields. Keep all names/slugs unique across earlier batches, including punctuation/case variants.

Generate batch 1 now. Stop after its JSON object.
```

Save replies as `batch-01.json` through `batch-20.json`. Before continuing a new chat, provide the prior slugs/names and remaining category counts to avoid losing context. The importer will reject duplicates even when ChatGPT misses them.

Prepare a reviewable SQL file without connecting to the database:

```bash
npm run food:catalog:prepare -- --input data/food-menu-catalog/generated --output .tmp/food-menu-catalog/new-import.sql --expect-count 1000
```

The output filename must be new. Review record accuracy, Khmer wording and exclusion rules before manually importing. Applying this generated file requires the catalog schema first; the provided standalone 1,000-record seed already includes that schema and the earlier-category compatibility fix.
