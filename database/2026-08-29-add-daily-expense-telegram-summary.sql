BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_notification_time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Phnom_Penh',
  ADD COLUMN IF NOT EXISTS telegram_daily_expense_summary_hour SMALLINT NOT NULL DEFAULT 22,
  ADD COLUMN IF NOT EXISTS telegram_daily_expense_summary_last_attempt_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_telegram_daily_expense_summary_hour_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_telegram_daily_expense_summary_hour_check
      CHECK (telegram_daily_expense_summary_hour BETWEEN 0 AND 23);
  END IF;
END
$$;

COMMIT;
