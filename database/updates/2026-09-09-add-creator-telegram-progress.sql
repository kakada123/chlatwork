-- Apply manually after 2026-09-09-add-creator-telegram-bot.sql, before deploying.
-- Persist the waiting message so queue retries and restarts reuse the same status.
BEGIN;

ALTER TABLE creator_telegram_requests
  ADD COLUMN IF NOT EXISTS status_message_id integer;

COMMIT;
