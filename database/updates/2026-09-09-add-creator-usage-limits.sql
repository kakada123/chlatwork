-- Apply manually before deploying the API. NULL preserves the configured default;
-- zero blocks new daily usage without changing credits or generation history.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_daily_credit_limit integer
  CHECK (ai_daily_credit_limit BETWEEN 0 AND 100000);

CREATE TABLE IF NOT EXISTS ai_usage_limit_changes (
  id varchar(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  previous_limit integer CHECK (previous_limit BETWEEN 0 AND 100000),
  daily_credit_limit integer CHECK (daily_credit_limit BETWEEN 0 AND 100000),
  reason varchar(240) NOT NULL CHECK (char_length(trim(reason)) >= 3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_limit_changes_user_id_created_at_idx
  ON ai_usage_limit_changes(user_id, created_at DESC);

COMMIT;
