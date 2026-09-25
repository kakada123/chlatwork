-- Apply manually before enabling the Telegram Kla Klok group feature.
BEGIN;

CREATE TABLE IF NOT EXISTS telegram_kla_klok_games (
  id UUID PRIMARY KEY,
  telegram_chat_id BIGINT NOT NULL,
  telegram_chat_title VARCHAR(120) NOT NULL,
  dealer_telegram_user_id VARCHAR(20) NOT NULL,
  dealer_display_name VARCHAR(80) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ENDED', 'CANCELLED')),
  current_round INTEGER NOT NULL DEFAULT 1 CHECK (current_round > 0),
  group_message_id INTEGER,
  dealer_message_id INTEGER,
  summary_message_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS telegram_kla_klok_one_open_game_per_group
  ON telegram_kla_klok_games (telegram_chat_id)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS telegram_kla_klok_games_chat_status_created_idx
  ON telegram_kla_klok_games (telegram_chat_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS telegram_kla_klok_games_dealer_created_idx
  ON telegram_kla_klok_games (dealer_telegram_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_kla_klok_rounds (
  id UUID PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES telegram_kla_klok_games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  die_one VARCHAR(16) NOT NULL
    CHECK (die_one IN ('tiger', 'gourd', 'rooster', 'shrimp', 'crab', 'fish')),
  die_two VARCHAR(16) NOT NULL
    CHECK (die_two IN ('tiger', 'gourd', 'rooster', 'shrimp', 'crab', 'fish')),
  die_three VARCHAR(16) NOT NULL
    CHECK (die_three IN ('tiger', 'gourd', 'rooster', 'shrimp', 'crab', 'fish')),
  total_stake_riel BIGINT NOT NULL CHECK (total_stake_riel >= 100),
  dealer_net_riel BIGINT NOT NULL,
  result_message_id INTEGER,
  rolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, round_number)
);

CREATE TABLE IF NOT EXISTS telegram_kla_klok_bets (
  id UUID PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES telegram_kla_klok_games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number > 0),
  telegram_user_id VARCHAR(20) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  symbol VARCHAR(16) NOT NULL
    CHECK (symbol IN ('tiger', 'gourd', 'rooster', 'shrimp', 'crab', 'fish')),
  amount_riel BIGINT NOT NULL
    CHECK (amount_riel IN (100, 500, 1000, 5000, 10000)),
  match_count INTEGER CHECK (match_count BETWEEN 0 AND 3),
  net_riel BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, round_number, telegram_user_id, symbol),
  CHECK ((match_count IS NULL AND net_riel IS NULL)
    OR (match_count IS NOT NULL AND net_riel IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS telegram_kla_klok_bets_game_round_created_idx
  ON telegram_kla_klok_bets (game_id, round_number, created_at);

CREATE INDEX IF NOT EXISTS telegram_kla_klok_bets_user_created_idx
  ON telegram_kla_klok_bets (telegram_user_id, created_at DESC);

COMMIT;
