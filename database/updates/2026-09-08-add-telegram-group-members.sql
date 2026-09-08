BEGIN;

-- Telegram cannot enumerate existing group members. Keep only identities observed
-- in this group so voting reminders never mention users from another chat.
CREATE TABLE IF NOT EXISTS "telegram_group_members" (
  "telegram_chat_id" BIGINT NOT NULL,
  "telegram_user_id" VARCHAR(20) NOT NULL,
  "display_name" VARCHAR(80) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "observed_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("telegram_chat_id", "telegram_user_id"),
  CHECK ("telegram_user_id" ~ '^[1-9][0-9]{0,19}$')
);

COMMIT;
