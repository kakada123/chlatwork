BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_budget_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_weekly_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_weekly_digest_hour SMALLINT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS telegram_weekly_digest_last_attempt_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_telegram_weekly_digest_hour_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_telegram_weekly_digest_hour_check
      CHECK (telegram_weekly_digest_hour BETWEEN 0 AND 23);
  END IF;
END
$$;

ALTER TABLE telegram_bot_pending_expenses
  ADD COLUMN IF NOT EXISTS edit_target_expense_entry_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'telegram_bot_pending_expenses_edit_target_fkey'
      AND conrelid = 'telegram_bot_pending_expenses'::regclass
  ) THEN
    ALTER TABLE telegram_bot_pending_expenses
      ADD CONSTRAINT telegram_bot_pending_expenses_edit_target_fkey
      FOREIGN KEY (edit_target_expense_entry_id)
      REFERENCES expense_entries(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS telegram_bot_pending_expenses_edit_target_idx
  ON telegram_bot_pending_expenses(edit_target_expense_entry_id);

-- A short-lived conversation record lets a corrected message replace the
-- selected expense instead of accidentally creating a second expense.
CREATE TABLE IF NOT EXISTS telegram_bot_conversation_states (
  telegram_user_id VARCHAR(20) PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  edit_target_expense_entry_id UUID NOT NULL REFERENCES expense_entries(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telegram_bot_conversation_states_expiry_idx
  ON telegram_bot_conversation_states(expires_at);

-- One row per user and budget period makes threshold alerts idempotent across
-- multiple API replicas without storing any message or receipt content.
CREATE TABLE IF NOT EXISTS telegram_budget_alert_states (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  period_key VARCHAR(32) NOT NULL,
  last_threshold SMALLINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT telegram_budget_alert_threshold_check
    CHECK (last_threshold IN (50, 80, 100))
);

CREATE TABLE IF NOT EXISTS telegram_group_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  title VARCHAR(120) NOT NULL DEFAULT 'Shared expense',
  total NUMERIC(20, 2) NOT NULL,
  currency "ExpenseCurrency" NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT telegram_group_splits_total_check CHECK (total > 0),
  CONSTRAINT telegram_group_splits_status_check
    CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS telegram_group_splits_chat_status_created_idx
  ON telegram_group_splits(telegram_chat_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS telegram_group_splits_creator_created_idx
  ON telegram_group_splits(creator_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_group_split_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES telegram_group_splits(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name VARCHAR(80) NOT NULL,
  amount NUMERIC(20, 2) NOT NULL,
  telegram_user_id VARCHAR(20),
  telegram_display_name VARCHAR(80),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT telegram_group_split_participants_amount_check CHECK (amount > 0),
  CONSTRAINT telegram_group_split_participants_position_key UNIQUE (split_id, position),
  CONSTRAINT telegram_group_split_participants_user_key UNIQUE (split_id, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS telegram_group_split_participants_paid_idx
  ON telegram_group_split_participants(split_id, paid_at);

COMMIT;
