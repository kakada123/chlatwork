-- Review and execute manually before deploying shared Bot Admin.
-- Prerequisite: member_khqr_images and the existing Creator credit tables.
-- Run these enum statements outside a surrounding transaction.
ALTER TYPE "AiFeature" ADD VALUE IF NOT EXISTS 'CHLATWORK_ASSISTANT';
ALTER TYPE "AiFeature" ADD VALUE IF NOT EXISTS 'CHLATWORK_VOICE';
ALTER TYPE "AiFeature" ADD VALUE IF NOT EXISTS 'CHLATWORK_RECEIPT';

BEGIN;

CREATE TABLE IF NOT EXISTS telegram_bot_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  telegram_user_id bigint UNIQUE NOT NULL CHECK (telegram_user_id > 0),
  username varchar(32),
  status varchar(16) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  version integer NOT NULL DEFAULT 0,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telegram_bot_memberships (
  user_id uuid NOT NULL REFERENCES telegram_bot_profiles(user_id) ON DELETE CASCADE,
  bot varchar(16) NOT NULL CHECK (bot IN ('CREATOR', 'CHLATWORK')),
  enabled boolean NOT NULL DEFAULT TRUE,
  first_private_started_at timestamptz,
  last_activity_at timestamptz,
  PRIMARY KEY (user_id, bot)
);

CREATE TABLE IF NOT EXISTS telegram_bot_audit (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  bot varchar(16) CHECK (bot IN ('CREATOR', 'CHLATWORK')),
  action varchar(40) NOT NULL,
  operation_key varchar(160) UNIQUE NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telegram_bot_profiles_status_idx
  ON telegram_bot_profiles(status, created_at DESC);
CREATE INDEX IF NOT EXISTS telegram_bot_audit_user_idx
  ON telegram_bot_audit(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_bot_qr_drafts (
  user_id uuid NOT NULL REFERENCES telegram_bot_profiles(user_id) ON DELETE CASCADE,
  bot varchar(16) NOT NULL CHECK (bot IN ('CREATOR', 'CHLATWORK')),
  token varchar(36) NOT NULL,
  content bytea CHECK (octet_length(content) <= 2097152),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, bot)
);

CREATE INDEX IF NOT EXISTS telegram_bot_qr_drafts_expiry_idx
  ON telegram_bot_qr_drafts(expires_at);

CREATE TABLE IF NOT EXISTS telegram_bot_notifications (
  operation_key varchar(160) NOT NULL REFERENCES telegram_bot_audit(operation_key) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES telegram_bot_profiles(user_id) ON DELETE CASCADE,
  bot varchar(16) NOT NULL CHECK (bot IN ('CREATOR', 'CHLATWORK')),
  attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (operation_key, bot)
);

CREATE INDEX IF NOT EXISTS telegram_bot_notifications_pending_idx
  ON telegram_bot_notifications(created_at)
  WHERE delivered_at IS NULL AND attempts < 5;

-- A singleton marker prevents rerunning this file from approving new users.
CREATE TABLE IF NOT EXISTS telegram_bot_admin_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT NOW()
);

-- Numeric provider IDs are canonical identities. Multiple numeric identities for
-- one account require manual reconciliation, never guessing by name or username.
-- CASE protects casts even when the query planner reorders WHERE predicates.
WITH migration AS (
  INSERT INTO telegram_bot_admin_migrations(name)
  VALUES ('initial-approved-backfill')
  ON CONFLICT DO NOTHING
  RETURNING name
), identities AS (
  SELECT "userId", MIN("providerUserId") AS telegram_id
  FROM social_accounts
  WHERE provider = 'TELEGRAM'
    AND CASE
      WHEN "providerUserId" ~ '^[1-9][0-9]{0,15}$'
      THEN "providerUserId"::numeric <= 9007199254740991
      ELSE FALSE
    END
  GROUP BY "userId"
  HAVING COUNT(*) = 1
), backfilled AS (
  INSERT INTO telegram_bot_profiles(user_id, telegram_user_id, status)
  SELECT "userId", telegram_id::bigint, 'APPROVED'
  FROM identities
  WHERE EXISTS (SELECT 1 FROM migration)
  ON CONFLICT DO NOTHING
  RETURNING user_id
)
INSERT INTO telegram_bot_memberships(user_id, bot)
SELECT p.user_id, b.bot
FROM backfilled p
CROSS JOIN (VALUES ('CREATOR'), ('CHLATWORK')) AS b(bot)
ON CONFLICT DO NOTHING;

COMMIT;
