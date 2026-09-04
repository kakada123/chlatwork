BEGIN;

-- A sentinel date keeps existing one-time polls on their original one-vote-per-person behavior.
ALTER TABLE "moment_votes"
  ADD COLUMN IF NOT EXISTS "vote_date" DATE NOT NULL DEFAULT DATE '1970-01-01';

ALTER TABLE "moment_votes"
  DROP CONSTRAINT IF EXISTS "moment_votes_moment_id_response_key_key";

CREATE UNIQUE INDEX IF NOT EXISTS "moment_votes_moment_id_response_key_vote_date_key"
  ON "moment_votes" ("moment_id", "response_key", "vote_date");

DROP INDEX IF EXISTS "moment_votes_moment_id_option_id_idx";
CREATE INDEX IF NOT EXISTS "moment_votes_moment_id_vote_date_option_id_idx"
  ON "moment_votes" ("moment_id", "vote_date", "option_id");

CREATE TABLE IF NOT EXISTS "moment_vote_schedules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "moment_id" UUID NOT NULL UNIQUE REFERENCES "moments"("id") ON DELETE CASCADE,
  "telegram_chat_id" BIGINT NOT NULL UNIQUE,
  "telegram_chat_title" VARCHAR(120),
  "time_zone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Phnom_Penh',
  "send_hour" INTEGER NOT NULL DEFAULT 10 CHECK ("send_hour" BETWEEN 0 AND 23),
  "send_minute" INTEGER NOT NULL DEFAULT 0 CHECK ("send_minute" BETWEEN 0 AND 59),
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_attempt_date" DATE,
  "last_sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "moment_vote_schedules_enabled_send_hour_send_minute_idx"
  ON "moment_vote_schedules" ("enabled", "send_hour", "send_minute");

COMMIT;
