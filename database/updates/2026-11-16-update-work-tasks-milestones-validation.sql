-- Incremental update for an ALREADY-created ChlatWork Tasks schema.
-- Do not rerun the original CREATE TABLE script. No rows are deleted or reset.
-- Safe after either the initial or later draft of the Tasks schema.
BEGIN;

ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN NOT NULL DEFAULT FALSE;

-- NOT VALID preserves pre-existing records; new writes are checked immediately.
-- Existing constraint names are skipped, making this update safe to re-run.
DO $tasks_update$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_tasks'::regclass AND conname = 'work_tasks_status_check') THEN
    ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_status_check CHECK (status IN ('INBOX','PLANNED','IN_PROGRESS','BLOCKED','DONE','ARCHIVED')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_tasks'::regclass AND conname = 'work_tasks_priority_check') THEN
    ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_priority_check CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_tasks'::regclass AND conname = 'work_tasks_completion_check') THEN
    ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_completion_check CHECK ((status = 'DONE' OR (status = 'ARCHIVED' AND COALESCE(previous_status, '') = 'DONE')) = (completed_at IS NOT NULL)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_tasks'::regclass AND conname = 'work_tasks_times_check') THEN
    ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_times_check CHECK ((estimated_minutes IS NULL OR estimated_minutes BETWEEN 0 AND 1000000) AND (actual_minutes IS NULL OR actual_minutes BETWEEN 0 AND 1000000)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_tasks'::regclass AND conname = 'work_tasks_arrays_check') THEN
    ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_arrays_check CHECK (cardinality(tags) <= 20 AND cardinality(evidence) <= 10) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_projects'::regclass AND conname = 'work_projects_status_check') THEN
    ALTER TABLE work_projects ADD CONSTRAINT work_projects_status_check CHECK (status IN ('ACTIVE','COMPLETED','ARCHIVED')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_objectives'::regclass AND conname = 'work_objectives_status_check') THEN
    ALTER TABLE work_objectives ADD CONSTRAINT work_objectives_status_check CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','ARCHIVED')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_objectives'::regclass AND conname = 'work_objectives_period_check') THEN
    ALTER TABLE work_objectives ADD CONSTRAINT work_objectives_period_check CHECK (period_start <= period_end) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_objectives'::regclass AND conname = 'work_objectives_verification_check') THEN
    ALTER TABLE work_objectives ADD CONSTRAINT work_objectives_verification_check CHECK (verified_at IS NULL OR (actual_value IS NOT NULL AND length(btrim(verification_evidence)) > 0)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_attachments'::regclass AND conname = 'work_attachments_size_check') THEN
    ALTER TABLE work_attachments ADD CONSTRAINT work_attachments_size_check CHECK (file_size > 0 AND file_size <= 5242880 AND octet_length(data) = file_size) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_task_events'::regclass AND conname = 'work_task_events_type_check') THEN
    ALTER TABLE work_task_events ADD CONSTRAINT work_task_events_type_check CHECK (type IN ('COMPLETED','REOPENED','COMPLETION_CORRECTED')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'work_reports'::regclass AND conname = 'work_reports_period_check') THEN
    ALTER TABLE work_reports ADD CONSTRAINT work_reports_period_check CHECK (period_start <= period_end) NOT VALID;
  END IF;
END;
$tasks_update$;

COMMIT;

-- Optional later review: list unvalidated checks without changing any data.
-- SELECT conrelid::regclass AS table_name, conname, convalidated
-- FROM pg_constraint
-- WHERE contype = 'c' AND conrelid IN ('work_tasks'::regclass, 'work_projects'::regclass,
-- 'work_objectives'::regclass, 'work_attachments'::regclass, 'work_task_events'::regclass, 'work_reports'::regclass);
-- Validate each check only after reviewing existing rows, for example:
-- ALTER TABLE work_tasks VALIDATE CONSTRAINT work_tasks_completion_check;
