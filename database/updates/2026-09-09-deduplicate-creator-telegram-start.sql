-- Apply manually after 2026-09-09-add-creator-telegram-bot.sql, before deploying.
-- A repeated Start update must not send another welcome message.
BEGIN;

ALTER TABLE creator_telegram_chats
  ADD COLUMN IF NOT EXISTS welcome_update_id bigint NOT NULL DEFAULT -1;

COMMIT;
