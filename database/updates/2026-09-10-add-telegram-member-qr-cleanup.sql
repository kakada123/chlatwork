BEGIN;

-- Keep only bot-sent QR message IDs and deadlines; cleanup survives API restarts.
CREATE TABLE IF NOT EXISTS "telegram_member_qr_messages" (
  "telegram_chat_id" BIGINT NOT NULL,
  "message_id" INTEGER NOT NULL CHECK ("message_id" > 0),
  "sent_at" TIMESTAMPTZ NOT NULL,
  "delete_after" TIMESTAMPTZ NOT NULL,
  "next_attempt_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("telegram_chat_id", "message_id"),
  CHECK ("delete_after" >= "sent_at" + INTERVAL '24 hours'),
  CHECK ("next_attempt_at" >= "delete_after")
);

CREATE INDEX IF NOT EXISTS "telegram_member_qr_messages_next_attempt_at_idx"
  ON "telegram_member_qr_messages" ("next_attempt_at");

COMMIT;
