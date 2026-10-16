-- Review and execute manually after 2026-10-16-add-shared-telegram-bot-admin.sql.
-- No existing votes, wallets, QR images, group rosters or split records are deleted.
BEGIN;

ALTER TABLE telegram_bot_profiles ADD COLUMN IF NOT EXISTS manager_requested_at timestamptz;

CREATE TABLE IF NOT EXISTS telegram_group_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id bigint UNIQUE NOT NULL CHECK (telegram_chat_id < 0),
  title varchar(120) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telegram_group_connections (
  workspace_id uuid NOT NULL REFERENCES telegram_group_workspaces(id) ON DELETE RESTRICT,
  bot varchar(16) NOT NULL CHECK (bot IN ('CREATOR', 'CHLATWORK')),
  enabled boolean NOT NULL DEFAULT TRUE,
  health varchar(24) NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (health IN ('CONNECTED', 'UNVERIFIED', 'DISCONNECTED', 'MISSING_PERMISSIONS')),
  voting boolean NOT NULL DEFAULT FALSE,
  split boolean NOT NULL DEFAULT FALSE,
  khqr boolean NOT NULL DEFAULT FALSE,
  creator boolean NOT NULL DEFAULT FALSE,
  version integer NOT NULL DEFAULT 0,
  last_verified_at timestamptz,
  PRIMARY KEY (workspace_id, bot)
);

-- Discovery candidates are not permission grants. Every management request checks
-- the current Telegram role again, including when an old candidate was demoted.
CREATE TABLE IF NOT EXISTS telegram_group_managers (
  workspace_id uuid NOT NULL REFERENCES telegram_group_workspaces(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS telegram_group_managers_user_idx ON telegram_group_managers(user_id);

CREATE TABLE IF NOT EXISTS telegram_group_chat_aliases (
  telegram_chat_id bigint PRIMARY KEY CHECK (telegram_chat_id < 0),
  workspace_id uuid NOT NULL REFERENCES telegram_group_workspaces(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS telegram_group_chat_aliases_workspace_idx ON telegram_group_chat_aliases(workspace_id);

CREATE TABLE IF NOT EXISTS telegram_group_connect_requests (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL CHECK (telegram_user_id > 0),
  bot varchar(16) NOT NULL CHECK (bot IN ('CREATOR', 'CHLATWORK')),
  request_id integer NOT NULL CHECK (request_id > 0),
  nonce_hash varchar(64) UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  connected_chat_id bigint,
  workspace_id uuid REFERENCES telegram_group_workspaces(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (bot, telegram_user_id, request_id)
);
CREATE INDEX IF NOT EXISTS telegram_group_connect_requests_expiry_idx ON telegram_group_connect_requests(expires_at);

CREATE TABLE IF NOT EXISTS telegram_group_audit (
  id bigserial PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES telegram_group_workspaces(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  telegram_user_id bigint,
  bot varchar(16) CHECK (bot IN ('CREATOR', 'CHLATWORK')),
  action varchar(40) NOT NULL,
  operation_key varchar(160) UNIQUE NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS telegram_group_audit_workspace_idx
  ON telegram_group_audit(workspace_id, created_at DESC);

ALTER TABLE moments ADD COLUMN IF NOT EXISTS group_workspace_id uuid
  REFERENCES telegram_group_workspaces(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS moments_group_workspace_id_key ON moments(group_workspace_id);

-- Preserve active known group configurations, but do not treat roster-only
-- observations as consent to enable a connection for unapproved participants.
DO $backfill$
BEGIN
IF NOT EXISTS (SELECT 1 FROM telegram_bot_admin_migrations WHERE name='group-workspaces-initial-backfill') THEN
WITH chats AS (
  SELECT telegram_chat_id FROM telegram_group_members WHERE telegram_chat_id < 0
  UNION SELECT telegram_chat_id FROM moment_vote_schedules WHERE telegram_chat_id < 0
  UNION SELECT telegram_chat_id FROM moment_vote_rounds WHERE telegram_chat_id < 0
  UNION SELECT telegram_chat_id FROM telegram_quick_split_sessions WHERE telegram_chat_id < 0
)
INSERT INTO telegram_group_workspaces(telegram_chat_id, title)
SELECT chats.telegram_chat_id,
  COALESCE(NULLIF(schedule.telegram_chat_title, ''), 'Telegram group ' || chats.telegram_chat_id::text)
FROM chats LEFT JOIN moment_vote_schedules schedule USING (telegram_chat_id)
ON CONFLICT DO NOTHING;

INSERT INTO telegram_group_connections(workspace_id, bot, enabled, health, voting, split, khqr)
SELECT w.id, 'CHLATWORK', TRUE,
  CASE WHEN schedule.id IS NULL THEN 'UNVERIFIED' ELSE 'CONNECTED' END,
  TRUE, TRUE, TRUE
FROM telegram_group_workspaces w
LEFT JOIN moment_vote_schedules schedule ON schedule.telegram_chat_id = w.telegram_chat_id
ON CONFLICT DO NOTHING;

INSERT INTO telegram_group_chat_aliases(telegram_chat_id, workspace_id)
SELECT telegram_chat_id, id FROM telegram_group_workspaces ON CONFLICT DO NOTHING;

UPDATE moments m SET group_workspace_id = w.id
FROM moment_vote_schedules s JOIN telegram_group_workspaces w ON w.telegram_chat_id = s.telegram_chat_id
WHERE m.id = s.moment_id AND m.group_workspace_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM moments other WHERE other.group_workspace_id = w.id);

INSERT INTO telegram_group_managers(workspace_id, user_id)
SELECT w.id, m.creator_id
FROM telegram_group_workspaces w JOIN moments m ON m.group_workspace_id = w.id
ON CONFLICT DO NOTHING;

INSERT INTO telegram_bot_admin_migrations(name) VALUES ('group-workspaces-initial-backfill');
END IF;
END $backfill$;

-- Preserve requests that predate the separated manager/member flow. This update
-- happens once; later ordinary members must never become pending managers on rerun.
WITH migration AS (
  INSERT INTO telegram_bot_admin_migrations(name) VALUES ('manager-request-queue-backfill')
  ON CONFLICT DO NOTHING RETURNING name
)
UPDATE telegram_bot_profiles SET manager_requested_at = created_at
WHERE status = 'PENDING' AND manager_requested_at IS NULL
  AND EXISTS (SELECT 1 FROM migration);

ALTER TABLE telegram_bot_qr_drafts ADD COLUMN IF NOT EXISTS group_workspace_id uuid REFERENCES telegram_group_workspaces(id) ON DELETE RESTRICT;
ALTER TABLE telegram_bot_qr_drafts ADD COLUMN IF NOT EXISTS workspace_version integer;

COMMIT;
