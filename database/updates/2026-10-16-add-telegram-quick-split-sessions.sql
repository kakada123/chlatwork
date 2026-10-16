-- Run manually before deploying the guided /split flow. Existing tables and data are unchanged.
BEGIN;

-- Sessions belong to a sender inside one group; no linked ChlatWork account is required.
CREATE TABLE IF NOT EXISTS telegram_quick_split_sessions (
  telegram_chat_id BIGINT NOT NULL,
  telegram_user_id VARCHAR(20) NOT NULL,
  amount_input VARCHAR(32),
  prompt_message_id INTEGER NOT NULL,
  last_message_id INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (telegram_chat_id, telegram_user_id),
  CONSTRAINT telegram_quick_split_sender_check CHECK (telegram_user_id ~ '^[1-9][0-9]{0,19}$'),
  CONSTRAINT telegram_quick_split_chat_check CHECK (telegram_chat_id <> 0),
  CONSTRAINT telegram_quick_split_prompt_check CHECK (prompt_message_id > 0 AND last_message_id >= 0)
);

CREATE INDEX IF NOT EXISTS telegram_quick_split_sessions_expires_at_idx
  ON telegram_quick_split_sessions(expires_at);

COMMIT;
