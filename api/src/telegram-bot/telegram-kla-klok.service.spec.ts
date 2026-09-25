import { TelegramKlaKlokService } from './telegram-kla-klok.service';

describe('TelegramKlaKlokService', () => {
  it('ends an open game without counting confirmed bets that were never rolled', async () => {
    const gameId = '00000000-0000-4000-8000-000000000001';
    const openGame = {
      id: gameId,
      telegramChatId: -1001234567890n,
      telegramChatTitle: 'Game night',
      dealerTelegramUserId: '123',
      dealerDisplayName: 'Kakada',
      status: 'OPEN',
      currentRound: 2,
      groupMessageId: 20,
      dealerMessageId: 21,
      summaryMessageId: null,
    };
    const queryRaw = jest.fn((strings: TemplateStringsArray) => {
      const sql = strings.join(' ');
      if (sql.includes('FOR UPDATE')) return Promise.resolve([openGame]);
      if (sql.includes('AND match_count IS NULL')) {
        return Promise.resolve([{ count: 1 }]);
      }
      if (sql.includes("SET status = 'ENDED'")) {
        return Promise.resolve([{ ...openGame, status: 'ENDED' }]);
      }
      if (sql.includes('SUM(net_riel)')) return Promise.resolve([]);
      if (sql.includes('FROM telegram_kla_klok_rounds')) {
        return Promise.resolve([{ count: 0 }]);
      }
      throw new Error(`Unexpected Kla Klok query: ${sql}`);
    });
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: { $queryRaw: typeof queryRaw }) => unknown) =>
          callback({ $queryRaw: queryRaw }),
      ),
    };
    const service = new TelegramKlaKlokService(prisma as never);

    const settlement = await service.endGame(gameId, '123');

    expect(settlement.game.status).toBe('ENDED');
    expect(settlement.rounds).toBe(0);
    expect(settlement.text).toContain('No payments');
    expect(
      queryRaw.mock.calls.some(([strings]) =>
        (strings as unknown as TemplateStringsArray)
          .join(' ')
          .includes('AND match_count IS NULL'),
      ),
    ).toBe(false);
  });
});
