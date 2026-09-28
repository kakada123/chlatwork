import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  KLA_KLOK_STAKES_RIEL,
  KLA_KLOK_SYMBOLS,
  buildKlaKlokBoardText,
  buildKlaKlokDealerKeyboard,
  buildKlaKlokDealerText,
  buildKlaKlokEndKeyboard,
  buildKlaKlokGroupKeyboard,
  buildKlaKlokRoundMessage,
  buildKlaKlokStakeKeyboard,
  callbackBelongsToUser,
  calculateKlaKlokTelegramRound,
  parseKlaKlokCallback,
  summarizeKlaKlokSettlement,
  telegramUserToken,
} from "../api/src/telegram-bot/telegram-kla-klok.ts";

const gameId = "00000000-0000-4000-8000-000000000001";

test("Telegram Kla Klok exposes six symbols and whole-riel stakes from 100៛", () => {
  assert.deepEqual(
    KLA_KLOK_SYMBOLS.map((symbol) => symbol.id),
    ["tiger", "gourd", "rooster", "shrimp", "crab", "fish"],
  );
  assert.deepEqual(KLA_KLOK_STAKES_RIEL, [100, 500, 1_000, 5_000, 10_000]);
});

test("round results are zero-sum between members and the dealer", () => {
  const result = calculateKlaKlokTelegramRound(
    [
      {
        telegramUserId: "101",
        displayName: "Dara",
        symbol: "tiger",
        amountRiel: 100n,
      },
      {
        telegramUserId: "101",
        displayName: "Dara",
        symbol: "fish",
        amountRiel: 100n,
      },
      {
        telegramUserId: "202",
        displayName: "Sokha",
        symbol: "crab",
        amountRiel: 500n,
      },
    ],
    ["tiger", "tiger", "crab"],
  );

  assert.deepEqual(
    result.bets.map((bet) => [bet.symbol, bet.matchCount, bet.netRiel]),
    [
      ["tiger", 2, 200n],
      ["fish", 0, -100n],
      ["crab", 1, 500n],
    ],
  );
  assert.deepEqual(
    result.players.map((player) => [player.telegramUserId, player.netRiel]),
    [
      ["101", 100n],
      ["202", 500n],
    ],
  );
  assert.equal(result.dealerNetRiel, -600n);
  assert.equal(
    result.dealerNetRiel +
      result.players.reduce((sum, player) => sum + player.netRiel, 0n),
    0n,
  );
});

test("round result is short, fun, and fully Khmer", () => {
  const result = calculateKlaKlokTelegramRound(
    [
      {
        telegramUserId: "101",
        displayName: "ភា",
        symbol: "tiger",
        amountRiel: 5_000n,
      },
    ],
    ["tiger", "gourd", "fish"],
  );

  assert.equal(
    buildKlaKlokRoundMessage(2, "កក្កដា", result),
    [
      "🎲 លទ្ធផលជុំទី 2",
      "🐯 ខ្លា • 🎃 ឃ្លោក • 🐟 ត្រី",
      "💰 សរុប៖ 5,000៛",
      "",
      "🏆 ភា៖ +5,000៛",
      "🔻 មេ កក្កដា៖ -5,000៛",
    ].join("\n"),
  );
});

test("final settlement stays compact and states only dealer-to-member transfers", () => {
  const settlement = summarizeKlaKlokSettlement(
    "វណ្ណា",
    [
      { telegramUserId: "101", displayName: "ដារ៉ា", netRiel: 600n },
      { telegramUserId: "202", displayName: "សុខា", netRiel: -200n },
      { telegramUserId: "303", displayName: "ណារី", netRiel: 0n },
    ],
    3,
  );

  assert.equal(settlement.dealerNetRiel, -400n);
  assert.equal(
    settlement.text,
    [
      "🏁 ចប់ហើយ! 3 ជុំ",
      "",
      "💸 វណ្ណា → ដារ៉ា៖ 600៛",
      "💸 សុខា → វណ្ណា៖ 200៛",
      "💰 មេ៖ -400៛",
    ].join("\n"),
  );
  assert.doesNotMatch(settlement.text, /ណារី/);
});

