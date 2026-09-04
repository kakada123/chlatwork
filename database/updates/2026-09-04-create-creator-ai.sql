BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "AiFeature" AS ENUM (
    'POST', 'SCRIPT', 'HOOK', 'CONTENT_IDEAS', 'KHMER_GRAMMAR',
    'KHMER_REWRITE', 'LATIN_TO_KHMER', 'HUMANIZE', 'FACEBOOK_TO_TIKTOK',
    'LONG_TO_SHORT', 'VIDEO_SUBTITLE', 'VIDEO_CAPTION', 'VIDEO_SUMMARY',
    'VIDEO_CONTENT_PACK', 'VIDEO_TO_SOCIAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AiCreditTransactionType" AS ENUM (
    'GRANT', 'RESERVE', 'CHARGE', 'REFUND', 'PURCHASE', 'EXPIRE',
    'ADMIN_ADJUSTMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AiGenerationStatus" AS ENUM ('RESERVED', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AiUsageStatus" AS ENUM ('SUCCEEDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AiVideoJobStatus" AS ENUM (
    'QUEUED', 'PROCESSING', 'TRANSCRIBING', 'CLEANING', 'GENERATING',
    'COMPLETED', 'FAILED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ai_wallets (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature "AiFeature" NOT NULL,
  idempotency_key varchar(128) NOT NULL,
  request_hash char(64) NOT NULL,
  input_summary varchar(160),
  status "AiGenerationStatus" NOT NULL DEFAULT 'RESERVED',
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  estimated_provider_cost_usd numeric(12, 6) NOT NULL DEFAULT 0 CHECK (estimated_provider_cost_usd >= 0),
  result jsonb,
  error_code varchar(64),
  provider_request_id varchar(128),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT uq_ai_generations_idempotency UNIQUE (user_id, feature, idempotency_key)
);

CREATE TABLE IF NOT EXISTS ai_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type "AiCreditTransactionType" NOT NULL,
  amount integer NOT NULL,
  feature "AiFeature",
  reference_id varchar(128) NOT NULL,
  balance_before integer NOT NULL CHECK (balance_before >= 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_credit_transactions_reference UNIQUE (user_id, type, reference_id)
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL UNIQUE REFERENCES ai_generations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature "AiFeature" NOT NULL,
  provider varchar(32) NOT NULL,
  model varchar(80) NOT NULL,
  input_tokens integer,
  cached_input_tokens integer,
  output_tokens integer,
  audio_seconds integer,
  credits_charged integer NOT NULL CHECK (credits_charged >= 0),
  estimated_provider_cost_usd numeric(12, 6) NOT NULL DEFAULT 0 CHECK (estimated_provider_cost_usd >= 0),
  provider_request_id varchar(128),
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  status "AiUsageStatus" NOT NULL,
  error_code varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL UNIQUE REFERENCES ai_generations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature "AiFeature" NOT NULL,
  status "AiVideoJobStatus" NOT NULL DEFAULT 'QUEUED',
  stage varchar(32) NOT NULL DEFAULT 'QUEUED',
  original_name varchar(180) NOT NULL,
  mime_type varchar(64) NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  temp_file_path varchar(500),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  error_code varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_ai_credit_transactions_user_created
  ON ai_credit_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_credit_transactions_reference
  ON ai_credit_transactions (reference_id);
CREATE INDEX IF NOT EXISTS ix_ai_generations_user_created
  ON ai_generations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_generations_user_feature_created
  ON ai_generations (user_id, feature, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_generations_status_created
  ON ai_generations (status, created_at);
CREATE INDEX IF NOT EXISTS ix_ai_usage_logs_user_created
  ON ai_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_usage_logs_feature_created
  ON ai_usage_logs (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_usage_logs_status_created
  ON ai_usage_logs (status, created_at);
CREATE INDEX IF NOT EXISTS ix_ai_video_jobs_user_created
  ON ai_video_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_video_jobs_user_status
  ON ai_video_jobs (user_id, status);
CREATE INDEX IF NOT EXISTS ix_ai_video_jobs_status_created
  ON ai_video_jobs (status, created_at);

COMMIT;
