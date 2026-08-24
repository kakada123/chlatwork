BEGIN;

CREATE TABLE IF NOT EXISTS payback_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency "ExpenseCurrency" NOT NULL,
  "remainderMode" "PaybackRemainderMode" NOT NULL,
  "remainderPayer" VARCHAR(120) NOT NULL DEFAULT '',
  total NUMERIC(20, 2) NOT NULL,
  "participantCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payback_calculations_participant_count_check
    CHECK ("participantCount" >= 2),
  CONSTRAINT payback_calculations_total_check CHECK (total > 0)
);

CREATE INDEX IF NOT EXISTS payback_calculations_user_created_at_idx
  ON payback_calculations("userId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS payback_calculation_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "calculationId" UUID NOT NULL REFERENCES payback_calculations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name VARCHAR(120) NOT NULL,
  amount NUMERIC(20, 2) NOT NULL,
  "amountInput" VARCHAR(64) NOT NULL,
  CONSTRAINT payback_calculation_entries_position_check CHECK (position >= 0),
  CONSTRAINT payback_calculation_entries_amount_check CHECK (amount >= 0),
  CONSTRAINT payback_calculation_entries_calculation_position_key
    UNIQUE ("calculationId", position)
);

COMMIT;
