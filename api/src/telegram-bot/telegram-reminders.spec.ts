import {
  buildReminderList,
  formatReminderTime,
  parseReminderInput,
} from './telegram-reminders';
import { BadRequestException } from '@nestjs/common';

describe('Telegram reminder commands', () => {
  const now = new Date('2026-10-23T10:00:00Z'); // 17:00 in Cambodia.

  it('rejects durations at the JavaScript time range with a validation error', () => {
    const minutesToDateLimit = Math.floor(
      (8_640_000_000_000_000 - now.getTime()) / 60_000,
    );
    expect(() =>
      parseReminderInput(`${minutesToDateLimit}m | Water`, now),
    ).toThrow(BadRequestException);
  });

  it.each([
    ['5m', '2026-10-23T10:05:00.000Z'],
    ['2h', '2026-10-23T12:00:00.000Z'],
    ['today 20:00', '2026-10-23T13:00:00.000Z'],
    ['tomorrow 09:00', '2026-10-24T02:00:00.000Z'],
    ['08:30', '2026-10-24T01:30:00.000Z'],
    ['20:00', '2026-10-23T13:00:00.000Z'],
    ['2026-10-25 09:00', '2026-10-25T02:00:00.000Z'],
    ['2028-02-29 09:00', '2028-02-29T02:00:00.000Z'],
  ])('parses %s in Cambodia time', (time, expected) => {
    const parsed = parseReminderInput(`${time} | Drink water`, now);
    expect(parsed.message).toBe('Drink water');
    expect(parsed.remindAt.toISOString()).toBe(expected);
  });

  it.each([
    '5m',
    '5m | ',
    '| Drink',
    '0m | Drink',
    '-1h | Drink',
    '1.5h | Drink',
    '999999999999999999h | Drink',
    'today 16:00 | Drink',
    '2026-10-22 20:00 | Drink',
    '2026-02-29 09:00 | Drink',
    '2027-02-29 09:00 | Drink',
    '2026-04-31 09:00 | Drink',
    '2026-13-01 09:00 | Drink',
    '2026-10-25 24:00 | Drink',
    '2026-10-25 09:60 | Drink',
    'tomorrow 9am | Drink',
    'tomorrow 09:00 extra | Drink',
    `5m | ${'x'.repeat(1001)}`,
  ])('rejects invalid or past input: %s', (input) => {
    expect(() => parseReminderInput(input, now)).toThrow();
  });

  it('preserves pipes and newlines inside the message', () => {
    expect(parseReminderInput(' 5m | Check A | B\nthen C ', now).message).toBe(
      'Check A | B\nthen C',
    );
  });

  it('accepts the exact maximum message length', () => {
    expect(
      parseReminderInput(`5m | ${'x'.repeat(1000)}`, now).message,
    ).toHaveLength(1000);
  });

  it('uses the Cambodia date even when UTC is still the previous day', () => {
    expect(
      parseReminderInput(
        'today 08:00 | Morning',
        new Date('2026-10-23T18:00:00Z'),
      ).remindAt.toISOString(),
    ).toBe('2026-10-24T01:00:00.000Z');
  });

  it('rolls tomorrow into the next year', () => {
    expect(
      parseReminderInput(
        'tomorrow 09:00 | New year',
        new Date('2026-12-31T16:00:00Z'),
      ).remindAt.toISOString(),
    ).toBe('2027-01-01T02:00:00.000Z');
  });

  it('moves a time equal to now to tomorrow, but rejects explicit today', () => {
    expect(
      parseReminderInput('17:00 | Later', now).remindAt.toISOString(),
    ).toBe('2026-10-24T10:00:00.000Z');
    expect(() => parseReminderInput('today 17:00 | Later', now)).toThrow();
  });

  it('labels confirmation times with the Cambodia timezone', () => {
    expect(formatReminderTime(new Date('2026-10-25T02:00:00Z'))).toBe(
      'October 25, 2026 at 9:00 AM (Cambodia, UTC+7)',
    );
  });

  it('splits large lists without dropping IDs or exceeding Telegram limits', () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      message: '🏠'.repeat(500),
      remindAt: now,
    }));
    const messages = buildReminderList(rows);
    expect(messages.length).toBeGreaterThan(1);
    expect(messages.every((message) => message.length <= 4096)).toBe(true);
    for (const row of rows) expect(messages.join('\n')).toContain(row.id);
    expect(messages.join('\n')).toContain('up to 100');
  });

  it('explains when no reminders are pending', () => {
    expect(buildReminderList([]).join('\n')).toContain('No pending reminders');
  });
});
