BEGIN;

CREATE TYPE "PersonalTaskStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PersonalReminderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'CANCELLED', 'FAILED');

CREATE TABLE personal_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content VARCHAR(1000) NOT NULL,
  normalized_content VARCHAR(1000),
  subject VARCHAR(160),
  category VARCHAR(80),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX personal_memories_user_created_at_idx ON personal_memories (user_id, created_at DESC);
CREATE INDEX personal_memories_user_subject_idx ON personal_memories (user_id, subject);

CREATE TABLE personal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  subject VARCHAR(160),
  status "PersonalTaskStatus" NOT NULL DEFAULT 'OPEN',
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX personal_tasks_user_status_created_at_idx ON personal_tasks (user_id, status, created_at DESC);
CREATE INDEX personal_tasks_user_subject_idx ON personal_tasks (user_id, subject);

CREATE TABLE personal_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES personal_tasks(id) ON DELETE SET NULL,
  message VARCHAR(1000) NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  status "PersonalReminderStatus" NOT NULL DEFAULT 'PENDING',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason VARCHAR(240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX personal_reminders_user_status_remind_at_idx ON personal_reminders (user_id, status, remind_at);
CREATE INDEX personal_reminders_status_next_attempt_at_remind_at_idx ON personal_reminders (status, next_attempt_at, remind_at);
CREATE INDEX personal_reminders_task_id_idx ON personal_reminders (task_id);

COMMIT;
