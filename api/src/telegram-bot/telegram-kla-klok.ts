import { randomInt } from 'node:crypto';

type KlaKlokKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

export const KLA_KLOK_SYMBOLS = [
  { id: 'tiger', code: 't', labelKm: 'ខ្លា', labelEn: 'Tiger', glyph: '🐯' },
  { id: 'gourd', code: 'g', labelKm: 'ឃ្លោក', labelEn: 'Gourd', glyph: '🎃' },
  {
    id: 'rooster',
    code: 'r',
    labelKm: 'មាន់',
    labelEn: 'Rooster',
    glyph: '🐓',
  },
  { id: 'shrimp', code: 's', labelKm: 'បង្គា', labelEn: 'Shrimp', glyph: '🦐' },
  { id: 'crab', code: 'c', labelKm: 'ក្ដាម', labelEn: 'Crab', glyph: '🦀' },
  { id: 'fish', code: 'f', labelKm: 'ត្រី', labelEn: 'Fish', glyph: '🐟' },
] as const;

export const KLA_KLOK_STAKES_RIEL = [100, 500, 1_000, 5_000, 10_000] as const;
export const KLA_KLOK_MAX_PLAYERS = 20;

export type TelegramKlaKlokSymbol = (typeof KLA_KLOK_SYMBOLS)[number]['id'];

export type TelegramKlaKlokBetInput = {
  id?: string;
  telegramUserId: string;
  displayName: string;
  symbol: TelegramKlaKlokSymbol;
  amountRiel: bigint;
};

export type TelegramKlaKlokBetResult = TelegramKlaKlokBetInput & {
  matchCount: number;
  netRiel: bigint;
};

export type TelegramKlaKlokPlayerResult = {
  telegramUserId: string;
  displayName: string;
  netRiel: bigint;
};

export type TelegramKlaKlokRoundResult = {
  dice: [TelegramKlaKlokSymbol, TelegramKlaKlokSymbol, TelegramKlaKlokSymbol];
  bets: TelegramKlaKlokBetResult[];
  players: TelegramKlaKlokPlayerResult[];
  dealerNetRiel: bigint;
  totalStakeRiel: bigint;
};

export type TelegramKlaKlokCallback =
  | {
      action: 'select';
      gameId: string;
      round: number;
      symbol: TelegramKlaKlokSymbol;
    }
  | {
      action: 'bet';
      gameId: string;
      round: number;
      symbol: TelegramKlaKlokSymbol;
      amountRiel: number;
      userToken: string;
    }
  | { action: 'cancel'; gameId: string; userToken: string }
  | { action: 'roll'; gameId: string; round: number }
  | { action: 'end'; gameId: string }
  | { action: 'end-confirm'; gameId: string; userToken: string }
  | { action: 'end-cancel'; gameId: string; userToken: string };

const UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const GAME_TOKEN_PATTERN = '[A-Za-z0-9_-]{22}';
const SYMBOL_BY_ID = new Map(
  KLA_KLOK_SYMBOLS.map((symbol) => [symbol.id, symbol]),
);
const SYMBOL_BY_CODE = new Map<string, (typeof KLA_KLOK_SYMBOLS)[number]>(
  KLA_KLOK_SYMBOLS.map((symbol) => [symbol.code, symbol]),
);
const STAKE_SET = new Set<number>(KLA_KLOK_STAKES_RIEL);

