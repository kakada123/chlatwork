import { ExpenseCurrency } from '@prisma/client';
import {
  buildTelegramSplitMessage,
  parseTelegramSplit,
  TelegramSplitParseError,
} from './telegram-group-split';

describe('Telegram group splits', () => {
  it('distributes remainder cents deterministically', () => {
    const split = parseTelegramSplit(
      '/split 10 Alice, Bob, Carol',
      ExpenseCurrency.USD,
    );

    expect(split.total).toBe('10.00');
    expect(split.participants.map((participant) => participant.amount)).toEqual(
      ['3.34', '3.33', '3.33'],
    );
  });

  it('rejects duplicate names and currency mismatches', () => {
    expect(() =>
      parseTelegramSplit('/split 10 Alice, alice', ExpenseCurrency.USD),
    ).toThrow(TelegramSplitParseError);
    expect(() =>
      parseTelegramSplit('/split 10000៛ Alice, Bob', ExpenseCurrency.USD),
    ).toThrow(/uses USD/);
  });

  it('shows paid progress without exposing Telegram IDs', () => {
    const message = buildTelegramSplitMessage({
      id: 'split-1',
      title: 'Shared expense',
      total: '10.00',
      currency: ExpenseCurrency.USD,
      status: 'OPEN',
      participants: [
        {
          id: 'participant-1',
          position: 0,
          name: 'Alice',
          amount: '5.00',
          telegramDisplayName: 'Sokha',
          paidAt: new Date(),
        },
        {
          id: 'participant-2',
          position: 1,
          name: 'Bob',
          amount: '5.00',
          telegramDisplayName: null,
          paidAt: null,
        },
      ],
    });

    expect(message).toContain('Paid: 1/2');
    expect(message).toContain('✅ Alice: $5.00 — Sokha');
    expect(message).toContain('⬜ Bob: $5.00');
  });
});
