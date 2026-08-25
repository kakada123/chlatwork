-- Adds reusable single-choice polls without changing or deleting existing Moments.
ALTER TYPE "MomentOccasion" ADD VALUE IF NOT EXISTS 'VOTING';
ALTER TYPE "MomentBlockType" ADD VALUE IF NOT EXISTS 'POLL';

CREATE TABLE IF NOT EXISTS "moment_votes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "moment_id" UUID NOT NULL REFERENCES "moments"("id") ON DELETE CASCADE,
  "response_key" CHAR(64) NOT NULL,
  "option_id" VARCHAR(40) NOT NULL,
  "voter_name" VARCHAR(80),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moment_votes_moment_id_response_key_key" UNIQUE ("moment_id", "response_key")
);

CREATE INDEX IF NOT EXISTS "moment_votes_moment_id_option_id_idx"
  ON "moment_votes" ("moment_id", "option_id");