export function calculateKlaKlokTelegramRound(
  bets: readonly TelegramKlaKlokBetInput[],
  dice: readonly TelegramKlaKlokSymbol[],
): TelegramKlaKlokRoundResult {
  if (dice.length !== 3 || dice.some((symbol) => !SYMBOL_BY_ID.has(symbol))) {
    throw new Error('A Kla Klok round requires three valid dice.');
  }

  const results = bets.map<TelegramKlaKlokBetResult>((bet) => {
    if (!SYMBOL_BY_ID.has(bet.symbol) || bet.amountRiel <= 0n) {
      throw new Error('Kla Klok bet is invalid.');
    }
    const matchCount = dice.filter((symbol) => symbol === bet.symbol).length;
    // A match returns the stake and pays once per matching die, so net profit is count × stake.
    const netRiel = matchCount
      ? bet.amountRiel * BigInt(matchCount)
      : -bet.amountRiel;
    return { ...bet, matchCount, netRiel };
  });

  const playersById = new Map<string, TelegramKlaKlokPlayerResult>();
  for (const bet of results) {
    const existing = playersById.get(bet.telegramUserId);
    if (existing) existing.netRiel += bet.netRiel;
    else {
      playersById.set(bet.telegramUserId, {
        telegramUserId: bet.telegramUserId,
        displayName: cleanDisplayName(bet.displayName),
        netRiel: bet.netRiel,
      });
    }
  }
  const players = [...playersById.values()];
  const playerNet = players.reduce((sum, player) => sum + player.netRiel, 0n);

  return {
    dice: [dice[0]!, dice[1]!, dice[2]!],
    bets: results,
    players,
    dealerNetRiel: -playerNet,
    totalStakeRiel: results.reduce((sum, bet) => sum + bet.amountRiel, 0n),
  };
}

export function rollTelegramKlaKlokDice(
  chooseIndex: (max: number) => number = (max) => randomInt(max),
): [TelegramKlaKlokSymbol, TelegramKlaKlokSymbol, TelegramKlaKlokSymbol] {
  const roll = () => {
    const index = chooseIndex(KLA_KLOK_SYMBOLS.length);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= KLA_KLOK_SYMBOLS.length
    ) {
      throw new Error('Kla Klok random index is invalid.');
    }
    return KLA_KLOK_SYMBOLS[index]!.id;
  };
  return [roll(), roll(), roll()];
}

export function buildKlaKlokGroupKeyboard(
  gameId: string,
  round: number,
): KlaKlokKeyboard {
  const gameToken = uuidToGameToken(gameId);
  return {
    inline_keyboard: chunk(
      KLA_KLOK_SYMBOLS.map((symbol) => ({
        text: `${symbol.glyph} ${symbol.labelKm}`,
        callback_data: `kk:s:${gameToken}:${round.toString(36)}:${symbol.code}`,
      })),
      2,
    ),
  };
}

export function buildKlaKlokStakeKeyboard(
  gameId: string,
  round: number,
  symbol: TelegramKlaKlokSymbol,
  userToken: string,
): KlaKlokKeyboard {
  const symbolCode = requireSymbol(symbol).code;
  const gameToken = uuidToGameToken(gameId);
  const stakeButtons = KLA_KLOK_STAKES_RIEL.map((amount) => ({
    text: `Confirm ${formatRiel(amount)}៛`,
    callback_data: `kk:b:${gameToken}:${round.toString(36)}:${symbolCode}:${amount}:${userToken}`,
  }));
  return {
    inline_keyboard: [
      ...chunk(stakeButtons, 2),
      [{ text: 'Cancel', callback_data: `kk:n:${gameToken}:${userToken}` }],
    ],
  };
}

export function buildKlaKlokDealerKeyboard(
  gameId: string,
  round: number,
): KlaKlokKeyboard {
  const gameToken = uuidToGameToken(gameId);
  return {
    inline_keyboard: [
      [
        {
          text: `🎲 Roll round ${round}`,
          callback_data: `kk:r:${gameToken}:${round.toString(36)}`,
        },
      ],
      [{ text: '🏁 End game', callback_data: `kk:e:${gameToken}` }],
    ],
  };
}

export function buildKlaKlokEndKeyboard(
  gameId: string,
  userToken: string,
): KlaKlokKeyboard {
  const gameToken = uuidToGameToken(gameId);
  return {
    inline_keyboard: [
      [
        {
          text: 'Yes, end and summarize',
          callback_data: `kk:ey:${gameToken}:${userToken}`,
        },
        {
          text: 'Keep playing',
          callback_data: `kk:en:${gameToken}:${userToken}`,
        },
      ],
    ],
  };
}

export function buildKlaKlokBoardText(input: {
  dealerDisplayName: string;
  round: number;
}) {
  return [
    `🎲 ខ្លាឃ្លោក · Kla Klok — Round ${input.round}`,
    `មេ · Dealer: ${cleanDisplayName(input.dealerDisplayName)}`,
    '',
    'Pick a symbol, then explicitly confirm a stake from 100៛.',
    'The dealer cannot bet. Roll and End controls are private.',
    'No money is transferred by the bot; it records a final settlement only.',
  ].join('\n');
}

