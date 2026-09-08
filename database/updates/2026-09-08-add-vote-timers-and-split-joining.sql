-- Requires the daily voting, Telegram assistant utilities, and group-members updates.
-- Review and execute manually before deploying the corresponding API changes.
BEGIN;

ALTER TABLE moment_vote_schedules
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (duration_minutes BETWEEN 1 AND 1440);

-- Keep each deadline and delivery target after midnight or a schedule change.
CREATE TABLE IF NOT EXISTS moment_vote_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  vote_date DATE NOT NULL,
  telegram_chat_id BIGINT NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  message_id INTEGER,
  finalized_at TIMESTAMPTZ,
  UNIQUE (moment_id, vote_date)
);
CREATE INDEX IF NOT EXISTS moment_vote_rounds_closes_at_idx
  ON moment_vote_rounds (closes_at) WHERE finalized_at IS NULL;

-- Snapshot known members; no reply means joined, never inferred from read receipts.
CREATE TABLE IF NOT EXISTS moment_vote_round_members (
  round_id UUID NOT NULL REFERENCES moment_vote_rounds(id) ON DELETE CASCADE,
  telegram_user_id VARCHAR(20) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  joined BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (round_id, telegram_user_id)
);
ALTER TABLE telegram_group_splits ADD COLUMN IF NOT EXISTS vote_round_id UUID
  UNIQUE REFERENCES moment_vote_rounds(id) ON DELETE SET NULL;

COMMIT;
