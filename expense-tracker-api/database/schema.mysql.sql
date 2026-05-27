CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL,
  email VARCHAR(190) NULL,
  name VARCHAR(120) NULL,
  password_hash VARCHAR(255) NULL,
  telegram_user_id VARCHAR(32) NULL,
  telegram_username VARCHAR(80) NULL,
  telegram_photo_url VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  email_verified_at DATETIME NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE INDEX uq_users_email (email),
  UNIQUE INDEX uq_users_telegram_user_id (telegram_user_id)
);

CREATE TABLE IF NOT EXISTS expense_tracker_records (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  range_mode VARCHAR(16) NOT NULL,
  budget LONGTEXT NOT NULL,
  expense_rows LONGTEXT NOT NULL,
  raw_text TEXT NULL,
  summary LONGTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  INDEX idx_expense_tracker_records_user_id (user_id),
  INDEX idx_expense_tracker_records_created_at (created_at),
  CONSTRAINT fk_expense_tracker_records_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
);