export function buildKlaKlokDealerText(input: {
  groupTitle: string;
  round: number;
}) {
  return [
    '🎛 Kla Klok dealer controls',
    `Group: ${cleanDisplayName(input.groupTitle)}`,
    `Open round: ${input.round}`,
    '',
    'Roll after members confirm their bets. End is blocked while the open round still has bets.',
  ].join('\n');
}

export function buildKlaKlokRoundMessage(
  round: number,
  dealerDisplayName: string,
  result: TelegramKlaKlokRoundResult,
) {
  const diceText = result.dice
    .map((symbol) => {
      const item = requireSymbol(symbol);
      return `${item.glyph} ${item.labelKm}`;
    })
    .join('  •  ');
  return [
    `🎉🎲 លទ្ធផលជុំទី ${round} · ROUND ${round} 🎲🎉`,
    '',
    `✨ ${diceText} ✨`,
    `💰 ភ្នាល់សរុប · Total stake: ${formatRiel(result.totalStakeRiel)}៛`,
    '',
    '🏆 លទ្ធផលសុទ្ធ · NET RESULTS',
    ...result.players.map((player) =>
      formatRoundNet(player.displayName, player.netRiel),
    ),
    formatRoundNet(dealerDisplayName, result.dealerNetRiel, ' (មេ · dealer)'),
    '',
    '🔥 បន្តទៅជុំបន្ទាប់ · Balances carry forward!',
  ].join('\n');
}

export function summarizeKlaKlokSettlement(
  dealerDisplayName: string,
  players: readonly TelegramKlaKlokPlayerResult[],
) {
  const dealer = cleanDisplayName(dealerDisplayName);
  const nonZeroPlayers = players.filter((player) => player.netRiel !== 0n);
  const dealerNetRiel = -players.reduce(
    (sum, player) => sum + player.netRiel,
    0n,
  );
  const transfers = nonZeroPlayers.map((player) =>
    player.netRiel > 0n
      ? `${dealer} pays ${cleanDisplayName(player.displayName)} ${formatRiel(player.netRiel)}៛`
      : `${cleanDisplayName(player.displayName)} pays ${dealer} ${formatRiel(-player.netRiel)}៛`,
  );
  return {
    dealerNetRiel,
    text: [
      '🏁 Kla Klok final settlement',
      '',
      ...(transfers.length ? transfers : ['No payments are needed.']),
      '',
      `Dealer net: ${formatSignedRiel(dealerNetRiel)}`,
      'Please confirm payments directly with each other. The bot does not transfer money.',
    ].join('\n'),
  };
}

export function parseKlaKlokCallback(
  data: string,
): TelegramKlaKlokCallback | null {
  try {
    return parseKlaKlokCallbackUnsafe(data);
  } catch {
    // Callback data is untrusted and malformed compact UUIDs must fail closed.
    return null;
  }
}

