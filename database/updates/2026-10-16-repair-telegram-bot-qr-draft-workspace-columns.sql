-- Run manually in the same database used by the deployed Telegram API.
-- Use this repair only after the group-workspace tables have been created.
-- Existing saved KHQR images, drafts, approvals and balances are preserved.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $prerequisites$
BEGIN
  IF to_regclass('telegram_group_workspaces') IS NULL THEN
    RAISE EXCEPTION 'Missing telegram_group_workspaces. Apply the complete 2026-10-16-add-telegram-group-workspaces.sql migration first.';
  END IF;
  IF to_regclass('telegram_bot_qr_drafts') IS NULL THEN
    RAISE EXCEPTION 'Missing telegram_bot_qr_drafts. Apply the shared Telegram Bot Admin migration first.';
  END IF;
END $prerequisites$;

ALTER TABLE telegram_bot_qr_drafts
  ADD COLUMN IF NOT EXISTS group_workspace_id uuid
  REFERENCES telegram_group_workspaces(id) ON DELETE RESTRICT;

ALTER TABLE telegram_bot_qr_drafts
  ADD COLUMN IF NOT EXISTS workspace_version integer;

COMMIT;

-- Both rows must appear after the transaction commits.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'telegram_bot_qr_drafts'
  AND column_name IN ('group_workspace_id', 'workspace_version')
ORDER BY column_name;
