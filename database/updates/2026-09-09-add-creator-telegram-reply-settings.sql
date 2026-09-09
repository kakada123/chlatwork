-- Apply manually after 2026-09-09-add-creator-telegram-bot.sql, before deploying.
-- Existing users keep both sections visible until they change their own settings.
BEGIN;

ALTER TABLE creator_telegram_chats
  ADD COLUMN IF NOT EXISTS show_corrections boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_credits boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS corrections_update_id bigint NOT NULL DEFAULT -1,
  ADD COLUMN IF NOT EXISTS credits_update_id bigint NOT NULL DEFAULT -1;

COMMIT;
