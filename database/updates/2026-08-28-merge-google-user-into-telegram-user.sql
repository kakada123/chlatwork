-- Merge the confirmed Google account into the confirmed Telegram account.
--
-- Source Google user:      b19a1c03-d5d6-4d86-bee9-57be5031952f
-- Destination Telegram user: e86e40e5-869b-4549-9f09-a9f390f40f4a
--
-- Review and run this file manually against the intended database. The source
-- user is retained as an inactive audit tombstone; no user row is deleted.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

LOCK TABLE
  users,
  moments,
  tool_usage_events,
  expense_profiles,
  expense_entries,
  payback_profiles,
  payback_entries,
  payback_calculations,
  social_accounts,
  refresh_tokens
IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  source_user_id UUID := 'b19a1c03-d5d6-4d86-bee9-57be5031952f';
  destination_user_id UUID := 'e86e40e5-869b-4549-9f09-a9f390f40f4a';
  source_email TEXT;
  source_phone TEXT;
  source_name TEXT;
  source_avatar_url TEXT;
  source_role "UserRole";
  source_is_active BOOLEAN;
  source_created_at TIMESTAMPTZ;
  destination_role "UserRole";
  destination_is_active BOOLEAN;
  destination_created_at TIMESTAMPTZ;
  moved_rows INTEGER;
BEGIN
  IF source_user_id = destination_user_id THEN
    RAISE EXCEPTION 'Source and destination users must be different.';
  END IF;

  -- A stable order prevents concurrent account maintenance from deadlocking.
  PERFORM pg_advisory_xact_lock(hashtextextended(LEAST(source_user_id::TEXT, destination_user_id::TEXT), 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(GREATEST(source_user_id::TEXT, destination_user_id::TEXT), 0));

  SELECT email, phone, name, "avatarUrl", role, "isActive", "createdAt"
  INTO source_email, source_phone, source_name, source_avatar_url, source_role, source_is_active, source_created_at
  FROM users
  WHERE id = source_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source Google user does not exist: %', source_user_id;
  END IF;

  SELECT role, "isActive", "createdAt"
  INTO destination_role, destination_is_active, destination_created_at
  FROM users
  WHERE id = destination_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination Telegram user does not exist: %', destination_user_id;
  END IF;

  -- These tables have one-row or position-based uniqueness per user. Refuse to
  -- overwrite destination drafts if it already contains independent tool data.
  IF EXISTS (
    SELECT 1 FROM expense_profiles WHERE "userId" = destination_user_id
    UNION ALL
    SELECT 1 FROM expense_entries WHERE "userId" = destination_user_id
  ) THEN
    RAISE EXCEPTION 'Destination already has Expense Tracker data; review the rows before merging.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM payback_profiles WHERE "userId" = destination_user_id
    UNION ALL
    SELECT 1 FROM payback_entries WHERE "userId" = destination_user_id
  ) THEN
    RAISE EXCEPTION 'Destination already has PayBack draft data; review the rows before merging.';
  END IF;

  -- Child Moment records and PayBack calculation entries follow their parent
  -- records, so moving these owners transfers the complete object graphs.
  UPDATE moments SET creator_id = destination_user_id WHERE creator_id = source_user_id;
  GET DIAGNOSTICS moved_rows = ROW_COUNT;
  RAISE NOTICE 'Moved % moments.', moved_rows;

  UPDATE tool_usage_events SET "userId" = destination_user_id WHERE "userId" = source_user_id;
  GET DIAGNOSTICS moved_rows = ROW_COUNT;
  RAISE NOTICE 'Moved % tool usage events.', moved_rows;

  UPDATE expense_profiles SET "userId" = destination_user_id WHERE "userId" = source_user_id;
  UPDATE expense_entries SET "userId" = destination_user_id WHERE "userId" = source_user_id;

  UPDATE payback_profiles SET "userId" = destination_user_id WHERE "userId" = source_user_id;
  UPDATE payback_entries SET "userId" = destination_user_id WHERE "userId" = source_user_id;
  UPDATE payback_calculations SET "userId" = destination_user_id WHERE "userId" = source_user_id;

  -- Both Google and Telegram provider identities now authenticate the same user.
  UPDATE social_accounts SET "userId" = destination_user_id WHERE "userId" = source_user_id;
  GET DIAGNOSTICS moved_rows = ROW_COUNT;
  RAISE NOTICE 'Linked % source login identities to the Telegram user.', moved_rows;

  UPDATE refresh_tokens SET "userId" = destination_user_id WHERE "userId" = source_user_id;

  -- Free the unique email before assigning the Google profile to the Telegram
  -- destination. The highest privilege and earliest creation date are retained.
  UPDATE users
  SET
    email = NULL,
    phone = NULL,
    name = NULL,
    "avatarUrl" = NULL,
    role = 'USER'::"UserRole",
    "isActive" = FALSE,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = source_user_id;

  UPDATE users
  SET
    email = source_email,
    phone = COALESCE(source_phone, phone),
    name = COALESCE(source_name, name),
    "avatarUrl" = COALESCE(source_avatar_url, "avatarUrl"),
    role = CASE
      WHEN source_role = 'ADMIN'::"UserRole" OR destination_role = 'ADMIN'::"UserRole"
        THEN 'ADMIN'::"UserRole"
      ELSE 'USER'::"UserRole"
    END,
    "isActive" = source_is_active OR destination_is_active,
    "createdAt" = LEAST(source_created_at, destination_created_at),
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = destination_user_id;

  IF EXISTS (
    SELECT 1 FROM moments WHERE creator_id = source_user_id
    UNION ALL
    SELECT 1 FROM tool_usage_events WHERE "userId" = source_user_id
    UNION ALL
    SELECT 1 FROM expense_profiles WHERE "userId" = source_user_id
    UNION ALL
    SELECT 1 FROM expense_entries WHERE "userId" = source_user_id
    UNION ALL
    SELECT 1 FROM payback_profiles WHERE "userId" = source_user_id
    UNION ALL
    SELECT 1 FROM payback_entries WHERE "userId" = source_user_id
    UNION ALL
    SELECT 1 FROM payback_calculations WHERE "userId" = source_user_id
    UNION ALL
    SELECT 1 FROM social_accounts WHERE "userId" = source_user_id
    UNION ALL
    SELECT 1 FROM refresh_tokens WHERE "userId" = source_user_id
  ) THEN
    RAISE EXCEPTION 'Merge verification failed: owned records still reference the source user.';
  END IF;

  RAISE NOTICE 'Merged Google user % into Telegram user %.', source_user_id, destination_user_id;
END $$;

COMMIT;
