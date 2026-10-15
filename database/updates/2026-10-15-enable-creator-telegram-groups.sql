-- Review and apply manually before deploying Creator Telegram group support.
-- Sender identity authorizes the account; chat_id is only the reply destination.
BEGIN;

ALTER TABLE creator_telegram_requests
  ADD COLUMN IF NOT EXISTS telegram_user_id bigint,
  ADD COLUMN IF NOT EXISTS source_message_id integer,
  ADD COLUMN IF NOT EXISTS message_thread_id integer;

-- All existing requests came from private chats, whose chat ID is the sender ID.
UPDATE creator_telegram_requests
SET telegram_user_id = chat_id
WHERE telegram_user_id IS NULL AND chat_id > 0;

ALTER TABLE creator_telegram_requests
  DROP CONSTRAINT IF EXISTS creator_telegram_requests_chat_id_check,
  ADD CONSTRAINT creator_telegram_requests_chat_id_check CHECK (chat_id <> 0),
  DROP CONSTRAINT IF EXISTS creator_telegram_requests_sender_check,
  ADD CONSTRAINT creator_telegram_requests_sender_check CHECK (
    (telegram_user_id IS NULL OR telegram_user_id > 0)
    AND (chat_id > 0 OR telegram_user_id IS NOT NULL)
    AND (chat_id < 0 OR telegram_user_id IS NULL OR telegram_user_id = chat_id)
  ),
  DROP CONSTRAINT IF EXISTS creator_telegram_requests_source_message_id_check,
  ADD CONSTRAINT creator_telegram_requests_source_message_id_check CHECK (source_message_id IS NULL OR source_message_id > 0),
  DROP CONSTRAINT IF EXISTS creator_telegram_requests_message_thread_id_check,
  ADD CONSTRAINT creator_telegram_requests_message_thread_id_check CHECK (message_thread_id IS NULL OR message_thread_id > 0);

COMMIT;
