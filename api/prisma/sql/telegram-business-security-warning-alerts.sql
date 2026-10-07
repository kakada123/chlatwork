-- Review and run manually before deploying moderate-risk security warnings.
-- Supports the original alerts table and tables already upgraded for link alerts.
-- Existing SQL scripts remain unchanged; no alert records or message contents are deleted.
BEGIN;

ALTER TABLE telegram_business_security_alerts
  ADD COLUMN IF NOT EXISTS threat_kind VARCHAR(24) NOT NULL DEFAULT 'infected_file',
  ADD COLUMN IF NOT EXISTS notified_threat_kind VARCHAR(24);

-- Expand the finding type without losing existing infected-file or link alerts.
ALTER TABLE telegram_business_security_alerts
  DROP CONSTRAINT IF EXISTS telegram_business_security_alerts_threat_kind_check,
  DROP CONSTRAINT IF EXISTS telegram_business_security_alerts_notified_threat_kind_check,
  ADD CONSTRAINT telegram_business_security_alerts_threat_kind_check
    CHECK (threat_kind IN ('infected_file', 'unsafe_link', 'suspicious_link', 'suspicious_message')),
  ADD CONSTRAINT telegram_business_security_alerts_notified_threat_kind_check
    CHECK (notified_threat_kind IN ('infected_file', 'unsafe_link', 'suspicious_link', 'suspicious_message'));

-- Mark only already-delivered legacy file alerts so upgrading does not resend them.
UPDATE telegram_business_security_alerts SET notified_threat_kind = 'infected_file'
  WHERE threat_kind = 'infected_file' AND notified_threat_kind IS NULL
    AND alert_message_id IS NOT NULL AND notified_decision IS NOT DISTINCT FROM decision;

COMMIT;
