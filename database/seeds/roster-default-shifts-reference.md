# Roster Default Shifts — Reference

This document describes the four standard shift codes used in My Roster and explains how they are provisioned per user.

## Standard Shift Definitions

| Code   | Start | End   | Overnight | Notes                              |
|--------|-------|-------|-----------|-------------------------------------|
| **K122** | 08:30 | 18:00 | No        | Standard morning shift              |
| **K123** | 09:00 | 18:30 | No        | Standard mid-morning shift          |
| **K124** | 09:30 | 19:00 | No        | Standard late-morning shift         |
| **K234** | 20:00 | 05:30 | **Yes**   | Overnight/night shift (crosses midnight) |

## Why These Are Not Globally Seeded

Shifts in `roster_shifts` are **personal** — they belong to a specific `user_id`.  
There is no concept of a shared shift library at the database level; each row is owned by exactly one user.

The API creates these four shifts automatically when a user sets up their roster profile for the first time (e.g., on first call to `GET /roster/settings` when no preferences row exists).  
This keeps the seed data close to the business logic and avoids seed scripts that must be run per-user or against a live database.

## Schema Reference

```
roster_shifts
  id           UUID   PK
  user_id      UUID   FK → users(id)
  code         VARCHAR(16)   e.g. 'K122'
  start_time   VARCHAR(5)    HH:MM
  end_time     VARCHAR(5)    HH:MM
  is_overnight BOOLEAN       true only for K234
  is_default   BOOLEAN       one shift per user may be marked default
  is_active    BOOLEAN
```

## Adding a Custom Shift

Users can create additional shifts via `POST /roster/shifts`.  
The `code` must be unique per user; it is case-sensitive and limited to 16 characters.
