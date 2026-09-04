import {
  formatTelegramExpenseAmount,
  parseTelegramExpense,
  TelegramExpenseParseError,
} from './telegram-expense-parser';

describe('parseTelegramExpense', () => {
  it('parses an English expense and infers its category', () => {
    expect(parseTelegramExpense('Lunch 4.50', 'USD')).toEqual({
      amount: '4.5',
      currency: 'USD',
      category: 'Food',
      note: 'Lunch',
    });
  });

  it('parses Khmer text and grouped riel', () => {
    expect(parseTelegramExpense('បាយ 15,000៛', 'KHR')).toEqual({
      amount: '15000',
      currency: 'KHR',
      category: 'Food',
      note: 'បាយ',
    });
  });

  it('accepts an amount before the note', () => {
    expect(parseTelegramExpense('$2 coffee', 'USD')).toMatchObject({
      amount: '2',
      category: 'Coffee',
      note: 'coffee',
    });
  });

  it('rejects ambiguous and zero amounts', () => {
    expect(() => parseTelegramExpense('Lunch 4 coffee 2', 'USD')).toThrow(
      TelegramExpenseParseError,
    );
    expect(() => parseTelegramExpense('Lunch 0', 'USD')).toThrow(
      'greater than zero',
    );
  });

  it('rejects an explicit currency that differs from the tracker', () => {
    expect(() => parseTelegramExpense('Lunch $4', 'KHR')).toThrow(
      'tracker uses KHR',
    );
  });
});

describe('formatTelegramExpenseAmount', () => {
  it('formats USD and rounds fractional riel', () => {
    expect(formatTelegramExpenseAmount('4.5', 'USD')).toBe('$4.50');
    expect(formatTelegramExpenseAmount('12500.6', 'KHR')).toBe('12,501៛');
  });
});
