-- Review and execute manually before deploying Food recipe persistence. No existing data is modified.
BEGIN;

CREATE TABLE IF NOT EXISTS food_ai_recipes (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id VARCHAR(64) NOT NULL CHECK (recipe_id ~ '^gemini-[0-9a-f]{24}$'),
  recipe JSONB NOT NULL CHECK (jsonb_typeof(recipe) = 'object' AND recipe @> '{"source":"gemini"}'::jsonb),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS food_ai_recipes_owner_created_idx
  ON food_ai_recipes (owner_id, created_at DESC, id DESC);

COMMENT ON TABLE food_ai_recipes IS 'Validated Gemini recipe output only. Account history is private; anonymous rows have no public listing.';
COMMIT;
