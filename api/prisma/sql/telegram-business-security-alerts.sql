-- Review and run manually before deploying Business security alerts.
-- Action tokens and recipient identifiers expire after Telegram's 48-hour deletion window.
BEGIN;

CREATE TABLE IF NOT EXISTS telegram_business_security_alerts (
  id UUID PRIMARY KEY,
  event_key VARCHAR(64) NOT NULL,
  audience VARCHAR(8) NOT NULL CHECK (audience IN ('owner', 'chat')),
  business_connection_id VARCHAR(256) NOT NULL,
  owner_user_id BIGINT NOT NULL CHECK (owner_user_id > 0),
  owner_chat_id BIGINT NOT NULL CHECK (owner_chat_id > 0),
  source_chat_id BIGINT NOT NULL CHECK (source_chat_id > 0),
  source_message_id BIGINT NOT NULL CHECK (source_message_id > 0),
  source_message_date TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  decision VARCHAR(24) NOT NULL CHECK (decision IN ('preserved', 'permission_missing', 'delete_failed', 'deleted')),
  alert_message_id BIGINT CHECK (alert_message_id > 0),
  notified_decision VARCHAR(24) CHECK (notified_decision IN ('preserved', 'permission_missing', 'delete_failed', 'deleted')),
  deleted_at TIMESTAMPTZ,
  delivery_started_at TIMESTAMPTZ,
  delivery_token UUID,
  delivery_attempts INTEGER NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
  next_delivery_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delete_started_at TIMESTAMPTZ,
  delete_token UUID,
  CONSTRAINT telegram_business_security_alerts_event_key_audience_key UNIQUE (event_key, audience),
  CHECK (expires_at > source_message_date AND expires_at <= source_message_date + INTERVAL '48 hours'),
  CHECK ((decision = 'deleted') = (deleted_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS telegram_business_security_alerts_expires_at_idx
  ON telegram_business_security_alerts (expires_at);
CREATE INDEX IF NOT EXISTS telegram_business_security_alerts_next_delivery_at_idx
  ON telegram_business_security_alerts (next_delivery_at);

COMMIT;
