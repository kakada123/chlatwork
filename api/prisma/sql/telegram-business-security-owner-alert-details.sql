-- Review and run manually before deploying detailed owner security reports.
-- Requires the original alerts table; includes the previous finding-type upgrades.
-- Existing SQL scripts and existing alerts remain intact. No SQL runs automatically.
BEGIN;

ALTER TABLE telegram_business_security_alerts
  ADD COLUMN IF NOT EXISTS threat_kind VARCHAR(24) NOT NULL DEFAULT 'infected_file',
  ADD COLUMN IF NOT EXISTS notified_threat_kind VARCHAR(24),
  ADD COLUMN IF NOT EXISTS owner_details TEXT,
  ADD COLUMN IF NOT EXISTS owner_details_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS notified_owner_details_hash VARCHAR(64);

ALTER TABLE telegram_business_security_alerts
  DROP CONSTRAINT IF EXISTS telegram_business_security_alerts_threat_kind_check,
  DROP CONSTRAINT IF EXISTS telegram_business_security_alerts_notified_threat_kind_check,
  DROP CONSTRAINT IF EXISTS telegram_business_security_alerts_owner_details_check,
  ADD CONSTRAINT telegram_business_security_alerts_threat_kind_check
    CHECK (threat_kind IN ('infected_file', 'unsafe_link', 'suspicious_link', 'suspicious_message')),
  ADD CONSTRAINT telegram_business_security_alerts_notified_threat_kind_check
    CHECK (notified_threat_kind IN ('infected_file', 'unsafe_link', 'suspicious_link', 'suspicious_message')),
  -- Private metadata must never be retained on the managed-chat outbox row.
  ADD CONSTRAINT telegram_business_security_alerts_owner_details_check CHECK (
    (owner_details IS NULL OR char_length(owner_details) <= 3000)
    AND (owner_details IS NULL) = (owner_details_hash IS NULL)
    AND (owner_details_hash IS NULL OR owner_details_hash ~ '^[0-9a-f]{64}$')
    AND (notified_owner_details_hash IS NULL OR notified_owner_details_hash ~ '^[0-9a-f]{64}$')
    AND (audience = 'owner' OR
      (owner_details IS NULL AND owner_details_hash IS NULL AND notified_owner_details_hash IS NULL))
  );

-- Legacy delivered file alerts keep their delivered state and do not get resent.
UPDATE telegram_business_security_alerts SET notified_threat_kind = 'infected_file'
  WHERE threat_kind = 'infected_file' AND notified_threat_kind IS NULL
    AND alert_message_id IS NOT NULL AND notified_decision IS NOT DISTINCT FROM decision;

COMMIT;
