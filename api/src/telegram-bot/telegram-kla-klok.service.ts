import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  KLA_KLOK_MAX_PLAYERS,
  KLA_KLOK_STAKES_RIEL,
  calculateKlaKlokTelegramRound,
  rollTelegramKlaKlokDice,
  summarizeKlaKlokSettlement,
  type TelegramKlaKlokPlayerResult,
  type TelegramKlaKlokRoundResult,
  type TelegramKlaKlokSymbol,
} from './telegram-kla-klok';

type GameRow = {
  id: string;
  telegramChatId: bigint;
  telegramChatTitle: string;
  dealerTelegramUserId: string;
  dealerDisplayName: string;
  status: string;
  currentRound: number;
  groupMessageId: number | null;
  dealerMessageId: number | null;
  summaryMessageId: number | null;
};

type BetRow = {
  id: string;
  telegramUserId: string;
  displayName: string;
  symbol: TelegramKlaKlokSymbol;
  amountRiel: bigint;
  matchCount: number | null;
  netRiel: bigint | null;
};

type RoundRow = {
  roundNumber: number;
  dieOne: TelegramKlaKlokSymbol;
  dieTwo: TelegramKlaKlokSymbol;
  dieThree: TelegramKlaKlokSymbol;
  resultMessageId: number | null;
};

export type TelegramKlaKlokGame = {
  id: string;
  telegramChatId: number;
  telegramChatTitle: string;
  dealerTelegramUserId: string;
  dealerDisplayName: string;
  status: string;
  currentRound: number;
  groupMessageId: number | null;
  dealerMessageId: number | null;
  summaryMessageId: number | null;
};

export type TelegramKlaKlokRoll = {
  game: TelegramKlaKlokGame;
  roundNumber: number;
  result: TelegramKlaKlokRoundResult;
  resultMessageId: number | null;
  replay: boolean;
};

@Injectable()
export class TelegramKlaKlokService {
  constructor(private readonly prisma: PrismaService) {}