function parseKlaKlokCallbackUnsafe(
  data: string,
): TelegramKlaKlokCallback | null {
  if (!data || data.length > 64) return null;
  let match = new RegExp(
    `^kk:s:(${GAME_TOKEN_PATTERN}):([0-9a-z]{1,6}):([tgrscf])$`,
  ).exec(data);
  if (match) {
    const symbol = SYMBOL_BY_CODE.get(match[3]!.toLowerCase());
    const gameId = gameTokenToUuid(match[1]!);
    return symbol
      ? {
          action: 'select',
          gameId,
          round: parseInt(match[2]!, 36),
          symbol: symbol.id,
        }
      : null;
  }
  match = new RegExp(
    `^kk:b:(${GAME_TOKEN_PATTERN}):([0-9a-z]{1,6}):([tgrscf]):(\\d{3,5}):([0-9a-z]{1,13})$`,
  ).exec(data);
  if (match) {
    const symbol = SYMBOL_BY_CODE.get(match[3]!.toLowerCase());
    const amountRiel = Number(match[4]);
    return symbol && STAKE_SET.has(amountRiel)
      ? {
          action: 'bet',
          gameId: gameTokenToUuid(match[1]!),
          round: parseInt(match[2]!, 36),
          symbol: symbol.id,
          amountRiel,
          userToken: match[5]!.toLowerCase(),
        }
      : null;
  }
  match = new RegExp(`^kk:n:(${GAME_TOKEN_PATTERN}):([0-9a-z]{1,13})$`).exec(
    data,
  );
  if (match)
    return {
      action: 'cancel',
      gameId: gameTokenToUuid(match[1]!),
      userToken: match[2]!.toLowerCase(),
    };
  match = new RegExp(`^kk:r:(${GAME_TOKEN_PATTERN}):([0-9a-z]{1,6})$`).exec(
    data,
  );
  if (match)
    return {
      action: 'roll',
      gameId: gameTokenToUuid(match[1]!),
      round: parseInt(match[2]!, 36),
    };
  match = new RegExp(`^kk:e:(${GAME_TOKEN_PATTERN})$`).exec(data);
  if (match) return { action: 'end', gameId: gameTokenToUuid(match[1]!) };
  match = new RegExp(`^kk:ey:(${GAME_TOKEN_PATTERN}):([0-9a-z]{1,13})$`).exec(
    data,
  );
  if (match)
    return {
      action: 'end-confirm',
      gameId: gameTokenToUuid(match[1]!),
      userToken: match[2]!.toLowerCase(),
    };
  match = new RegExp(`^kk:en:(${GAME_TOKEN_PATTERN}):([0-9a-z]{1,13})$`).exec(
    data,
  );
  if (match)
    return {
      action: 'end-cancel',
      gameId: gameTokenToUuid(match[1]!),
      userToken: match[2]!.toLowerCase(),
    };
  return null;
}

export function telegramUserToken(telegramUserId: string | number) {
  const value = BigInt(telegramUserId);
  if (value <= 0n) throw new Error('Telegram user ID is invalid.');
  return value.toString(36);
}

export function callbackBelongsToUser(
  userToken: string,
  telegramUserId: number,
) {
  try {
    return BigInt(`0x${base36ToHex(userToken)}`) === BigInt(telegramUserId);
  } catch {
    return false;
  }
}

export function getKlaKlokSymbol(symbol: TelegramKlaKlokSymbol) {
  return requireSymbol(symbol);
}

function requireSymbol(symbol: TelegramKlaKlokSymbol) {
  const found = SYMBOL_BY_ID.get(symbol);
  if (!found) throw new Error('Kla Klok symbol is invalid.');
  return found;
}

function formatSignedRiel(value: bigint) {
  const sign = value > 0n ? '+' : value < 0n ? '-' : '';
  return `${sign}${formatRiel(value < 0n ? -value : value)}៛`;
}

function formatRiel(value: number | bigint) {
  return BigInt(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatRoundNet(displayName: string, value: bigint, role = '') {
  const participant = `${cleanDisplayName(displayName)}${role}`;
  if (value > 0n) {
    return `🟢 ${participant} ឈ្នះ · wins ${formatSignedRiel(value)}`;
  }
  if (value < 0n) {
    return `🔴 ${participant} ចាញ់ · loses ${formatSignedRiel(value)}`;
  }
  return `⚪ ${participant} ស្មើ · even ${formatSignedRiel(value)}`;
}

function cleanDisplayName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 80) || 'Telegram member';
}

function chunk<T>(values: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    rows.push(values.slice(index, index + size));
  }
  return rows;
}

function base36ToHex(value: string) {
  if (!/^[0-9a-z]+$/i.test(value)) throw new Error('Invalid base36 value.');
  let result = 0n;
  for (const character of value.toLowerCase()) {
    const digit = BigInt(parseInt(character, 36));
    result = result * 36n + digit;
  }
  return result.toString(16);
}

function uuidToGameToken(value: string) {
  if (!new RegExp(`^${UUID_PATTERN}$`, 'i').test(value)) {
    throw new Error('Kla Klok game ID is invalid.');
  }
  return Buffer.from(value.replaceAll('-', ''), 'hex').toString('base64url');
}

function gameTokenToUuid(value: string) {
  const hex = Buffer.from(value, 'base64url').toString('hex');
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
  if (!new RegExp(`^${UUID_PATTERN}$`, 'i').test(uuid)) {
    throw new Error('Kla Klok game callback is invalid.');
  }
  return uuid;
}
