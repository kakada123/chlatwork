# Telegram personal reminders

Use these commands in a **private chat** with the existing ChlatWork bot. Sign in to ChlatWork with the same Telegram account and obtain bot access approval first.

| When                      | Command                                  |
| ------------------------- | ---------------------------------------- |
| After five minutes        | `/remind 5m \| Drink water`              |
| After two hours           | `/remind 2h \| Check POS`                |
| Today at 8 PM             | `/remind today 20:00 \| Take medicine`   |
| Tomorrow at 9 AM          | `/remind tomorrow 09:00 \| Team meeting` |
| Next 8:30 AM              | `/remind 08:30 \| Good morning`          |
| Exact date and time       | `/remind 2026-10-25 09:00 \| Pay rent`   |
| Show pending reminders    | `/reminders`                             |
| Cancel a pending reminder | `/cancel <reminder-id>`                  |

All clock times use **Cambodia time (`Asia/Phnom_Penh`, UTC+7)**, regardless of the server timezone or notification timezone setting. Use 24-hour `HH:mm` times and `YYYY-MM-DD` dates. A time without a date selects its next future occurrence. An explicit `today` or exact date in the past is rejected. Relative durations use positive whole minutes (`m`) or hours (`h`).

Separate the time and reminder message with `|`. Messages can contain up to 1,000 characters; additional pipes and line breaks are preserved.

The bot confirms the message, Cambodia date/time, and a **full UUID reminder ID**, for example `00000000-0000-4000-8000-000000000123`. Copy the ID into `/cancel`; numeric IDs such as `123` are not supported. Bare `/cancel` continues to cancel expense entry or an active KHQR upload. Group split cancellation is unchanged.

`/reminders` returns up to 100 pending reminders in due-time order, split into Telegram messages as necessary. Each user can list and cancel only their own reminders. Once delivery has started, a reminder can no longer be cancelled. Personal reminder commands sent in groups direct the sender to a private chat.

Reminders reuse the existing PostgreSQL storage and scheduler. The scheduler checks once per minute and sends `⏰ Reminder` followed by the message to the linked Telegram account. Normal delivery can occur up to approximately one minute after the requested time; downtime, backlog, or delivery retries can delay it further. Pending reminders persist across application restarts. Delivery failures retry according to the existing scheduler, up to three attempts. A delivery interrupted after Telegram accepts a message can still be repeated.

Creation retries for the same Telegram message reuse the original reminder, including its due time. Retrying a webhook after a failed confirmation does not create another scheduled reminder.

The `telegram:assistant` availability switch controls reminder creation, listing, cancellation, help entries, and scheduled delivery. Command parsing does not require AI or spend AI credits.

This feature adds no new dependencies, infrastructure, configuration variables, or database changes. The existing personal assistant schema must already be installed; its standalone SQL is `database/updates/2026-09-14-add-personal-assistant.sql`. No SQL is executed automatically by this change.
