BEGIN;

-- Usernames locate observed members; payment images remain keyed by user ID.
-- Existing members populate this field on their next bot-observed interaction.
ALTER TABLE telegram_group_members ADD COLUMN IF NOT EXISTS username VARCHAR(32);

CREATE INDEX IF NOT EXISTS telegram_group_members_chat_username_idx
  ON telegram_group_members (telegram_chat_id, lower(username))
  WHERE is_active = TRUE AND username IS NOT NULL;

COMMIT;
