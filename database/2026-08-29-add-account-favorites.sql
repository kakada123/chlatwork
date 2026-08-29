BEGIN;

DO $$ BEGIN
  CREATE TYPE "FavoriteKind" AS ENUM ('TOOL', 'COMMAND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind "FavoriteKind" NOT NULL,
  "itemKey" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_favorites_user_kind_item_key UNIQUE ("userId", kind, "itemKey")
);

CREATE INDEX IF NOT EXISTS user_favorites_user_created_at_idx
  ON user_favorites("userId", "createdAt" DESC);

COMMIT;
