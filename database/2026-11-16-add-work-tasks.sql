-- CreateTable
CREATE TABLE "work_tasks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'INBOX',
    "previous_status" VARCHAR(20),
    "priority" VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
    "category" VARCHAR(80) NOT NULL DEFAULT 'General',
    "start_at" TIMESTAMPTZ,
    "due_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "archived_at" TIMESTAMPTZ,
    "estimated_minutes" INTEGER,
    "actual_minutes" INTEGER,
    "notes" VARCHAR(4000) NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" VARCHAR(2000) NOT NULL DEFAULT '',
    "contribution" VARCHAR(2000) NOT NULL DEFAULT '',
    "impact" VARCHAR(2000) NOT NULL DEFAULT '',
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" VARCHAR(1000) NOT NULL DEFAULT '',
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "work_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_subtasks" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "work_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_task_events" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_task_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(4000) NOT NULL DEFAULT '',
    "color" VARCHAR(7) NOT NULL DEFAULT '#0369a1',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "target_date" DATE,
    "notes" VARCHAR(4000) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "work_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_objectives" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000) NOT NULL DEFAULT '',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "success_criteria" VARCHAR(4000) NOT NULL DEFAULT '',
    "target_value" DECIMAL(18,4),
    "actual_value" DECIMAL(18,4),
    "metric_unit" VARCHAR(80) NOT NULL DEFAULT '',
    "verification_evidence" VARCHAR(2000) NOT NULL DEFAULT '',
    "verified_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "work_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_task_objectives" (
    "task_id" UUID NOT NULL,
    "objective_id" UUID NOT NULL,

    CONSTRAINT "work_task_objectives_pkey" PRIMARY KEY ("task_id","objective_id")
);

-- CreateTable
CREATE TABLE "work_project_objectives" (
    "project_id" UUID NOT NULL,
    "objective_id" UUID NOT NULL,

    CONSTRAINT "work_project_objectives_pkey" PRIMARY KEY ("project_id","objective_id")
);

-- CreateTable
CREATE TABLE "work_follow_ups" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "follow_up_at" TIMESTAMPTZ NOT NULL,
    "note" VARCHAR(2000) NOT NULL DEFAULT '',
    "next_action" VARCHAR(1000) NOT NULL DEFAULT '',
    "remind_at" TIMESTAMPTZ,
    "dismissed_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "work_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_attachments" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "extension" VARCHAR(8) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "employee_name" VARCHAR(160) NOT NULL DEFAULT '',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "summary" VARCHAR(4000) NOT NULL DEFAULT '',
    "challenges" VARCHAR(2000) NOT NULL DEFAULT '',
    "lessons" VARCHAR(2000) NOT NULL DEFAULT '',
    "priorities" VARCHAR(2000) NOT NULL DEFAULT '',
    "filters" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "work_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_tasks_user_id_status_due_at_idx" ON "work_tasks"("user_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "work_tasks_user_id_completed_at_idx" ON "work_tasks"("user_id", "completed_at" DESC);

-- CreateIndex
CREATE INDEX "work_tasks_user_id_updated_at_idx" ON "work_tasks"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "work_tasks_project_id_idx" ON "work_tasks"("project_id");

-- CreateIndex
CREATE INDEX "work_subtasks_task_id_sort_order_idx" ON "work_subtasks"("task_id", "sort_order");

-- CreateIndex
CREATE INDEX "work_task_events_task_id_created_at_idx" ON "work_task_events"("task_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "work_projects_user_id_status_idx" ON "work_projects"("user_id", "status");

-- CreateIndex
CREATE INDEX "work_objectives_user_id_period_start_period_end_idx" ON "work_objectives"("user_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "work_task_objectives_objective_id_idx" ON "work_task_objectives"("objective_id");

-- CreateIndex
CREATE INDEX "work_project_objectives_objective_id_idx" ON "work_project_objectives"("objective_id");

-- CreateIndex
CREATE INDEX "work_follow_ups_task_id_follow_up_at_idx" ON "work_follow_ups"("task_id", "follow_up_at");

-- CreateIndex
CREATE INDEX "work_follow_ups_resolved_at_follow_up_at_idx" ON "work_follow_ups"("resolved_at", "follow_up_at");

-- CreateIndex
CREATE INDEX "work_follow_ups_dismissed_at_remind_at_idx" ON "work_follow_ups"("dismissed_at", "remind_at");

-- CreateIndex
CREATE INDEX "work_attachments_task_id_idx" ON "work_attachments"("task_id");

-- CreateIndex
CREATE INDEX "work_reports_user_id_updated_at_idx" ON "work_reports"("user_id", "updated_at" DESC);

-- AddForeignKey
ALTER TABLE "work_tasks" ADD CONSTRAINT "work_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_tasks" ADD CONSTRAINT "work_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "work_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_subtasks" ADD CONSTRAINT "work_subtasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_task_events" ADD CONSTRAINT "work_task_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_projects" ADD CONSTRAINT "work_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_objectives" ADD CONSTRAINT "work_objectives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_task_objectives" ADD CONSTRAINT "work_task_objectives_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_task_objectives" ADD CONSTRAINT "work_task_objectives_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "work_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_project_objectives" ADD CONSTRAINT "work_project_objectives_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "work_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_project_objectives" ADD CONSTRAINT "work_project_objectives_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "work_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_follow_ups" ADD CONSTRAINT "work_follow_ups_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_attachments" ADD CONSTRAINT "work_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

