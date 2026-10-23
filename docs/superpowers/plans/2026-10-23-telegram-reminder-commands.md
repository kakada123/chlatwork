# Telegram Reminder Commands Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement in this session. The user approved the design and implementation; no additional handoff is needed.

**Goal:** Add deterministic private Telegram reminder creation, listing, and cancellation.

**Architecture:** Parse Cambodia calendar times independently of AI; reuse the existing PostgreSQL reminder service and scheduler. Keep shared bot access, feature availability, and ownership checks intact.

**Tech Stack:** NestJS, TypeScript, Prisma/PostgreSQL, Jest; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-23-telegram-reminder-commands-design.md`

## Global Constraints

- Private, linked, approved users only; timezone `Asia/Phnom_Penh`.
- Existing UUID IDs, no schema changes, no database execution.
- Bare `/cancel` retains expense, KHQR, and group behavior.
- Message maximum 1,000 characters; reminders remain persistent across restarts.

## Review Focus

- Cambodia midnight/year transitions and leap-day rejection: parser tests.
- Oversized Telegram lists and text containing pipes: formatting/parser tests.
- KHQR upload in progress during reminder cancellation: gateway regression test.
- Disabled assistant versus disabled expenses: command feature tests.
- Unlinked users, group privacy, and unknown/foreign reminder IDs: routing tests.

### Task 1: Deterministic command parsing and formatting

**Files:** Create `api/src/telegram-bot/telegram-reminders.ts` and `.spec.ts`.

**Interfaces:** `parseReminderInput(input: string, now?: Date): { message: string; remindAt: Date }`; `formatReminderTime(date: Date): string`; `buildReminderList(reminders): string[]` for bounded Telegram messages.

- [x] Write tests for every supported time form, invalid input, rollover, embedded pipes, and bounded lists.
- [x] Run the parser suite and confirm missing implementation failure.
- [x] Implement strict parsing with fixed Cambodia offset and calendar roundtrip validation; format in Cambodia time.
- [x] Run the parser suite; initially 34 tests passed, with an additional extreme-duration regression covered in final validation.

### Task 2: Reminder service wiring and private command routing

**Files:** Modify `personal-assistant.module.ts`, `telegram-bot.service.ts`; create `telegram-reminder-commands.spec.ts`.

**Interfaces:** Consume Task 1 helpers and owner-scoped `PersonalReminderService.createFromTelegram/list/cancel` methods. Append optional injection to preserve existing constructor tests. `createFromTelegram(userId, inputFactory, source, now?)` resolves persisted source identity before invoking the parsing factory.

- [x] Add failing webhook tests for create/list/cancel, invalid input, missing owner records, unlinked/group access, feature switches, and bare `/cancel` compatibility.
- [x] Export the reminder service, route private commands after linking checks, show safe validation errors, and filter `/help` by assistant availability.
- [x] Run command, parser, persistence, and scheduler tests; all pass in final API validation.

### Task 3: Shared gateway compatibility and final verification

**Files:** Modify `bot-admin/bot-gateway.service.ts` and its test file; add `docs/telegram-reminder-commands.md`.

**Interfaces:** Commands with `/cancel` arguments must reach the assistant instead of consuming the active KHQR upload token.

- [x] Add a failing gateway test with a pending KHQR upload and `/cancel <uuid>`.
- [x] Restrict KHQR cancellation to bare `/cancel`; preserve Creator behavior.
- [x] Document supported commands, UUID usage, Cambodia time, private access, and minute-based delivery limits.
- [x] Run focused related tests, full API tests if safe, TypeScript compilation, changed-file formatting, and `git diff --check`. Report unrelated baseline failures separately.

## Execution notes

- Work in the user-provided checkout; preserve unrelated changes and leave commits/pushes to the user.
- Use direct installed Jest and TypeScript binaries, avoiding Prisma pretest/prebuild hooks that may load real environment files.
- Additional reliability decision: `PersonalReminderService.createFromTelegram` upserts a UUIDv5 derived from owner/chat/message identity. This avoids duplicate reminders when the persisted creation succeeds but Telegram confirmation fails. A persistence regression test covers retry reuse and identity separation.

## Final validation and review

- API regression suite: 87 suites / 1,304 tests pass from `api`, excluding `creator-gemini-routing.spec.ts` because that existing test opens `api/package.json` relative to the working directory. That suite passes separately from the repository root: 1 suite / 2 tests. Total: 88 suites / 1,306 tests, all passing.
- `tsc --noEmit --incremental false` passes, without Prisma hooks or environment-file loading.
- Scoped Prettier checks and `git diff --check` pass.
- Independent read-only review found one important retry issue. Fixed with a regression that first failed: after a failed confirmation, retries after the due time now reuse the saved reminder before parsing or future validation. The final suite covers the fix.
- An extreme-duration regression first reproduced an uncaught `RangeError`; the parser now rejects dates beyond its four-digit year range with a validation error.
- Review boundaries: live Telegram delivery, production database state, and existing scheduler infrastructure/delivery guarantees remain outside local proof. No live delivery, database mutation, deployment, commits, or pushes were performed.