test("group buttons contain no dealer controls and callbacks stay below Telegram's limit", () => {
  const groupKeyboard = buildKlaKlokGroupKeyboard(gameId, 12);
  const dealerKeyboard = buildKlaKlokDealerKeyboard(gameId, 12);
  const stakeKeyboard = buildKlaKlokStakeKeyboard(gameId, 12, "tiger", "2n9c");
  const endKeyboard = buildKlaKlokEndKeyboard(gameId, "2n9c");
  const groupLabels = groupKeyboard.inline_keyboard
    .flat()
    .map((button) => button.text);
  const dealerLabels = dealerKeyboard.inline_keyboard
    .flat()
    .map((button) => button.text);

  assert.equal(
    groupLabels.some((label) => /ក្រឡុក|បញ្ចប់/.test(label)),
    false,
  );
  assert.equal(
    dealerLabels.some((label) => /ក្រឡុក/.test(label)),
    true,
  );
  assert.equal(
    dealerLabels.some((label) => /បញ្ចប់/.test(label)),
    true,
  );

  for (const keyboard of [
    groupKeyboard,
    dealerKeyboard,
    stakeKeyboard,
    endKeyboard,
  ]) {
    for (const button of keyboard.inline_keyboard.flat()) {
      assert.ok((button.callback_data?.length ?? 0) <= 64);
      assert.doesNotMatch(button.text, /[A-Za-z]/);
    }
  }
  assert.equal(stakeKeyboard.inline_keyboard[0]![0]!.text, "✅ 100៛");
});

test("group betting board is short and immediately actionable", () => {
  assert.equal(
    buildKlaKlokBoardText({ dealerDisplayName: "កក្កដា", round: 2 }),
    [
      "🎲 ខ្លាឃ្លោក • ជុំទី 2",
      "🎛 មេ៖ កក្កដា",
      "👇 ចុចរូបដែលចង់ចាក់",
    ].join("\n"),
  );

  assert.equal(
    buildKlaKlokDealerText({
      groupTitle: "ក្រុមសប្បាយ",
      round: 2,
      playerCount: 3,
      waitingNames: ["ដារ៉ា", "សុខា"],
      waitingCount: 4,
      dealerNetRiel: -12_000n,
    }),
    [
      "🎛 ផ្ទាំងមេ",
      "ក្រុម៖ ក្រុមសប្បាយ",
      "ជុំទី 2 កំពុងលេង",
      "✅ ចាក់ហើយ៖ 3 នាក់",
      "⏳ មិនទាន់៖ ដារ៉ា, សុខា +2 នាក់",
      "😅 មេចាញ់សរុប៖ 12,000៛",
      "",
      "ត្រៀមហើយ? ចុចក្រឡុក! 🎲",
    ].join("\n"),
  );
  assert.match(
    buildKlaKlokDealerText({
      groupTitle: "ក្រុមសប្បាយ",
      round: 3,
      playerCount: 0,
      waitingNames: [],
      waitingCount: 0,
      dealerNetRiel: 5_000n,
    }),
    /⏳ មិនទាន់មានអ្នកចាក់[\s\S]*🤑 មេឈ្នះសរុប៖ 5,000៛/,
  );
});

test("bet confirmations are bound to one Telegram member and malformed callbacks fail closed", () => {
  const ownerId = 123_456_789;
  const ownerToken = telegramUserToken(ownerId);
  const callback = buildKlaKlokStakeKeyboard(gameId, 1, "fish", ownerToken)
    .inline_keyboard[0]![0]!.callback_data;

  assert.equal(callbackBelongsToUser(ownerToken, ownerId), true);
  assert.equal(callbackBelongsToUser(ownerToken, ownerId + 1), false);
  assert.deepEqual(parseKlaKlokCallback(callback), {
    action: "bet",
    gameId,
    round: 1,
    symbol: "fish",
    amountRiel: 100,
    userToken: ownerToken,
  });
  assert.equal(parseKlaKlokCallback("kk:e:______________________"), null);
});