  async createGame(input: {
    telegramChatId: number;
    telegramChatTitle: string;
    dealerTelegramUserId: string;
    dealerDisplayName: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize starts per group so concurrent commands cannot create two dealers.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BigInt(input.telegramChatId)})`;
      const existing = await tx.$queryRaw<GameRow[]>`
        SELECT id::text, telegram_chat_id AS "telegramChatId",
          telegram_chat_title AS "telegramChatTitle",
          dealer_telegram_user_id AS "dealerTelegramUserId",
          dealer_display_name AS "dealerDisplayName", status,
          current_round AS "currentRound", group_message_id AS "groupMessageId",
          dealer_message_id AS "dealerMessageId", summary_message_id AS "summaryMessageId"
        FROM telegram_kla_klok_games
        WHERE telegram_chat_id = ${BigInt(input.telegramChatId)} AND status = 'OPEN'
        LIMIT 1
      `;
      if (existing.length) {
        throw new ConflictException(
          'A Kla Klok game is already open in this group.',
        );
      }

      const id = randomUUID();
      const [created] = await tx.$queryRaw<GameRow[]>`
        INSERT INTO telegram_kla_klok_games (
          id, telegram_chat_id, telegram_chat_title,
          dealer_telegram_user_id, dealer_display_name, status, current_round
        ) VALUES (
          ${id}::uuid, ${BigInt(input.telegramChatId)}, ${cleanText(input.telegramChatTitle, 120)},
          ${input.dealerTelegramUserId}, ${cleanText(input.dealerDisplayName, 80)}, 'OPEN', 1
        )
        RETURNING id::text, telegram_chat_id AS "telegramChatId",
          telegram_chat_title AS "telegramChatTitle",
          dealer_telegram_user_id AS "dealerTelegramUserId",
          dealer_display_name AS "dealerDisplayName", status,
          current_round AS "currentRound", group_message_id AS "groupMessageId",
          dealer_message_id AS "dealerMessageId", summary_message_id AS "summaryMessageId"
      `;
      if (!created)
        throw new NotFoundException('Kla Klok game could not be created.');
      return toGame(created);
    });
  }

  async setControlMessages(
    gameId: string,
    groupMessageId: number,
    dealerMessageId: number,
  ) {
    await this.prisma.$executeRaw`
      UPDATE telegram_kla_klok_games
      SET group_message_id = ${groupMessageId}, dealer_message_id = ${dealerMessageId},
          updated_at = now()
      WHERE id = ${gameId}::uuid AND status = 'OPEN'
    `;
  }

  async setGroupMessage(gameId: string, groupMessageId: number) {
    await this.prisma.$executeRaw`
      UPDATE telegram_kla_klok_games
      SET group_message_id = ${groupMessageId}, updated_at = now()
      WHERE id = ${gameId}::uuid AND status = 'OPEN'
    `;
  }

  async cancelSetup(gameId: string, dealerTelegramUserId: string) {
    await this.prisma.$executeRaw`
      UPDATE telegram_kla_klok_games
      SET status = 'CANCELLED', ended_at = now(), updated_at = now()
      WHERE id = ${gameId}::uuid AND dealer_telegram_user_id = ${dealerTelegramUserId}
        AND status = 'OPEN'
    `;
  }

  async getGame(gameId: string) {
    const [game] = await this.prisma.$queryRaw<GameRow[]>`
      SELECT id::text, telegram_chat_id AS "telegramChatId",
        telegram_chat_title AS "telegramChatTitle",
        dealer_telegram_user_id AS "dealerTelegramUserId",
        dealer_display_name AS "dealerDisplayName", status,
        current_round AS "currentRound", group_message_id AS "groupMessageId",
        dealer_message_id AS "dealerMessageId", summary_message_id AS "summaryMessageId"
      FROM telegram_kla_klok_games WHERE id = ${gameId}::uuid
    `;
    if (!game)
      throw new NotFoundException('This Kla Klok game is unavailable.');
    return toGame(game);
  }

  async requireOpenRound(gameId: string, round: number) {
    const game = await this.getGame(gameId);
    if (game.status !== 'OPEN' || game.currentRound !== round) {
      throw new GoneException('This Kla Klok round is closed.');
    }
    return game;
  }

  async confirmBet(input: {
    gameId: string;
    round: number;
    telegramUserId: string;
    displayName: string;
    symbol: TelegramKlaKlokSymbol;
    amountRiel: number;
  }) {
    if (
      !(KLA_KLOK_STAKES_RIEL as readonly number[]).includes(input.amountRiel)
    ) {
      throw new BadRequestException(
        'Choose one of the available riel amounts.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const game = await this.lockGame(tx, input.gameId);
      if (game.status !== 'OPEN' || game.currentRound !== input.round) {
        throw new GoneException('This Kla Klok round is closed.');
      }
      if (game.dealerTelegramUserId === input.telegramUserId) {
        throw new BadRequestException('The dealer cannot place a bet.');
      }

      const [counts] = await tx.$queryRaw<
        Array<{ players: number; alreadyJoined: boolean }>
      >`
        SELECT
          COUNT(DISTINCT telegram_user_id)::int AS players,
          COALESCE(BOOL_OR(telegram_user_id = ${input.telegramUserId}), false) AS "alreadyJoined"
        FROM telegram_kla_klok_bets
        WHERE game_id = ${input.gameId}::uuid AND round_number = ${input.round}
      `;
      if (
        (counts?.players ?? 0) >= KLA_KLOK_MAX_PLAYERS &&
        !counts?.alreadyJoined
      ) {
        throw new BadRequestException(
          `This round already has ${KLA_KLOK_MAX_PLAYERS} players.`,
        );
      }

      const betId = randomUUID();
      await tx.$executeRaw`
        INSERT INTO telegram_kla_klok_bets (
          id, game_id, round_number, telegram_user_id, display_name, symbol, amount_riel
        ) VALUES (
          ${betId}::uuid, ${input.gameId}::uuid, ${input.round}, ${input.telegramUserId},
          ${cleanText(input.displayName, 80)}, ${input.symbol}, ${BigInt(input.amountRiel)}
        )
        ON CONFLICT (game_id, round_number, telegram_user_id, symbol)
        DO UPDATE SET amount_riel = EXCLUDED.amount_riel,
          display_name = EXCLUDED.display_name, updated_at = now()
      `;
      return toGame(game);
    });
  }

  async rollRound(
    gameId: string,
    dealerTelegramUserId: string,
    expectedRound: number,
  ): Promise<TelegramKlaKlokRoll> {
    return this.prisma.$transaction(async (tx) => {
      const game = await this.lockGame(tx, gameId);
      this.requireDealer(game, dealerTelegramUserId);

      if (expectedRound < game.currentRound) {
        return this.loadStoredRound(tx, game, expectedRound);
      }
      if (game.status !== 'OPEN' || expectedRound !== game.currentRound) {
        throw new GoneException('This Kla Klok round is closed.');
      }

      const bets = await tx.$queryRaw<BetRow[]>`
        SELECT id::text, telegram_user_id AS "telegramUserId",
          display_name AS "displayName", symbol, amount_riel AS "amountRiel",
          match_count AS "matchCount", net_riel AS "netRiel"
        FROM telegram_kla_klok_bets
        WHERE game_id = ${gameId}::uuid AND round_number = ${expectedRound}
          AND match_count IS NULL
        ORDER BY created_at, id
      `;
      if (!bets.length) {
        throw new BadRequestException(
          'Wait for at least one confirmed bet before rolling.',
        );
      }

      const dice = rollTelegramKlaKlokDice();
      const result = calculateKlaKlokTelegramRound(bets, dice);
      const roundId = randomUUID();
      await tx.$executeRaw`
        INSERT INTO telegram_kla_klok_rounds (
          id, game_id, round_number, die_one, die_two, die_three,
          total_stake_riel, dealer_net_riel
        ) VALUES (
          ${roundId}::uuid, ${gameId}::uuid, ${expectedRound},
          ${dice[0]}, ${dice[1]}, ${dice[2]},
          ${result.totalStakeRiel}, ${result.dealerNetRiel}
        )
      `;
      for (const bet of result.bets) {
        await tx.$executeRaw`
          UPDATE telegram_kla_klok_bets
          SET match_count = ${bet.matchCount}, net_riel = ${bet.netRiel}, updated_at = now()
          WHERE id = ${bet.id}::uuid AND match_count IS NULL
        `;
      }
      const [updated] = await tx.$queryRaw<GameRow[]>`
        UPDATE telegram_kla_klok_games
        SET current_round = current_round + 1, updated_at = now()
        WHERE id = ${gameId}::uuid AND current_round = ${expectedRound} AND status = 'OPEN'
        RETURNING id::text, telegram_chat_id AS "telegramChatId",
          telegram_chat_title AS "telegramChatTitle",
          dealer_telegram_user_id AS "dealerTelegramUserId",
          dealer_display_name AS "dealerDisplayName", status,
          current_round AS "currentRound", group_message_id AS "groupMessageId",
          dealer_message_id AS "dealerMessageId", summary_message_id AS "summaryMessageId"
      `;
      if (!updated) throw new GoneException('This Kla Klok round is closed.');
      return {
        game: toGame(updated),
        roundNumber: expectedRound,
        result,
        resultMessageId: null,
        replay: false,
      };
    });
  }

  async markRoundMessage(gameId: string, round: number, messageId: number) {
    await this.prisma.$executeRaw`
      UPDATE telegram_kla_klok_rounds
      SET result_message_id = COALESCE(result_message_id, ${messageId})
      WHERE game_id = ${gameId}::uuid AND round_number = ${round}
    `;
  }

  async endGame(gameId: string, dealerTelegramUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      let game = await this.lockGame(tx, gameId);
      this.requireDealer(game, dealerTelegramUserId);
      if (game.status === 'CANCELLED') {
        throw new GoneException('This Kla Klok game is closed.');
      }
      if (game.status === 'OPEN') {
        const [pending] = await tx.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS count FROM telegram_kla_klok_bets
          WHERE game_id = ${gameId}::uuid AND round_number = ${game.currentRound}
            AND match_count IS NULL
        `;
        if ((pending?.count ?? 0) > 0) {
          throw new BadRequestException(
            'Roll the current confirmed bets before ending the game.',
          );
        }
        const [ended] = await tx.$queryRaw<GameRow[]>`
          UPDATE telegram_kla_klok_games
          SET status = 'ENDED', ended_at = now(), updated_at = now()
          WHERE id = ${gameId}::uuid AND status = 'OPEN'
          RETURNING id::text, telegram_chat_id AS "telegramChatId",
            telegram_chat_title AS "telegramChatTitle",
            dealer_telegram_user_id AS "dealerTelegramUserId",
            dealer_display_name AS "dealerDisplayName", status,
            current_round AS "currentRound", group_message_id AS "groupMessageId",
            dealer_message_id AS "dealerMessageId", summary_message_id AS "summaryMessageId"
        `;
        if (ended) game = ended;
      }

      const players = await tx.$queryRaw<TelegramKlaKlokPlayerResult[]>`
        SELECT telegram_user_id AS "telegramUserId",
          (ARRAY_AGG(display_name ORDER BY updated_at DESC))[1] AS "displayName",
          SUM(net_riel)::bigint AS "netRiel"
        FROM telegram_kla_klok_bets
        WHERE game_id = ${gameId}::uuid AND match_count IS NOT NULL
        GROUP BY telegram_user_id
        ORDER BY MIN(created_at), telegram_user_id
      `;
      const [rounds] = await tx.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count FROM telegram_kla_klok_rounds
        WHERE game_id = ${gameId}::uuid
      `;
      const settlement = summarizeKlaKlokSettlement(
        game.dealerDisplayName,
        players,
      );
      return {
        game: toGame(game),
        players,
        rounds: rounds?.count ?? 0,
        ...settlement,
      };
    });
  }

  async markSummaryMessage(gameId: string, messageId: number) {
    await this.prisma.$executeRaw`
      UPDATE telegram_kla_klok_games
      SET summary_message_id = COALESCE(summary_message_id, ${messageId}), updated_at = now()
      WHERE id = ${gameId}::uuid AND status = 'ENDED'
    `;
  }

  private async lockGame(tx: Prisma.TransactionClient, gameId: string) {
    const [game] = await tx.$queryRaw<GameRow[]>`
      SELECT id::text, telegram_chat_id AS "telegramChatId",
        telegram_chat_title AS "telegramChatTitle",
        dealer_telegram_user_id AS "dealerTelegramUserId",
        dealer_display_name AS "dealerDisplayName", status,
        current_round AS "currentRound", group_message_id AS "groupMessageId",
        dealer_message_id AS "dealerMessageId", summary_message_id AS "summaryMessageId"
      FROM telegram_kla_klok_games WHERE id = ${gameId}::uuid FOR UPDATE
    `;
    if (!game)
      throw new NotFoundException('This Kla Klok game is unavailable.');
    return game;
  }

  private requireDealer(game: GameRow, telegramUserId: string) {
    if (game.dealerTelegramUserId !== telegramUserId) {
      throw new UnauthorizedException('Only the dealer can use this control.');
    }
  }

  private async loadStoredRound(
    tx: Prisma.TransactionClient,
    game: GameRow,
    roundNumber: number,
  ): Promise<TelegramKlaKlokRoll> {
    const [round] = await tx.$queryRaw<RoundRow[]>`
      SELECT round_number AS "roundNumber", die_one AS "dieOne",
        die_two AS "dieTwo", die_three AS "dieThree",
        result_message_id AS "resultMessageId"
      FROM telegram_kla_klok_rounds
      WHERE game_id = ${game.id}::uuid AND round_number = ${roundNumber}
    `;
    if (!round) throw new GoneException('This Kla Klok round is closed.');
    const bets = await tx.$queryRaw<BetRow[]>`
      SELECT id::text, telegram_user_id AS "telegramUserId",
        display_name AS "displayName", symbol, amount_riel AS "amountRiel",
        match_count AS "matchCount", net_riel AS "netRiel"
      FROM telegram_kla_klok_bets
      WHERE game_id = ${game.id}::uuid AND round_number = ${roundNumber}
        AND match_count IS NOT NULL
      ORDER BY created_at, id
    `;
    return {
      game: toGame(game),
      roundNumber,
      result: calculateKlaKlokTelegramRound(bets, [
        round.dieOne,
        round.dieTwo,
        round.dieThree,
      ]),
      resultMessageId: round.resultMessageId,
      replay: true,
    };
  }
}

function toGame(row: GameRow): TelegramKlaKlokGame {
  const telegramChatId = Number(row.telegramChatId);
  if (!Number.isSafeInteger(telegramChatId)) {
    throw new BadRequestException(
      'Telegram group ID is outside the supported range.',
    );
  }
  return { ...row, telegramChatId };
}

function cleanText(value: string, maxLength: number) {
  return (
    value.trim().replace(/\s+/g, ' ').slice(0, maxLength) || 'Telegram group'
  );
}
