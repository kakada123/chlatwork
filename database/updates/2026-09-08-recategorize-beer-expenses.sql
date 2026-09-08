-- Replace YOUR_USER_UUID before running manually.
-- Only recategorize this user's Other expenses with the exact note Beer
-- (case-insensitive), from September 1, 2026 through today in Cambodia.
BEGIN;

UPDATE expense_entries
SET category = 'Beer',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "userId" = 'YOUR_USER_UUID'::uuid
  AND type = 'EXPENSE'
  AND category = 'Other'
  AND TRIM(note) ILIKE 'Beer'
  AND "entryDate" BETWEEN DATE '2026-09-01'
      AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Phnom_Penh')::date
RETURNING id, "entryDate", category, note, amount;

COMMIT;
