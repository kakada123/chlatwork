import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  KLA_KLOK_SYMBOLS,
  calculateKlaKlokRound,
  rollKlaKlokDice,
} from "../app/lib/kla-klok.ts";

test("Kla Klok exposes the six classic symbols", () => {
  assert.deepEqual(
    KLA_KLOK_SYMBOLS.map((symbol) => symbol.id),
    ["tiger", "gourd", "rooster", "shrimp", "crab", "fish"],
  );
});

test("a matching symbol returns its stake and pays once per matching die", () => {
  const result = calculateKlaKlokRound({
    selectedSymbols: ["tiger", "fish"],
    pointPerSymbol: 10,
    dice: ["tiger", "crab", "tiger"],
  });

  assert.equal(result.totalStake, 20);
  assert.equal(result.returnedStake, 10);
  assert.equal(result.winnings, 20);
  assert.equal(result.totalReturn, 30);
  assert.equal(result.balanceDelta, 10);
  assert.deepEqual(result.matches, [{ symbolId: "tiger", count: 2, winnings: 20 }]);
});

test("a round with no matches loses every selected stake", () => {
  const result = calculateKlaKlokRound({
    selectedSymbols: ["gourd", "rooster"],
    pointPerSymbol: 25,
    dice: ["tiger", "crab", "fish"],
  });

  assert.equal(result.totalReturn, 0);
  assert.equal(result.balanceDelta, -50);
  assert.deepEqual(result.matches, []);
});

test("dice rolls use three bounded symbol selections", () => {
  const choices = [0, 5, 2];
  const dice = rollKlaKlokDice(() => choices.shift() ?? 0);

  assert.deepEqual(dice, ["tiger", "fish", "rooster"]);
});

test("Kla Klok page stays virtual-only and includes its main landing sections", () => {
  const page = readFileSync("app/pages/tools/kla-klok.vue", "utf8");
  const board = readFileSync("app/components/kla-klok/KlaKlokBoard.vue", "utf8");

  assert.match(page, /KlaKlokHero/);
  assert.match(page, /KlaKlokHowToPlay/);
  assert.match(page, /KlaKlokBoard/);
  assert.match(page, /KlaKlokRules/);
  assert.match(page, /ត្រៀមលេងខ្លាឃ្លោកហើយឬនៅ/);
  assert.match(board, /virtual coins/i);
  assert.match(board, /ក្រឡុកចាន/);
  assert.doesNotMatch(`${page}\n${board}`, /real[- ]money|cash bet|deposit|withdraw/i);
});

test("Kla Klok reveals 3D dice from a covered shaking dish with local sound", () => {
  const board = readFileSync("app/components/kla-klok/KlaKlokBoard.vue", "utf8");
  const dice = readFileSync("app/components/kla-klok/KlaKlokDice.vue", "utf8");
  const bowl = readFileSync("app/components/kla-klok/KlaKlokBowl.vue", "utf8");
  const sound = readFileSync("app/lib/kla-klok-sound.ts", "utf8");

  assert.match(dice, /KLA_KLOK_SYMBOLS/);
  assert.match(dice, /v-for="face in KLA_KLOK_SYMBOLS"/);
  assert.match(dice, /transform-style:\s*preserve-3d/);
  assert.match(dice, /perspective:/);
  assert.match(dice, /prefers-reduced-motion:\s*reduce/);
  assert.match(bowl, /kla-bowl-cover/);
  assert.match(bowl, /kla-bowl-stage--rolling/);
  assert.match(bowl, /prefers-reduced-motion:\s*reduce/);
  assert.match(sound, /AudioContext/);
  assert.match(sound, /createOscillator/);
  assert.doesNotMatch(sound, /https?:\/\//);
  assert.match(board, /KlaKlokBowl/);
  assert.match(board, /isCovered/);
  assert.match(board, /isSettling/);
  assert.match(board, /soundEnabled/);
  assert.match(board, /roll-index/);
  assert.match(board, /ក្រឡុកខ្លាឃ្លោក/);
});

test("Kla Klok is registered as an available website tool", () => {
  const registry = readFileSync("app/lib/tool-registry.ts", "utf8");
  const routes = readFileSync("app/data/site-routes.ts", "utf8");
  const guideRoutes = readFileSync("app/data/tool-guide-routes.ts", "utf8");
  const guides = readFileSync("app/data/tool-guides.ts", "utf8");
  const availability = readFileSync(
    "api/src/feature-availability/feature-catalog.ts",
    "utf8",
  );

  assert.match(registry, /key: "kla-klok"/);
  assert.match(registry, /route: "\/tools\/kla-klok"/);
  assert.match(routes, /"\/tools\/kla-klok"/);
  assert.match(guideRoutes, /\["kla-klok", "how-to-play-kla-klok"\]/);
  assert.match(guides, /"kla-klok": \{/);
  assert.match(availability, /'kla-klok': 'Kla Klok'/);
});
