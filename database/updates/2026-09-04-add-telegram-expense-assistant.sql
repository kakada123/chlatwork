BEGIN;

DO $$ BEGIN
  CREATE TYPE "TelegramBotPendingExpenseStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'UNDONE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Telegram retries webhook deliveries, so update IDs provide the durable
-- idempotency boundary before any expense state is changed.
CREATE TABLE IF NOT EXISTS telegram_bot_updates (
  update_id BIGINT PRIMARY KEY CHECK (update_id >= 0),
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS telegram_bot_updates_received_at_idx
  ON telegram_bot_updates(received_at);

-- Parsed messages remain pending until the user explicitly confirms them.
CREATE TABLE IF NOT EXISTS telegram_bot_pending_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_user_id VARCHAR(20) NOT NULL
    CHECK (telegram_user_id ~ '^[1-9][0-9]{0,19}$'),
  chat_id BIGINT NOT NULL CHECK (chat_id > 0),
  source_message_id BIGINT NOT NULL CHECK (source_message_id >= 0),
  amount_input VARCHAR(64) NOT NULL
    CHECK (amount_input ~ '^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$'),
  currency "ExpenseCurrency" NOT NULL,
  category VARCHAR(120) NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  entry_date DATE NOT NULL,
  status "TelegramBotPendingExpenseStatus" NOT NULL DEFAULT 'PENDING',
  expense_entry_id UUID UNIQUE REFERENCES expense_entries(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT telegram_bot_pending_expenses_chat_message_key
    UNIQUE (chat_id, source_message_id)
);

CREATE INDEX IF NOT EXISTS telegram_bot_pending_expenses_user_status_expiry_idx
  ON telegram_bot_pending_expenses(telegram_user_id, status, expires_at);

CREATE INDEX IF NOT EXISTS telegram_bot_pending_expenses_user_id_idx
  ON telegram_bot_pending_expenses(user_id);

COMMIT;
