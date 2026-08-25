-- Review and run manually after 2026-08-25-add-moment-invitations.sql.
-- This migration preserves existing invitations and anonymous RSVP responses.

DO $$
BEGIN
  CREATE TYPE "InvitationRecipientType" AS ENUM ('INDIVIDUAL', 'COUPLE', 'FAMILY', 'GROUP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "moment_invitation_guests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "moment_id" UUID NOT NULL,
  "token" VARCHAR(32) NOT NULL,
  "display_name" VARCHAR(120) NOT NULL,
  "recipient_type" "InvitationRecipientType" NOT NULL DEFAULT 'INDIVIDUAL',
  "max_guests" INTEGER NOT NULL DEFAULT 1,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moment_invitation_guests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moment_invitation_guests_moment_id_fkey"
    FOREIGN KEY ("moment_id") REFERENCES "moments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "moment_invitation_guests_max_guests_check"
    CHECK ("max_guests" BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX IF NOT EXISTS "moment_invitation_guests_token_key"
  ON "moment_invitation_guests"("token");
CREATE INDEX IF NOT EXISTS "moment_invitation_guests_moment_id_created_at_idx"
  ON "moment_invitation_guests"("moment_id", "created_at");

ALTER TABLE "moment_rsvps" ADD COLUMN IF NOT EXISTS "guest_id" UUID;
CREATE UNIQUE INDEX IF NOT EXISTS "moment_rsvps_guest_id_key"
  ON "moment_rsvps"("guest_id");

DO $$
BEGIN
  ALTER TABLE "moment_rsvps"
    ADD CONSTRAINT "moment_rsvps_guest_id_fkey"
    FOREIGN KEY ("guest_id") REFERENCES "moment_invitation_guests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
