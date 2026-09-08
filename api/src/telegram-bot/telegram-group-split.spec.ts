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


describe('Final participant equal splits', () => {
  const members = [
    { telegramUserId: '1', displayName: 'Dara' },
    { telegramUserId: '2', displayName: 'Dara' },
    { telegramUserId: '3', displayName: 'Sokha' },
  ];
  it('uses Telegram identities even when display names match', () => {
    const split = parseTelegramSplit('/split 10', ExpenseCurrency.USD, members);
    expect(split.participants.map((member) => member.telegramUserId)).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(split.participants.map((member) => member.amount)).toEqual([
      '3.34',
      '3.33',
      '3.33',
    ]);
  });
  it('splits riel in whole units without losing money to display rounding', () => {
    const split = parseTelegramSplit(
      '/split 10000',
      ExpenseCurrency.KHR,
      members,
    );
    expect(split.participants.map((member) => member.amount)).toEqual([
      '3334.00',
      '3333.00',
      '3333.00',
    ]);
  });
  it('rejects empty rosters and attempts to override final participants', () => {
    expect(() =>
      parseTelegramSplit('/split 60', ExpenseCurrency.USD, []),
    ).toThrow(/joined participants/);
    expect(() =>
      parseTelegramSplit('/split 60 Alice, Bob', ExpenseCurrency.USD, members),
    ).toThrow(/only the total/);
  });
});
