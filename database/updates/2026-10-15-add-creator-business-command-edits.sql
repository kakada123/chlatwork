-- Review and run manually after 2026-10-15-enable-creator-telegram-groups.sql.
BEGIN;

ALTER TABLE creator_telegram_requests
  ADD COLUMN IF NOT EXISTS business_connection_id varchar(256),
  ADD COLUMN IF NOT EXISTS source_message_date timestamp(3);

-- Business chat IDs identify the recipient; the linked sender still owns all charges.
ALTER TABLE creator_telegram_requests
  DROP CONSTRAINT IF EXISTS creator_telegram_requests_sender_check,
  ADD CONSTRAINT creator_telegram_requests_sender_check CHECK (
    (telegram_user_id IS NULL OR telegram_user_id > 0)
    AND (chat_id > 0 OR telegram_user_id IS NOT NULL)
    AND (business_connection_id IS NOT NULL OR chat_id < 0 OR telegram_user_id IS NULL OR telegram_user_id = chat_id)
  ),
  DROP CONSTRAINT IF EXISTS creator_telegram_requests_business_edit_check,
  ADD CONSTRAINT creator_telegram_requests_business_edit_check CHECK (
    business_connection_id IS NULL OR (
      length(trim(business_connection_id)) > 0
      AND chat_id > 0 AND telegram_user_id IS NOT NULL AND telegram_user_id <> chat_id
      AND source_message_id IS NOT NULL AND source_message_id > 0
      AND source_message_date IS NOT NULL AND message_thread_id IS NULL
    )
  );

-- Different webhook updates for one source must never create another paid edit.
CREATE UNIQUE INDEX IF NOT EXISTS creator_telegram_requests_business_source_key
  ON creator_telegram_requests (business_connection_id, chat_id, source_message_id);

COMMIT;
