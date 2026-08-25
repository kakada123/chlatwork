-- Review and run manually against the ChlatWork PostgreSQL database.
-- Existing Moment rows and responses are preserved.

ALTER TYPE "MomentOccasion" ADD VALUE IF NOT EXISTS 'INVITATION';
ALTER TYPE "MomentBlockType" ADD VALUE IF NOT EXISTS 'EVENT_DETAILS';
ALTER TYPE "MomentBlockType" ADD VALUE IF NOT EXISTS 'LOCATION';
ALTER TYPE "MomentBlockType" ADD VALUE IF NOT EXISTS 'SCHEDULE';
ALTER TYPE "MomentBlockType" ADD VALUE IF NOT EXISTS 'RSVP';

DO $$
BEGIN
  CREATE TYPE "MomentRsvpChoice" AS ENUM ('YES', 'MAYBE', 'NO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "moment_rsvps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "moment_id" UUID NOT NULL,
  "response_key" CHAR(64) NOT NULL,
  "choice" "MomentRsvpChoice" NOT NULL,
  "guest_name" VARCHAR(80),
  "guest_count" INTEGER NOT NULL DEFAULT 1,
  "note" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moment_rsvps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moment_rsvps_moment_id_fkey"
    FOREIGN KEY ("moment_id") REFERENCES "moments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "moment_rsvps_guest_count_check"
    CHECK ("guest_count" BETWEEN 0 AND 20)
);

CREATE UNIQUE INDEX IF NOT EXISTS "moment_rsvps_moment_id_response_key_key"
  ON "moment_rsvps"("moment_id", "response_key");
CREATE INDEX IF NOT EXISTS "moment_rsvps_moment_id_choice_idx"
  ON "moment_rsvps"("moment_id", "choice");
