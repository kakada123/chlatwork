-- Apply manually to limit new Telegram Kla Klok bets without rewriting history.
BEGIN;

ALTER TABLE telegram_kla_klok_bets
  DROP CONSTRAINT IF EXISTS telegram_kla_klok_bets_amount_riel_check;

-- NOT VALID keeps previously accepted 5,000៛ and 10,000៛ bets as valid history.
-- PostgreSQL still enforces this limit for every new or updated bet.
ALTER TABLE telegram_kla_klok_bets
  ADD CONSTRAINT telegram_kla_klok_bets_amount_riel_check
  CHECK (amount_riel IN (100, 500, 1000, 2000)) NOT VALID;

COMMIT;
