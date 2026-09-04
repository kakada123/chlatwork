import { readFileSync } from 'node:fs';

describe('Telegram expense assistant schema', () => {
  const sql = readFileSync(
    '../database/updates/2026-09-04-add-telegram-expense-assistant.sql',
    'utf8',
  );

  it('deduplicates webhook updates and pending source messages', () => {
    expect(sql).toMatch(/update_id BIGINT PRIMARY KEY/);
    expect(sql).toMatch(/UNIQUE \(chat_id, source_message_id\)/);
  });

  it('stores confirmation state and links only the created expense', () => {
    expect(sql).toMatch(/'PENDING',[\s\S]*'CONFIRMED',[\s\S]*'CANCELLED',[\s\S]*'UNDONE'/);
    expect(sql).toMatch(
      /expense_entry_id UUID UNIQUE REFERENCES expense_entries\(id\) ON DELETE SET NULL/,
    );
    expect(sql).toMatch(/user_id UUID NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/);
  });
});
