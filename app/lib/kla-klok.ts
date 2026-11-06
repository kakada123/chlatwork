import { translateMessage } from "./i18n.ts";
import { secureRandomInt } from "./secure-random.ts";

export const KLA_KLOK_SYMBOLS = [
  { id: "tiger", labelKey: "products.games.symbols.tiger", labelKm: translateMessage("km", "products.games.symbols.tiger"), labelEn: translateMessage("en", "products.games.symbols.tiger"), glyph: "🐯" },
  { id: "gourd", labelKey: "products.games.symbols.gourd", labelKm: translateMessage("km", "products.games.symbols.gourd"), labelEn: translateMessage("en", "products.games.symbols.gourd"), glyph: "🎃" },
  { id: "rooster", labelKey: "products.games.symbols.rooster", labelKm: translateMessage("km", "products.games.symbols.rooster"), labelEn: translateMessage("en", "products.games.symbols.rooster"), glyph: "🐓" },
  { id: "shrimp", labelKey: "products.games.symbols.shrimp", labelKm: translateMessage("km", "products.games.symbols.shrimp"), labelEn: translateMessage("en", "products.games.symbols.shrimp"), glyph: "🦐" },
  { id: "crab", labelKey: "products.games.symbols.crab", labelKm: translateMessage("km", "products.games.symbols.crab"), labelEn: translateMessage("en", "products.games.symbols.crab"), glyph: "🦀" },
  { id: "fish", labelKey: "products.games.symbols.fish", labelKm: translateMessage("km", "products.games.symbols.fish"), labelEn: translateMessage("en", "products.games.symbols.fish"), glyph: "🐟" },
] as const;

export type KlaKlokSymbolId = (typeof KLA_KLOK_SYMBOLS)[number]["id"];

export type KlaKlokMatch = {
  symbolId: KlaKlokSymbolId;
  count: number;
  winnings: number;
};

export type KlaKlokRound = {
  totalStake: number;
  returnedStake: number;
  winnings: number;
  totalReturn: number;
  balanceDelta: number;
  matches: KlaKlokMatch[];
};

const SYMBOL_IDS = new Set<KlaKlokSymbolId>(
  KLA_KLOK_SYMBOLS.map((symbol) => symbol.id),
);

export function calculateKlaKlokRound(input: {
  selectedSymbols: readonly KlaKlokSymbolId[];
  pointPerSymbol: number;
  dice: readonly KlaKlokSymbolId[];
}): KlaKlokRound {
  const selectedSymbols = [...new Set(input.selectedSymbols)];

  if (selectedSymbols.length === 0) {
    throw new Error("Choose at least one symbol.");
  }
  if (!Number.isInteger(input.pointPerSymbol) || input.pointPerSymbol <= 0) {
    throw new Error("Points per symbol must be a positive whole number.");
  }
  if (
    input.dice.length !== 3
    || input.dice.some((symbolId) => !SYMBOL_IDS.has(symbolId))
    || selectedSymbols.some((symbolId) => !SYMBOL_IDS.has(symbolId))
  ) {
    throw new Error("A Kla Klok round requires three valid dice symbols.");
  }

  const matches = selectedSymbols.flatMap<KlaKlokMatch>((symbolId) => {
    const count = input.dice.filter((die) => die === symbolId).length;
    return count > 0
      ? [{ symbolId, count, winnings: count * input.pointPerSymbol }]
      : [];
  });
  const totalStake = selectedSymbols.length * input.pointPerSymbol;
  const returnedStake = matches.length * input.pointPerSymbol;
  const winnings = matches.reduce((total, match) => total + match.winnings, 0);
  const totalReturn = returnedStake + winnings;

  return {
    totalStake,
    returnedStake,
    winnings,
    totalReturn,
    balanceDelta: totalReturn - totalStake,
    matches,
  };
}

export function rollKlaKlokDice(
  randomInt: (max: number) => number = secureRandomInt,
): [KlaKlokSymbolId, KlaKlokSymbolId, KlaKlokSymbolId] {
  const rollOne = () => {
    const index = randomInt(KLA_KLOK_SYMBOLS.length);
    if (!Number.isInteger(index) || index < 0 || index >= KLA_KLOK_SYMBOLS.length) {
      throw new Error("Random symbol index is outside the dice range.");
    }
    return KLA_KLOK_SYMBOLS[index].id;
  };

  return [rollOne(), rollOne(), rollOne()];
}

export function getKlaKlokSymbol(symbolId: KlaKlokSymbolId) {
  return KLA_KLOK_SYMBOLS.find((symbol) => symbol.id === symbolId)!;
}
