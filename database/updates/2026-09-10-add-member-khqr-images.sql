BEGIN;

-- Small member QR images live in PostgreSQL so deployment filesystems are not
-- an upload dependency. A member-specific override never replaces another alias.
CREATE TABLE IF NOT EXISTS member_khqr_images (
  member_key VARCHAR(32) PRIMARY KEY CHECK (member_key ~ '^[a-z0-9_]{1,32}$'),
  content BYTEA NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 2097152),
  version VARCHAR(64) NOT NULL CHECK (version ~ '^[0-9a-f]{64}$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
