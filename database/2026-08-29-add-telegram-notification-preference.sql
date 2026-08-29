BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_notifications_enabled_at TIMESTAMPTZ;

COMMIT;
