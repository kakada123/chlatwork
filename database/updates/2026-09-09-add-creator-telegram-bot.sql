-- Apply manually after 2026-09-04-create-creator-ai.sql.
-- Bot state is separate from the expense/voting bot, including update IDs.
BEGIN;

CREATE TABLE IF NOT EXISTS creator_telegram_chats (
  telegram_user_id bigint PRIMARY KEY CHECK (telegram_user_id > 0),
  feature "AiFeature" NOT NULL DEFAULT 'KHMER_GRAMMAR'
    CHECK (feature IN ('KHMER_GRAMMAR', 'KHMER_REWRITE', 'LATIN_TO_KHMER', 'HUMANIZE')),
  last_update_id bigint NOT NULL DEFAULT -1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_telegram_requests (
  update_id bigint PRIMARY KEY CHECK (update_id >= 0),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL CHECK (chat_id > 0),
  feature "AiFeature" NOT NULL
    CHECK (feature IN ('KHMER_GRAMMAR', 'KHMER_REWRITE', 'LATIN_TO_KHMER', 'HUMANIZE')),
  content varchar(4000),
  reply_parts jsonb,
  sent_parts integer NOT NULL DEFAULT 0 CHECK (sent_parts >= 0),
  lease_id uuid,
  locked_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_telegram_requests_processed_at_next_attempt_at_idx
  ON creator_telegram_requests(processed_at, next_attempt_at);
CREATE INDEX IF NOT EXISTS creator_telegram_requests_user_id_processed_at_idx
  ON creator_telegram_requests(user_id, processed_at);

COMMIT;
