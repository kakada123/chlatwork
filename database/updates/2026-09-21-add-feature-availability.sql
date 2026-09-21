-- Apply manually before deploying availability controls. Missing rows remain enabled.
BEGIN;

CREATE TABLE IF NOT EXISTS feature_availability (
  key varchar(100) PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
