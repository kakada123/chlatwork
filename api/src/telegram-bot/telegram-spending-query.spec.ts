import { ExpenseCurrency } from '@prisma/client';
import {
  buildSpendingAnswer,
  parseSpendingQuestion,
  spendingDateRange,
} from './telegram-spending-query';

describe('Telegram spending questions', () => {
  it('parses command and natural-language ranges', () => {
    expect(parseSpendingQuestion('/spend Coffee week')).toEqual({
      range: 'WEEK',
      category: 'Coffee',
    });
    expect(
      parseSpendingQuestion('How much did I spend on Food this month?'),
    ).toEqual({ range: 'MONTH', category: 'Food' });
    expect(parseSpendingQuestion('Lunch 4.50')).toBeNull();
  });

  it('builds inclusive local date ranges', () => {
    expect(spendingDateRange('WEEK', '2026-09-04')).toEqual({
      startDate: '2026-08-29',
      endDate: '2026-09-04',
    });
    expect(spendingDateRange('MONTH', '2026-09-04')).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-04',
    });
  });

  it('answers with exact totals and highest categories', () => {
    const answer = buildSpendingAnswer(
      { range: 'WEEK' },
      '2026-09-04',
      [
        {
          id: '1',
          entryDate: new Date('2026-09-04T00:00:00.000Z'),
          category: 'Food',
          customCategory: null,
          note: 'Lunch',
          amount: '4.50',
        },
        {
          id: '2',
          entryDate: new Date('2026-09-03T00:00:00.000Z'),
          category: 'Coffee',
          customCategory: null,
          note: 'Latte',
          amount: '2.00',
        },
      ],
      ExpenseCurrency.USD,
    );

    expect(answer).toContain('You spent $6.50');
    expect(answer).toContain('Food: $4.50');
  });
});
