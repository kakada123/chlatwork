import { buildTelegramTodaySummary } from './telegram-today-summary';

describe('buildTelegramTodaySummary', () => {
  it('summarizes today by highest-spend category', () => {
    expect(
      buildTelegramTodaySummary('2026-09-04', 'USD', [
        { category: 'Coffee', amount: '2.5' },
        { category: 'Food', amount: '8' },
        { category: 'Coffee', amount: '1.25' },
      ]),
    ).toBe(
      [
        '📊 Today — 2026-09-04',
        'Spent: $11.75',
        'Entries: 3',
        '',
        'By category:',
        '• Food: $8.00',
        '• Coffee: $3.75',
      ].join('\n'),
    );
  });

  it('shows a useful empty state', () => {
    expect(buildTelegramTodaySummary('2026-09-04', 'KHR', [])).toContain(
      'No expenses recorded yet.',
    );
  });

  it('uses the saved custom category name', () => {
    expect(
      buildTelegramTodaySummary('2026-09-04', 'USD', [
        { category: '__custom__', customCategory: 'Books', amount: '12' },
      ]),
    ).toContain('• Books: $12.00');
  });
});
