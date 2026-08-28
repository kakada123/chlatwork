-- Swap all application-owned data between two existing ChlatWork users.
--
-- Replace the two NULL values below with the real UUIDs before running.
-- This intentionally keeps users, login identities, roles, social_accounts,
-- and refresh_tokens unchanged so each person continues using their own login.
--
-- The transaction locks affected tables, validates both users, uses a temporary
-- disabled user to avoid unique-key collisions, and rolls everything back if
-- any statement fails.

BEGIN;

LOCK TABLE
  users,
  moments,
  tool_usage_events,
  expense_profiles,
  expense_entries,
  payback_profiles,
  payback_entries,
  payback_calculations
IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  user_a UUID := 'b19a1c03-d5d6-4d86-bee9-57be5031952f'; -- Example: '11111111-1111-1111-1111-111111111111'
  user_b UUID := 'd4cdc156-3282-4cf3-a151-663e39d7eb90'; -- Example: '22222222-2222-2222-2222-222222222222'
  swap_user UUID := '00000000-0000-0000-0000-000000000001';
  existing_users INTEGER;
BEGIN
  IF user_a IS NULL OR user_b IS NULL THEN
    RAISE EXCEPTION 'Set user_a and user_b to the two real user UUIDs before running this script.';
  END IF;

  IF user_a = user_b THEN
    RAISE EXCEPTION 'user_a and user_b must be different users.';
  END IF;

  SELECT COUNT(*)
  INTO existing_users
  FROM users
  WHERE id IN (user_a, user_b);

  IF existing_users <> 2 THEN
    RAISE EXCEPTION 'Both user UUIDs must exist. Found % of 2 users.', existing_users;
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE id = swap_user) THEN
    RAISE EXCEPTION 'Reserved temporary swap UUID already exists: %', swap_user;
  END IF;

  INSERT INTO users (id, name, role, "isActive", "createdAt", "updatedAt")
  VALUES (
    swap_user,
    'Temporary data-swap placeholder',
    'USER',
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  -- Moments own their blocks, media, invitations, responses, and votes through
  -- moment_id, so changing creator_id moves the complete Moment graph.
  UPDATE moments SET creator_id = swap_user WHERE creator_id = user_a;
  UPDATE moments SET creator_id = user_a WHERE creator_id = user_b;
  UPDATE moments SET creator_id = user_b WHERE creator_id = swap_user;

  UPDATE tool_usage_events SET "userId" = swap_user WHERE "userId" = user_a;
  UPDATE tool_usage_events SET "userId" = user_a WHERE "userId" = user_b;
  UPDATE tool_usage_events SET "userId" = user_b WHERE "userId" = swap_user;

  UPDATE expense_profiles SET "userId" = swap_user WHERE "userId" = user_a;
  UPDATE expense_profiles SET "userId" = user_a WHERE "userId" = user_b;
  UPDATE expense_profiles SET "userId" = user_b WHERE "userId" = swap_user;

  UPDATE expense_entries SET "userId" = swap_user WHERE "userId" = user_a;
  UPDATE expense_entries SET "userId" = user_a WHERE "userId" = user_b;
  UPDATE expense_entries SET "userId" = user_b WHERE "userId" = swap_user;

  UPDATE payback_profiles SET "userId" = swap_user WHERE "userId" = user_a;
  UPDATE payback_profiles SET "userId" = user_a WHERE "userId" = user_b;
  UPDATE payback_profiles SET "userId" = user_b WHERE "userId" = swap_user;

  UPDATE payback_entries SET "userId" = swap_user WHERE "userId" = user_a;
  UPDATE payback_entries SET "userId" = user_a WHERE "userId" = user_b;
  UPDATE payback_entries SET "userId" = user_b WHERE "userId" = swap_user;

  -- Calculation entries follow their parent calculation through calculationId.
  UPDATE payback_calculations SET "userId" = swap_user WHERE "userId" = user_a;
  UPDATE payback_calculations SET "userId" = user_a WHERE "userId" = user_b;
  UPDATE payback_calculations SET "userId" = user_b WHERE "userId" = swap_user;

  IF EXISTS (
    SELECT 1 FROM moments WHERE creator_id = swap_user
    UNION ALL
    SELECT 1 FROM tool_usage_events WHERE "userId" = swap_user
    UNION ALL
    SELECT 1 FROM expense_profiles WHERE "userId" = swap_user
    UNION ALL
    SELECT 1 FROM expense_entries WHERE "userId" = swap_user
    UNION ALL
    SELECT 1 FROM payback_profiles WHERE "userId" = swap_user
    UNION ALL
    SELECT 1 FROM payback_entries WHERE "userId" = swap_user
    UNION ALL
    SELECT 1 FROM payback_calculations WHERE "userId" = swap_user
  ) THEN
    RAISE EXCEPTION 'Swap did not complete: application data still belongs to the temporary user.';
  END IF;

  DELETE FROM users WHERE id = swap_user;

  IF FOUND = FALSE THEN
    RAISE EXCEPTION 'Temporary swap user could not be removed.';
  END IF;
END $$;

COMMIT;
