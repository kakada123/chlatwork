BEGIN;

DO $$ BEGIN
  CREATE TYPE "ExpenseCurrency" AS ENUM ('USD', 'KHR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseRangeMode" AS ENUM ('ALL', 'MONTH', 'WEEK', 'TODAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY', 'WEEKLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseEntryType" AS ENUM ('EXPENSE', 'INCOME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaybackRemainderMode" AS ENUM ('LEFTOVER_ONLY', 'ASSIGN_TO_PERSON');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS expense_profiles (
  "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  currency "ExpenseCurrency" NOT NULL DEFAULT 'USD',
  "rangeMode" "ExpenseRangeMode" NOT NULL DEFAULT 'MONTH',
  "budgetPeriod" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
  "budgetInput" VARCHAR(64) NOT NULL DEFAULT '',
  "rawInput" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type "ExpenseEntryType" NOT NULL,
  "entryDate" DATE,
  category VARCHAR(120) NOT NULL,
  "customCategory" VARCHAR(120),
  note VARCHAR(500) NOT NULL DEFAULT '',
  "showNote" BOOLEAN NOT NULL DEFAULT FALSE,
  amount NUMERIC(20, 2),
  "amountInput" VARCHAR(64) NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT expense_entries_user_position_key UNIQUE ("userId", position)
);

CREATE INDEX IF NOT EXISTS expense_entries_user_date_idx
  ON expense_entries("userId", "entryDate");

CREATE TABLE IF NOT EXISTS payback_profiles (
  "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  currency "ExpenseCurrency" NOT NULL DEFAULT 'USD',
  "remainderMode" "PaybackRemainderMode" NOT NULL DEFAULT 'LEFTOVER_ONLY',
  "remainderPayer" VARCHAR(120) NOT NULL DEFAULT '',
  "rawInput" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payback_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name VARCHAR(120) NOT NULL,
  amount NUMERIC(20, 2),
  "amountInput" VARCHAR(64) NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payback_entries_user_position_key UNIQUE ("userId", position)
);

COMMIT;
