-- Review and apply manually before deploying the new Creator translation tools.
-- Requires 2026-09-04-create-creator-ai.sql and 2026-09-09-add-creator-telegram-bot.sql.
-- Run the enum additions in autocommit mode: PostgreSQL must commit new enum
-- values before they can be used by the CHECK constraints below.
ALTER TYPE "AiFeature" ADD VALUE IF NOT EXISTS 'KHMER_TO_LATIN';
ALTER TYPE "AiFeature" ADD VALUE IF NOT EXISTS 'KHMER_TO_ENGLISH';
ALTER TYPE "AiFeature" ADD VALUE IF NOT EXISTS 'LATIN_TO_ENGLISH';
ALTER TYPE "AiFeature" ADD VALUE IF NOT EXISTS 'ENGLISH_TO_LATIN';

BEGIN;

-- Expand the original allowlists atomically; keep every existing chat and request.
ALTER TABLE creator_telegram_chats
  DROP CONSTRAINT IF EXISTS creator_telegram_chats_feature_check,
  ADD CONSTRAINT creator_telegram_chats_feature_check CHECK (feature IN (
    'KHMER_GRAMMAR', 'KHMER_REWRITE', 'LATIN_TO_KHMER', 'HUMANIZE',
    'KHMER_TO_LATIN', 'KHMER_TO_ENGLISH', 'LATIN_TO_ENGLISH', 'ENGLISH_TO_LATIN'
  ));

ALTER TABLE creator_telegram_requests
  DROP CONSTRAINT IF EXISTS creator_telegram_requests_feature_check,
  ADD CONSTRAINT creator_telegram_requests_feature_check CHECK (feature IN (
    'KHMER_GRAMMAR', 'KHMER_REWRITE', 'LATIN_TO_KHMER', 'HUMANIZE',
    'KHMER_TO_LATIN', 'KHMER_TO_ENGLISH', 'LATIN_TO_ENGLISH', 'ENGLISH_TO_LATIN'
  ));

COMMIT;
