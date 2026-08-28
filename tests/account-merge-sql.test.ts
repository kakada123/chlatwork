import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  new URL('../database/updates/2026-08-28-merge-google-user-into-telegram-user.sql', import.meta.url),
  'utf8',
);

test('account merge uses the confirmed Google-to-Telegram direction', () => {
  assert.match(sql, /source_user_id UUID := 'b19a1c03-d5d6-4d86-bee9-57be5031952f'/);
  assert.match(sql, /destination_user_id UUID := 'e86e40e5-869b-4549-9f09-a9f390f40f4a'/);
  assert.doesNotMatch(sql, /d4cdc156-3282-4cf3-a151-663e39d7eb90/);
});

test('account merge transfers every direct User relation', () => {
  for (const relation of [
    'moments',
    'tool_usage_events',
    'expense_profiles',
    'expense_entries',
    'payback_profiles',
    'payback_entries',
    'payback_calculations',
    'social_accounts',
    'refresh_tokens',
  ]) {
    assert.match(sql, new RegExp(`UPDATE ${relation} SET`));
  }
});

test('account merge is guarded, transactional, and keeps an inactive source tombstone', () => {
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /^COMMIT;/m);
  assert.match(sql, /Destination already has Expense Tracker data/);
  assert.match(sql, /Destination already has PayBack draft data/);
  assert.match(sql, /WHERE id = source_user_id;/);
  assert.match(sql, /"isActive" = FALSE/);
  assert.doesNotMatch(sql, /DELETE\s+FROM\s+users/i);
});
