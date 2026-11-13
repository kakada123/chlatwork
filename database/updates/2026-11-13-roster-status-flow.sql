-- Run manually before deploying the API that uses statusFlowEnabled.
-- Existing assignments and leave balances are preserved.
BEGIN;

ALTER TABLE roster_preferences
  ADD COLUMN IF NOT EXISTS status_flow_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN roster_preferences.status_flow_enabled IS
  'False: saved assignments are immediately confirmed. True: enable the draft/requested/confirmed/cancelled workflow.';

COMMIT;
