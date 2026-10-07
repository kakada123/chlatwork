-- Review and run manually before deploying link warnings to an existing alerts table.
-- Existing records retain their infected-file wording. No stored message contents are added.
BEGIN;

ALTER TABLE telegram_business_security_alerts
  ADD COLUMN IF NOT EXISTS threat_kind VARCHAR(24) NOT NULL DEFAULT 'infected_file',
  ADD COLUMN IF NOT EXISTS notified_threat_kind VARCHAR(24);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'telegram_business_security_alerts'::regclass
      AND conname = 'telegram_business_security_alerts_threat_kind_check') THEN
    ALTER TABLE telegram_business_security_alerts
      ADD CONSTRAINT telegram_business_security_alerts_threat_kind_check
      CHECK (threat_kind IN ('infected_file', 'unsafe_link', 'suspicious_link'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'telegram_business_security_alerts'::regclass
      AND conname = 'telegram_business_security_alerts_notified_threat_kind_check') THEN
    ALTER TABLE telegram_business_security_alerts
      ADD CONSTRAINT telegram_business_security_alerts_notified_threat_kind_check
      CHECK (notified_threat_kind IN ('infected_file', 'unsafe_link', 'suspicious_link'));
  END IF;
END $$;

-- Preserve delivered legacy alerts so the upgrade does not resend every old warning.
UPDATE telegram_business_security_alerts SET notified_threat_kind = 'infected_file'
  WHERE notified_threat_kind IS NULL AND alert_message_id IS NOT NULL
    AND notified_decision IS NOT DISTINCT FROM decision;

COMMIT;
