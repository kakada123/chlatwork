-- Run this whole file manually against the API's PostgreSQL database.
-- Deletes the old "Help us choose" poll and clears BOTH polls' voting history.
-- Keeps the main "Lunch timeee" poll, all its blocks/options/images, workspace,
-- and daily schedule (including its existing attempt/send state).
-- Existing financial splits remain; their deleted vote-round link becomes NULL.
-- Already-sent Telegram messages are not removed by database cleanup.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Briefly stop competing poll/history writes so cleanup is atomic with voting
-- and scheduler activity. A busy database aborts instead of waiting indefinitely.
LOCK TABLE public.moments, public.moment_votes, public.moment_vote_rounds,
  public.moment_vote_schedules IN SHARE ROW EXCLUSIVE MODE;

SELECT m.id, m.title,
  (SELECT COUNT(*) FROM public.moment_votes v WHERE v.moment_id = m.id) AS votes_before,
  (SELECT COUNT(*) FROM public.moment_vote_rounds r WHERE r.moment_id = m.id) AS rounds_before,
  (SELECT COUNT(*) FROM public.moment_media p WHERE p.moment_id = m.id) AS images_before
FROM public.moments m
WHERE m.id IN (
  'c7aa21b2-00b3-4c9c-af9c-d837c8ad21ae'::uuid,
  'ace6e17e-8c7a-4226-8343-f41c799e6844'::uuid
)
ORDER BY m.id;

DO $cleanup$
DECLARE
  old_id CONSTANT uuid := 'c7aa21b2-00b3-4c9c-af9c-d837c8ad21ae';
  main_id CONSTANT uuid := 'ace6e17e-8c7a-4226-8343-f41c799e6844';
  main_owner uuid;
  deleted_votes bigint;
  deleted_rounds bigint;
  deleted_polls bigint;
BEGIN
  -- Fail closed if this is the wrong database or the group binding changed.
  SELECT creator_id INTO main_owner
  FROM public.moments
  WHERE id = main_id AND occasion = 'VOTING'
    AND group_workspace_id = '54cd9131-d1ac-44be-9dfa-2037e71c69ac'::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expected main Lunch time group poll not found; nothing deleted';
  END IF;

  -- The old poll may already be absent on a rerun, but never delete a different
  -- owner's poll or a poll that has since been assigned to a workspace.
  IF EXISTS (
    SELECT 1 FROM public.moments
    WHERE id = old_id AND (
      creator_id IS DISTINCT FROM main_owner
      OR occasion <> 'VOTING'
      OR title <> '🗳️ Help us choose, ញ៉ាំបាយថ្ងៃនៅណា?!'
      OR group_workspace_id IS NOT NULL
    )
  ) THEN
    RAISE EXCEPTION 'Old poll identity changed; nothing deleted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.moment_blocks
    WHERE moment_id = main_id AND type = 'POLL'
  ) THEN
    RAISE EXCEPTION 'Main poll choices not found; nothing deleted';
  END IF;

  DELETE FROM public.moment_votes WHERE moment_id IN (old_id, main_id);
  GET DIAGNOSTICS deleted_votes = ROW_COUNT;

  -- Round members cascade with rounds. Financial split records are retained
  -- through the schema's ON DELETE SET NULL relation to a voting round.
  DELETE FROM public.moment_vote_rounds WHERE moment_id IN (old_id, main_id);
  GET DIAGNOSTICS deleted_rounds = ROW_COUNT;

  -- Cascades remove only the OLD poll's remaining blocks, media and responses.
  DELETE FROM public.moments WHERE id = old_id;
  GET DIAGNOSTICS deleted_polls = ROW_COUNT;

  RAISE NOTICE 'Deleted % votes, % rounds and % old polls; main poll retained',
    deleted_votes, deleted_rounds, deleted_polls;
END;
$cleanup$;

SELECT m.id, m.title, m.group_workspace_id,
  (SELECT COUNT(*) FROM public.moment_votes v WHERE v.moment_id = m.id) AS votes_after,
  (SELECT COUNT(*) FROM public.moment_vote_rounds r WHERE r.moment_id = m.id) AS rounds_after,
  (SELECT COUNT(*) FROM public.moment_media p WHERE p.moment_id = m.id) AS images_after
FROM public.moments m
WHERE m.id IN (
  'c7aa21b2-00b3-4c9c-af9c-d837c8ad21ae'::uuid,
  'ace6e17e-8c7a-4226-8343-f41c799e6844'::uuid
);

COMMIT;
