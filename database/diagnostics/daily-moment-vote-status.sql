-- Run manually in the database used by the API. This query changes no data.
-- Change only the group title below. No voter names, account data or secrets
-- are selected. Duplicate titles intentionally return separate schedules.
WITH target AS (
  SELECT 'Lunch time'::text AS group_title
), schedules AS (
  SELECT s.*, m.status AS moment_status, m.publish_at, m.expires_at,
    m.group_workspace_id AS bound_workspace_id,
    w.id AS workspace_id, w.title AS group_title, w.status AS workspace_status,
    c.enabled AS connection_enabled, c.health, c.voting,
    EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name = s.time_zone) AS valid_timezone,
    COALESCE((SELECT enabled FROM feature_availability WHERE key = 'telegram:group-voting'), TRUE) AS platform_group_voting,
    COALESCE((SELECT enabled FROM feature_availability WHERE key = 'telegram:voting'), TRUE) AS platform_voting
  FROM moment_vote_schedules s
  JOIN moments m ON m.id = s.moment_id
  LEFT JOIN telegram_group_workspaces w ON w.telegram_chat_id = s.telegram_chat_id
  LEFT JOIN telegram_group_connections c ON c.workspace_id = w.id AND c.bot = 'CHLATWORK'
  CROSS JOIN target
  WHERE w.title = target.group_title OR s.telegram_chat_title = target.group_title
), local_schedules AS (
  SELECT s.*, CURRENT_TIMESTAMP AT TIME ZONE
    (CASE WHEN valid_timezone THEN time_zone ELSE 'UTC' END) AS local_now
  FROM schedules s
)
SELECT s.id AS schedule_id, s.workspace_id,
  COALESCE(s.group_title, s.telegram_chat_title) AS group_title,
  s.time_zone, s.local_now, s.send_hour, s.send_minute,
  s.enabled AS schedule_enabled, s.moment_status, s.publish_at, s.expires_at,
  s.workspace_status, s.connection_enabled, s.health, s.voting,
  s.platform_group_voting, s.platform_voting,
  s.last_attempt_date, s.last_sent_at,
  today.id AS today_round_id, today.message_id AS today_message_id,
  today.closes_at AS today_closes_at, today.finalized_at AS today_finalized_at,
  history.last_round_date, history.rounds_since_oct_16,
  -- An empty blockers array means the database permits a daily claim; it does
  -- not prove the API worker is running or Telegram currently permits sending.
  array_remove(ARRAY[
    CASE WHEN NOT s.valid_timezone THEN 'INVALID_TIMEZONE' END,
    CASE WHEN NOT s.enabled THEN 'SCHEDULE_DISABLED' END,
    CASE WHEN s.moment_status::text <> 'PUBLISHED' THEN 'POLL_NOT_PUBLISHED' END,
    CASE WHEN s.publish_at > CURRENT_TIMESTAMP THEN 'POLL_NOT_OPEN_YET' END,
    CASE WHEN s.expires_at <= CURRENT_TIMESTAMP THEN 'POLL_EXPIRED' END,
    CASE WHEN s.workspace_id IS NULL THEN 'WORKSPACE_MISSING' END,
    CASE WHEN s.bound_workspace_id IS DISTINCT FROM s.workspace_id THEN 'POLL_WORKSPACE_MISMATCH' END,
    CASE WHEN s.workspace_status <> 'ACTIVE' THEN 'WORKSPACE_SUSPENDED' END,
    CASE WHEN s.connection_enabled IS NULL THEN 'CONNECTION_MISSING'
         WHEN NOT s.connection_enabled THEN 'CONNECTION_DISABLED' END,
    CASE WHEN s.health <> 'CONNECTED' THEN 'CONNECTION_NEEDS_REPAIR' END,
    CASE WHEN s.voting = FALSE THEN 'GROUP_VOTING_DISABLED' END,
    CASE WHEN NOT s.platform_group_voting THEN 'PLATFORM_GROUP_VOTING_DISABLED' END,
    CASE WHEN NOT s.platform_voting THEN 'PLATFORM_VOTING_DISABLED' END,
    CASE WHEN s.local_now::time < make_time(s.send_hour, s.send_minute, 0)
         THEN 'BEFORE_SEND_TIME' END,
    CASE WHEN s.last_attempt_date >= s.local_now::date THEN 'ALREADY_ATTEMPTED_TODAY' END
  ], NULL) AS database_blockers
FROM local_schedules s
LEFT JOIN moment_vote_rounds today
  ON today.moment_id = s.moment_id AND today.vote_date = s.local_now::date
LEFT JOIN LATERAL (
  SELECT MAX(r.vote_date) AS last_round_date,
    COUNT(*) FILTER (WHERE r.vote_date >= DATE '2026-10-16') AS rounds_since_oct_16
  FROM moment_vote_rounds r WHERE r.moment_id = s.moment_id
) history ON TRUE
ORDER BY s.id;
