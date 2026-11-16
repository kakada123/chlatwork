-- Incremental PrepHub update. Run AFTER 2026-11-16-add-prephub.sql.
-- Review and execute manually. Existing workspaces remain private; no content is removed.
BEGIN;
ALTER TABLE "preparation_subjects"
  ADD COLUMN IF NOT EXISTS "share_token" VARCHAR(43),
  ADD COLUMN IF NOT EXISTS "share_attachments" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shared_at" TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS "preparation_subjects_share_token_key"
  ON "preparation_subjects"("share_token");
COMMIT;
