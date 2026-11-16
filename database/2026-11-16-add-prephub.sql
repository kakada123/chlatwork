-- PrepHub: additive schema only. Review and execute manually; no existing data is changed.
BEGIN;

-- CreateTable
CREATE TABLE "preparation_subjects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000) NOT NULL DEFAULT '',
    "category" VARCHAR(20) NOT NULL DEFAULT 'OTHER',
    "goal" VARCHAR(4000) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "previous_status" VARCHAR(20),
    "priority" VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
    "event_at" TIMESTAMPTZ,
    "deadline_at" TIMESTAMPTZ,
    "schedule_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "preparation_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparation_sections" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "preparation_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparation_items" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "content" VARCHAR(20000) NOT NULL DEFAULT '',
    "objective" VARCHAR(4000) NOT NULL DEFAULT '',
    "findings" VARCHAR(20000) NOT NULL DEFAULT '',
    "sources" VARCHAR(8000) NOT NULL DEFAULT '',
    "conclusion" VARCHAR(8000) NOT NULL DEFAULT '',
    "url" VARCHAR(2048) NOT NULL DEFAULT '',
    "label" VARCHAR(80) NOT NULL DEFAULT '',
    "status" VARCHAR(24) NOT NULL DEFAULT 'TO_RESEARCH',
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "due_at" TIMESTAMPTZ,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "preparation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparation_resources" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "extension" VARCHAR(8) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preparation_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparation_reminders" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "remind_at" TIMESTAMPTZ NOT NULL,
    "dismissed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preparation_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparation_history" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "action" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preparation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preparation_subjects_user_id_status_updated_at_idx" ON "preparation_subjects"("user_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "preparation_subjects_user_id_schedule_at_idx" ON "preparation_subjects"("user_id", "schedule_at");

-- CreateIndex
CREATE INDEX "preparation_sections_subject_id_sort_order_idx" ON "preparation_sections"("subject_id", "sort_order");

-- CreateIndex
CREATE INDEX "preparation_items_section_id_sort_order_idx" ON "preparation_items"("section_id", "sort_order");

-- CreateIndex
CREATE INDEX "preparation_resources_section_id_idx" ON "preparation_resources"("section_id");

-- CreateIndex
CREATE INDEX "preparation_reminders_subject_id_remind_at_idx" ON "preparation_reminders"("subject_id", "remind_at");

-- CreateIndex
CREATE INDEX "preparation_reminders_dismissed_at_remind_at_idx" ON "preparation_reminders"("dismissed_at", "remind_at");

-- CreateIndex
CREATE INDEX "preparation_history_subject_id_created_at_idx" ON "preparation_history"("subject_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "preparation_subjects" ADD CONSTRAINT "preparation_subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparation_sections" ADD CONSTRAINT "preparation_sections_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "preparation_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparation_items" ADD CONSTRAINT "preparation_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "preparation_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparation_resources" ADD CONSTRAINT "preparation_resources_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "preparation_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparation_reminders" ADD CONSTRAINT "preparation_reminders_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "preparation_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparation_history" ADD CONSTRAINT "preparation_history_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "preparation_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Defense in depth for writes performed outside the application.
ALTER TABLE "preparation_subjects" ADD CONSTRAINT "preparation_subjects_category_check" CHECK (category IN ('RESEARCH','MEETING','PROJECT','EVENT','VIDEO','TRAVEL','PERSONAL','OTHER'));
ALTER TABLE "preparation_subjects" ADD CONSTRAINT "preparation_subjects_status_check" CHECK (status IN ('DRAFT','PREPARING','READY','COMPLETED','ARCHIVED'));
ALTER TABLE "preparation_subjects" ADD CONSTRAINT "preparation_subjects_priority_check" CHECK (priority IN ('LOW','NORMAL','HIGH'));
ALTER TABLE "preparation_sections" ADD CONSTRAINT "preparation_sections_type_check" CHECK (type IN ('CHECKLIST','RESEARCH','NOTES','LINKS','ATTACHMENTS','QUESTIONS','AGENDA','DELIVERABLES'));
ALTER TABLE "preparation_resources" ADD CONSTRAINT "preparation_resources_size_check" CHECK (file_size > 0 AND file_size <= 5242880 AND octet_length(data) = file_size);
ALTER TABLE "preparation_items" ADD CONSTRAINT "preparation_items_status_check" CHECK (status IN ('TO_RESEARCH','RESEARCHING','ANSWERED','NEEDS_VERIFICATION'));
COMMIT;
