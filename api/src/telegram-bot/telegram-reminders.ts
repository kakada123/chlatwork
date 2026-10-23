import { BadRequestException } from '@nestjs/common';

const CAMBODIA_OFFSET_MS = 7 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
const TELEGRAM_MESSAGE_LIMIT = 4096;

export const REMINDER_USAGE = [
  'Use /remind <time> | <message> (up to 1,000 characters).',
  'Examples: 5m, 2h, today 20:00, tomorrow 09:00, 08:30, or 2026-10-25 09:00.',
  'All clock times use Cambodia time (Asia/Phnom_Penh, UTC+7).',
].join('\n');

export function parseReminderInput(input: string, now = new Date()) {
  const separator = input.indexOf('|');
  const time = input.slice(0, separator).trim().toLowerCase();
  const message = input.slice(separator + 1).trim();
  if (separator < 0 || !time || !message || message.length > 1000) {
    throw new BadRequestException(REMINDER_USAGE);
  }

  let remindAt: Date;
  const relative = /^(\d+)(m|h)$/.exec(time);
  if (relative) {
    const amount = Number(relative[1]);
    const offset = amount * (relative[2] === 'h' ? 60 : 1) * 60_000;
    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(offset)
    ) {
      throw new BadRequestException(REMINDER_USAGE);
    }
    remindAt = new Date(now.getTime() + offset);
  } else {
    const exact = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/.exec(time);
    const daily = /^(?:(today|tomorrow)\s+)?(\d{2}:\d{2})$/.exec(time);
    if (!exact && !daily) throw new BadRequestException(REMINDER_USAGE);
    // Cambodia has a fixed UTC+7 offset: calendar arithmetic must not use the server's timezone.
    const localNow = new Date(now.getTime() + CAMBODIA_OFFSET_MS);
    const localDay = new Date(
      localNow.getTime() + (daily?.[1] === 'tomorrow' ? DAY_MS : 0),
    );
    const date = exact?.[1] ?? localDay.toISOString().slice(0, 10);
    const clock = exact?.[2] ?? daily![2];
    const requested = `${date}T${clock}:00.000`;
    remindAt = new Date(`${requested}+07:00`);
    // Date parsing can normalize impossible dates such as April 31. Roundtrip to reject them.
    if (
      !Number.isFinite(remindAt.getTime()) ||
      new Date(remindAt.getTime() + CAMBODIA_OFFSET_MS)
        .toISOString()
        .slice(0, 23) !== requested
    ) {
      throw new BadRequestException(
        `Use a valid calendar date and 24-hour time.\n${REMINDER_USAGE}`,
      );
    }
    if (daily && !daily[1] && remindAt <= now) {
      remindAt = new Date(remindAt.getTime() + DAY_MS);
    }
  }

  if (
    !Number.isFinite(remindAt.getTime()) ||
    remindAt <= now ||
    remindAt.getUTCFullYear() > 9999 ||
    !/^\d{4}-/.test(
      new Date(remindAt.getTime() + CAMBODIA_OFFSET_MS).toISOString(),
    )
  ) {
    throw new BadRequestException(
      `Reminder time must be a valid future date.\n${REMINDER_USAGE}`,
    );
  }
  return { message, remindAt };
}

export function formatReminderTime(date: Date): string {
  const dateText = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
  const timeText = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${dateText} at ${timeText} (Cambodia, UTC+7)`;
}

export function buildReminderList(
  reminders: ReadonlyArray<{ id: string; message: string; remindAt: Date }>,
): string[] {
  if (!reminders.length)
    return ['No pending reminders.\nCreate one with /remind 5m | Drink water'];
  const heading =
    '⏰ Pending reminders (up to 100)\nCancel with /cancel <reminder-id>.';
  const messages: string[] = [];
  let current = heading;
  for (const reminder of reminders) {
    const row = `\n\n📝 ${reminder.message}\n📅 ${formatReminderTime(reminder.remindAt)}\n🆔 ${reminder.id}`;
    if (current.length + row.length > TELEGRAM_MESSAGE_LIMIT) {
      messages.push(current);
      current = heading;
    }
    current += row;
  }
  messages.push(current);
  return messages;
}
