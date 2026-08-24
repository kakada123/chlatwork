BEGIN;

CREATE TABLE IF NOT EXISTS tool_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "toolKey" VARCHAR(100) NOT NULL,
  event VARCHAR(20) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tool_usage_events_event_check CHECK (event IN ('OPEN', 'COMPLETE'))
);

CREATE INDEX IF NOT EXISTS tool_usage_events_user_tool_created_idx
  ON tool_usage_events ("userId", "toolKey", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS tool_usage_events_user_created_idx
  ON tool_usage_events ("userId", "createdAt" DESC);

COMMIT;
