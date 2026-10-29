-- Review and execute manually after 2026-10-28-add-food-ai-recipes.sql.
-- Existing generated recipes become browseable; only validated cooking content is public.
BEGIN;

CREATE INDEX IF NOT EXISTS food_ai_recipes_created_idx
  ON food_ai_recipes (created_at DESC, id DESC);

-- Keep name matching consistent with the catalog query, including historical recipes.
CREATE INDEX IF NOT EXISTS food_ai_recipes_name_km_idx
  ON food_ai_recipes (lower(btrim(normalize(recipe->>'nameKm', NFKC))), created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS food_ai_recipes_name_en_idx
  ON food_ai_recipes (lower(btrim(normalize(recipe->>'nameEn', NFKC))), created_at DESC, id DESC);

COMMENT ON TABLE food_ai_recipes IS 'Validated generated cooking content is public. Owner links and personalized recommendation explanations are private.';
COMMIT;
