-- Adds the My Roster feature tables: shifts, preferences, roster days, leave balances, and leave audit log.
-- Run after all existing migrations.
BEGIN;

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "RosterEntryStatus" AS ENUM ('DRAFT', 'REQUESTED', 'CONFIRMED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeaveCode" AS ENUM ('PRD', 'PHL', 'AL', 'H1', 'H2');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeaveTransactionKind" AS ENUM (
    'OPENING_BALANCE', 'EARNED', 'ADJUSTMENT', 'DEDUCTION', 'REVERSAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- roster_shifts: user-defined named shifts (personal, not global)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roster_shifts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code         VARCHAR(16) NOT NULL,
  -- Stored as HH:MM strings so no timezone conversion is needed
  start_time   VARCHAR(5)  NOT NULL,
  end_time     VARCHAR(5)  NOT NULL,
  is_overnight BOOLEAN     NOT NULL DEFAULT false,
  is_default   BOOLEAN     NOT NULL DEFAULT false,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT roster_shifts_user_code_unique UNIQUE (user_id, code)
);

CREATE INDEX IF NOT EXISTS roster_shifts_user_idx
  ON roster_shifts (user_id);

COMMENT ON TABLE roster_shifts IS
  'User-defined named work shifts. Codes like K122/K123 are personal; shifts are created via the API, not seeded globally.';

-- ---------------------------------------------------------------------------
-- roster_preferences: one config row per user
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roster_preferences (
  user_id               UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  saturday_off          BOOLEAN     NOT NULL DEFAULT true,
  sunday_off            BOOLEAN     NOT NULL DEFAULT true,
  public_holidays_off   BOOLEAN     NOT NULL DEFAULT true,
  default_shift_code    VARCHAR(16),
  -- Ordered list of leave codes to consume in priority order when auto-generating
  leave_priority        TEXT[]      NOT NULL DEFAULT ARRAY['PRD','PHL','AL'],
  -- How many PRD half-days (÷2 = full days) are allowed per month
  monthly_prd_allowance INT         NOT NULL DEFAULT 7,
  timezone              VARCHAR(64) NOT NULL DEFAULT 'Asia/Phnom_Penh',
  display_name          VARCHAR(128),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE roster_preferences IS
  'Per-user roster configuration: weekend rules, leave priority order, PRD allowance, and display timezone.';
COMMENT ON COLUMN roster_preferences.monthly_prd_allowance IS
  'Number of PRD full-days allowed per month. Half-day granularity is handled internally (×2).';

-- ---------------------------------------------------------------------------
-- roster_days: one row per user per calendar date
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roster_days (
  id         UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE                 NOT NULL,
  -- NULL shift_code means the day is off or leave-only
  shift_code VARCHAR(16),
  leave_code "LeaveCode",
  status     "RosterEntryStatus"  NOT NULL DEFAULT 'DRAFT',
  note       TEXT,
  is_locked  BOOLEAN              NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ          NOT NULL DEFAULT now(),

  CONSTRAINT roster_days_user_date_unique UNIQUE (user_id, entry_date)
);

-- Primary query pattern: load a month of days for a user
CREATE INDEX IF NOT EXISTS roster_days_user_date_idx
  ON roster_days (user_id, entry_date);

-- Quickly find all days with a specific status (e.g. REQUESTED awaiting approval)
CREATE INDEX IF NOT EXISTS roster_days_user_status_idx
  ON roster_days (user_id, status);

COMMENT ON TABLE roster_days IS
  'One row per user per calendar date. NULL shift_code means day-off or leave. is_locked prevents auto-generation from overwriting the entry.';

-- ---------------------------------------------------------------------------
-- leave_balances: running balance per user / leave type / year
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leave_balances (
  user_id                 UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_code              "LeaveCode"  NOT NULL,
  leave_year              INT          NOT NULL,
  -- All quantities stored in half-days; 1 full day = 2 half-days
  opening_balance_half_days  INT       NOT NULL DEFAULT 0,
  earned_half_days           INT       NOT NULL DEFAULT 0,
  adjustment_half_days       INT       NOT NULL DEFAULT 0,
  confirmed_used_half_days   INT       NOT NULL DEFAULT 0,
  pending_half_days          INT       NOT NULL DEFAULT 0,

  PRIMARY KEY (user_id, leave_code, leave_year)
);

CREATE INDEX IF NOT EXISTS leave_balances_user_year_idx
  ON leave_balances (user_id, leave_year);

COMMENT ON TABLE leave_balances IS
  'Running leave balance per user/type/year. All values in half-days (2 half-days = 1 full day). Derived from leave_transactions but cached here for fast reads.';

-- ---------------------------------------------------------------------------
-- leave_transactions: immutable audit log of every balance change
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leave_transactions (
  id            UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID                   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_code    "LeaveCode"            NOT NULL,
  kind          "LeaveTransactionKind" NOT NULL,
  -- Positive = credit, negative = debit
  half_days     INT                    NOT NULL,
  -- NULL when the transaction is not tied to a specific roster day
  roster_day_id UUID                   REFERENCES roster_days(id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ            NOT NULL DEFAULT now()
);

-- Primary lookup: a user's history for a specific leave type, newest first
CREATE INDEX IF NOT EXISTS leave_transactions_user_code_created_idx
  ON leave_transactions (user_id, leave_code, created_at DESC);

-- Allow efficient lookup of all transactions tied to a roster day (e.g. for reversal)
CREATE INDEX IF NOT EXISTS leave_transactions_roster_day_idx
  ON leave_transactions (roster_day_id)
  WHERE roster_day_id IS NOT NULL;

COMMENT ON TABLE leave_transactions IS
  'Append-only audit log of every leave balance change. half_days is positive for credits (OPENING_BALANCE, EARNED, ADJUSTMENT) and negative for debits (DEDUCTION). REVERSAL entries flip a prior DEDUCTION.';

COMMIT;
