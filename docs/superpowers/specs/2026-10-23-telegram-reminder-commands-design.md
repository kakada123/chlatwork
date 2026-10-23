# Telegram reminder commands

## Intent and scope

Let linked, approved ChlatWork users create, list, and cancel personal reminders directly in the existing bot's private chat. Keep natural-language reminders and current expense, group, and account flows working.

## Approaches

- **Existing PostgreSQL scheduler (selected by the user):** reuse `PersonalReminderService`, persistent reminder rows, and the minute-based scheduler with claim locking and delivery retries. No additional infrastructure or schema changes.
- **Redis/BullMQ:** supports delayed jobs with finer scheduling, but requires a new queue service and recovery coordination with the existing database scheduler. Deferred.

The project uses PostgreSQL, not MariaDB. Normal delivery may occur up to approximately one scheduler interval after the due time, with longer delays during downtime, backlog, or delivery retries. An interrupted Telegram request can still produce duplicate delivery; exact-once delivery is not promised.

## Commands and business rules

- `/remind 5m | Drink water` and `/remind 2h | Check POS`: positive integer minute/hour offsets from receipt time.
- `/remind today 20:00 | Take medicine` and `/remind tomorrow 09:00 | Team meeting`: calendar dates in `Asia/Phnom_Penh`.
- `/remind 08:30 | Good morning`: next future occurrence of that Cambodia time, advancing to tomorrow if today's occurrence has passed.
- `/remind 2026-10-25 09:00 | Pay rent`: strict real calendar date and 24-hour time in Cambodia.
- `/reminders`: list the sender's pending reminders, ordered by due time, with IDs and cancellation instructions. Bound each Telegram response to its message size limit; indicate the existing service's 100-row limit.
- `/cancel <reminder-id>`: cancel only the sender's pending reminder. Use existing UUID IDs rather than introducing numeric IDs or changing the schema. A reminder already claimed for delivery cannot be cancelled.
- Bare `/cancel` retains its existing expense behavior and group split/KHQR cancellation behavior.

Reject missing separators, empty or oversized messages (maximum 1,000 characters), malformed dates, invalid times, nonpositive durations, and explicitly past dates/times. Return actionable usage guidance without creating rows. Retain message text after the first `|`, including subsequent pipes.

Confirmation shows the message, Cambodia date/time, full reminder ID, and cancellation command. Existing scheduled notification wording remains suitable.

## Implementation boundaries

Use a deterministic parser independent of AI. Route commands after account linking checks and through the existing shared bot access gate. Classify private reminder commands under `telegram:assistant`, including `/cancel` with arguments; keep bare `/cancel` under expenses. Include reminder commands in feature-filtered private `/help`. Group chats must not create, list, or cancel personal reminders.

Expose the existing reminder service through its Nest module. Reuse owner-scoped persistence methods, handling expected validation/not-found errors with safe user messages while allowing infrastructure failures to follow existing webhook retry behavior. No database execution, dependency installation, deployment, or real-secret inspection is needed.

Creation uses a stable UUID derived from the linked owner and original Telegram message, so webhook retries after a failed confirmation reuse the same reminder without shifting its due time or resetting its status.

## Validation

Cover all supported formats and Cambodia day/year boundaries; leap years, invalid dates/times, past values, and parser error cases; linked/unlinked users, feature gating, group privacy, list bounds, ownership-safe cancellation, and preservation of bare `/cancel`. Run focused parser, bot command, persistence, gateway, and scheduler tests plus TypeScript/build validation where local tooling is available. Distinguish these checks from live database or Telegram delivery proof.
