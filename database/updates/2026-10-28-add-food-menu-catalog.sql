-- Review and execute manually. Public menu ideas are separate from private food_ai_recipes.
BEGIN;
CREATE TABLE IF NOT EXISTS food_menu_items (
  slug VARCHAR(96) PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_km VARCHAR(160) NOT NULL CHECK (length(trim(name_km)) > 0),
  name_en VARCHAR(160) NOT NULL CHECK (length(trim(name_en)) > 0),
  name_key_km VARCHAR(512) NOT NULL UNIQUE,
  name_key_en VARCHAR(512) NOT NULL UNIQUE,
  description_km VARCHAR(500) NOT NULL,
  description_en VARCHAR(500) NOT NULL,
  category VARCHAR(24) NOT NULL CHECK (category IN ('RICE','NOODLES','SOUP','CURRY','STIR_FRY','GRILL','SALAD','SEAFOOD','SNACK','DESSERT','BAKERY','FAST_FOOD','DRINK')),
  cuisine VARCHAR(24) NOT NULL CHECK (cuisine IN ('KHMER','CHINESE','VIETNAMESE','JAPANESE','KOREAN','WESTERN','INDIAN','FUSION','OTHER')),
  meal_times TEXT[] NOT NULL CHECK (cardinality(meal_times) BETWEEN 1 AND 4 AND meal_times <@ ARRAY['breakfast','lunch','snack','dinner']::text[]),
  ingredients JSONB NOT NULL CHECK (jsonb_typeof(ingredients) = 'array' AND jsonb_array_length(ingredients) BETWEEN 1 AND 12),
  tags TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 6 AND tags <@ ARRAY['STREET_FOOD','HOME_COOKING','BREAKFAST_STALL','CAFE','QUICK_MEAL','SHAREABLE','CELEBRATION','COMFORT_FOOD','FAMILY_MEAL']::text[]),
  source VARCHAR(24) NOT NULL DEFAULT 'AI_ASSISTED' CHECK (source = 'AI_ASSISTED'),
  import_batch VARCHAR(64) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- CREATE TABLE IF NOT EXISTS leaves an earlier check unchanged; widen that check for existing installations.
ALTER TABLE food_menu_items DROP CONSTRAINT IF EXISTS food_menu_items_category_check;
ALTER TABLE food_menu_items ADD CONSTRAINT food_menu_items_category_check CHECK (category IN ('RICE','NOODLES','SOUP','CURRY','STIR_FRY','GRILL','SALAD','SEAFOOD','SNACK','DESSERT','BAKERY','FAST_FOOD','DRINK'));
CREATE INDEX IF NOT EXISTS food_menu_items_category_slug_idx ON food_menu_items (category, slug);
CREATE INDEX IF NOT EXISTS food_menu_items_cuisine_slug_idx ON food_menu_items (cuisine, slug);
CREATE INDEX IF NOT EXISTS food_menu_items_meals_idx ON food_menu_items USING GIN (meal_times);
CREATE INDEX IF NOT EXISTS food_menu_items_tags_idx ON food_menu_items USING GIN (tags);
COMMENT ON TABLE food_menu_items IS 'AI-assisted public menu ideas, reviewed by the importer/operator. Ingredients vary; no restaurant, price or dietary verification implied.';
COMMIT;
