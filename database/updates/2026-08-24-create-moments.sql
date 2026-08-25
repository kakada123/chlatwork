-- ChlatWork Moments V1. Review and run this file manually against PostgreSQL.
-- The update is additive and does not modify or delete existing data.

BEGIN;

CREATE TYPE "MomentOccasion" AS ENUM (
  'ANNIVERSARY', 'BIRTHDAY', 'LOVE', 'FRIENDSHIP', 'GRADUATION', 'WEDDING',
  'BABY', 'MOTHERS_DAY', 'FATHERS_DAY', 'HOLIDAY', 'FAREWELL', 'OTHER'
);

CREATE TYPE "MomentTheme" AS ENUM ('ROMANTIC', 'CUTE', 'MINIMAL', 'ELEGANT');
CREATE TYPE "MomentStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "MomentVisibility" AS ENUM ('UNLISTED');
CREATE TYPE "MomentBlockType" AS ENUM ('HERO', 'MESSAGE', 'GALLERY', 'COUNTER', 'SECRET');

CREATE TABLE "moments" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(96) NOT NULL,
  "creator_id" UUID NOT NULL,
  "recipient_name" VARCHAR(80) NOT NULL,
  "occasion" "MomentOccasion" NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "theme" "MomentTheme" NOT NULL,
  "status" "MomentStatus" NOT NULL DEFAULT 'DRAFT',
  "visibility" "MomentVisibility" NOT NULL DEFAULT 'UNLISTED',
  "publish_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "moments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moments_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "moment_blocks" (
  "id" UUID NOT NULL,
  "moment_id" UUID NOT NULL,
  "type" "MomentBlockType" NOT NULL,
  "position" INTEGER NOT NULL,
  "data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "moment_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moment_blocks_moment_id_fkey" FOREIGN KEY ("moment_id") REFERENCES "moments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "moment_media" (
  "id" UUID NOT NULL,
  "moment_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "mime_type" VARCHAR(32) NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "original_name" VARCHAR(180) NOT NULL,
  "storage_key" VARCHAR(500),
  "content" BYTEA,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moment_media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moment_media_moment_id_fkey" FOREIGN KEY ("moment_id") REFERENCES "moments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "moments_slug_key" ON "moments"("slug");
CREATE INDEX "moments_creator_id_status_created_at_idx" ON "moments"("creator_id", "status", "created_at" DESC);
CREATE INDEX "moments_status_publish_at_idx" ON "moments"("status", "publish_at");
CREATE UNIQUE INDEX "moment_blocks_moment_id_position_key" ON "moment_blocks"("moment_id", "position");
CREATE UNIQUE INDEX "moment_media_moment_id_position_key" ON "moment_media"("moment_id", "position");

COMMIT;