test("Telegram service routes Kla Klok commands and callbacks through its own feature gate", () => {
  const service = readFileSync(
    "api/src/telegram-bot/telegram-bot.service.ts",
    "utf8",
  );
  const module = readFileSync(
    "api/src/telegram-bot/telegram-bot.module.ts",
    "utf8",
  );
  const catalog = readFileSync(
    "api/src/feature-availability/feature-catalog.ts",
    "utf8",
  );

  assert.match(service, /data\.startsWith\('kk:'\).*'kla-klok'/s);
  assert.match(service, /command === 'klaklok'.*'kla-klok'/s);
  assert.match(service, /handleKlaKlokCommand/);
  assert.match(service, /handleKlaKlokCallback/);
  assert.match(module, /TelegramKlaKlokService/);
  assert.match(catalog, /'kla-klok': 'Kla Klok group game'/);
});

test("Telegram Kla Klok user-facing service copy is Khmer", () => {
  const botService = readFileSync(
    "api/src/telegram-bot/telegram-bot.service.ts",
    "utf8",
  );
  const gameService = readFileSync(
    "api/src/telegram-bot/telegram-kla-klok.service.ts",
    "utf8",
  );

  for (const oldCopy of [
    "Kla Klok is temporarily unavailable.",
    "This Kla Klok action is invalid.",
    "The dealer cannot place a bet.",
    "Bet confirmed.",
    "Bet cancelled.",
    "Only the dealer can use this control.",
    "A Kla Klok game is already open in this group.",
    "This Kla Klok round is closed.",
    "Wait for at least one confirmed bet before rolling.",
  ]) {
    assert.doesNotMatch(botService, new RegExp(oldCopy.replaceAll(".", "\\.")));
    assert.doesNotMatch(gameService, new RegExp(oldCopy.replaceAll(".", "\\.")));
  }

  assert.match(botService, /ចាក់រួច! 🎉/);
  assert.match(botService, /ហ៊ានចាក់ប៉ុន្មាន\? 😏/);
  assert.match(botService, /បើកល្បែងខ្លាឃ្លោក ជាមេល្បែង/);
  assert.match(botService, /getRoundStatus/);
  assert.match(botService, /dealerMessageId/);
  assert.match(gameService, /ជុំនេះបិទហើយ/);
});

test("Telegram Kla Klok executes advisory locks without deserializing PostgreSQL void", () => {
  const service = readFileSync(
    "api/src/telegram-bot/telegram-kla-klok.service.ts",
    "utf8",
  );

  assert.match(service, /\$executeRaw`SELECT pg_advisory_xact_lock/);
  assert.doesNotMatch(service, /\$queryRaw`SELECT pg_advisory_xact_lock/);
});

test("standalone SQL enforces one open game and one symbol bet per player per round", () => {
  const sql = readFileSync(
    "database/updates/2026-09-25-add-telegram-kla-klok.sql",
    "utf8",
  );

  assert.match(sql, /CREATE TABLE IF NOT EXISTS telegram_kla_klok_games/);
  assert.match(sql, /WHERE status = 'OPEN'/);
  assert.match(sql, /CHECK \(amount_riel IN \(100, 500, 1000, 5000, 10000\)\)/);
  assert.match(
    sql,
    /UNIQUE \(game_id, round_number, telegram_user_id, symbol\)/,
  );
  assert.match(
    sql,
    /CHECK \(symbol IN \('tiger', 'gourd', 'rooster', 'shrimp', 'crab', 'fish'\)\)/,
  );
});
