<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import {
  KLA_KLOK_SYMBOLS,
  calculateKlaKlokRound,
  getKlaKlokSymbol,
  rollKlaKlokDice,
  type KlaKlokRound,
  type KlaKlokSymbolId,
} from "~/lib/kla-klok";
import { playKlaKlokRollSound } from "~/lib/kla-klok-sound";

const { t } = useAppI18n();


type RoundHistory = {
  id: number;
  dice: [KlaKlokSymbolId, KlaKlokSymbolId, KlaKlokSymbolId];
  selectedSymbols: KlaKlokSymbolId[];
  pointPerSymbol: number;
  result: KlaKlokRound;
};

const STARTING_BALANCE = 500;
const COVER_CLOSE_MS = 420;
const BOWL_SHAKE_MS = 1_100;
const COVER_REVEAL_MS = 650;
const pointOptions = [10, 25, 50, 100];
const selectedSymbols = ref<KlaKlokSymbolId[]>(["tiger"]);
const pointPerSymbol = ref(10);
const balance = ref(STARTING_BALANCE);
const dice = ref<[KlaKlokSymbolId, KlaKlokSymbolId, KlaKlokSymbolId]>([
  "tiger",
  "gourd",
  "crab",
]);
const isRolling = ref(false);
const isSettling = ref(false);
const isCovered = ref(true);
const isRevealing = ref(false);
const soundEnabled = ref(true);
const history = ref<RoundHistory[]>([]);
const lastResult = ref<KlaKlokRound | null>(null);
const statusMessage = ref<{ key: string; params: Record<string, unknown> }>({ key: "products.games.board.choose_and_roll", params: {  } });

const totalStake = computed(() => selectedSymbols.value.length * pointPerSymbol.value);
const hasEnoughPoints = computed(() => totalStake.value <= balance.value);
const isAnimating = computed(() => isRolling.value || isSettling.value);
const canRoll = computed(
  () => selectedSymbols.value.length > 0 && hasEnoughPoints.value && !isAnimating.value,
);

function toggleSymbol(symbolId: KlaKlokSymbolId) {
  if (isAnimating.value) return;

  selectedSymbols.value = selectedSymbols.value.includes(symbolId)
    ? selectedSymbols.value.filter((selected) => selected !== symbolId)
    : [...selectedSymbols.value, symbolId];
  lastResult.value = null;
  statusMessage.value = selectedSymbols.value.length
    ? { key: "products.games.board.selected_count", params: { value: selectedSymbols.value.length } }
    : { key: "products.games.board.choose_at_least_one", params: {  } };
}

function selectPointValue(value: number) {
  if (isAnimating.value) return;
  pointPerSymbol.value = value;
  lastResult.value = null;
}

async function rollDice() {
  if (!canRoll.value) return;

  statusMessage.value = { key: "products.games.board.rolling", params: {  } };
  let stopRollSound: (() => void) | null = null;

  try {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!isCovered.value) {
      isSettling.value = true;
      isRevealing.value = false;
      isCovered.value = true;
      await waitForAnimation(prefersReducedMotion ? 80 : COVER_CLOSE_MS);
      isSettling.value = false;
    }

    isRolling.value = true;
    if (soundEnabled.value) {
      stopRollSound = playKlaKlokRollSound(BOWL_SHAKE_MS);
    }
    await waitForAnimation(prefersReducedMotion ? 120 : BOWL_SHAKE_MS);
    const rolledDice = rollKlaKlokDice();
    const result = calculateKlaKlokRound({
      selectedSymbols: selectedSymbols.value,
      pointPerSymbol: pointPerSymbol.value,
      dice: rolledDice,
    });

    dice.value = rolledDice;
    // Reveal the result only after the covered dish has finished shaking.
    await nextTick();
    isSettling.value = true;
    isRolling.value = false;
    isRevealing.value = true;
    isCovered.value = false;
    await waitForAnimation(prefersReducedMotion ? 80 : COVER_REVEAL_MS);

    balance.value += result.balanceDelta;
    lastResult.value = result;
    history.value.unshift({
      id: Date.now(),
      dice: rolledDice,
      selectedSymbols: [...selectedSymbols.value],
      pointPerSymbol: pointPerSymbol.value,
      result,
    });
    history.value = history.value.slice(0, 5);

    statusMessage.value = result.matches.length
      ? { key: "products.games.board.matched_count", params: { value: result.matches.reduce((total, match) => total + match.count, 0), value_2: formatSigned(result.balanceDelta) } }
      : { key: "products.games.board.no_match", params: { value: formatSigned(result.balanceDelta) } };
  } catch {
    statusMessage.value = { key: "products.games.board.roll_failed", params: {  } };
  } finally {
    stopRollSound?.();
    isRolling.value = false;
    isSettling.value = false;
    isRevealing.value = false;
  }
}

function resetGame() {
  selectedSymbols.value = ["tiger"];
  pointPerSymbol.value = 10;
  balance.value = STARTING_BALANCE;
  dice.value = ["tiger", "gourd", "crab"];
  isCovered.value = true;
  isRevealing.value = false;
  history.value = [];
  lastResult.value = null;
  statusMessage.value = { key: "products.games.board.choose_and_roll", params: {  } };
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function waitForAnimation(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}
</script>

<template>
  <section id="kla-klok-game" class="scroll-mt-20 px-3 py-14 sm:px-10 lg:px-16">
    <div class="mx-auto max-w-6xl">
      <div class="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{{ t("products.games.game_preview") }}</p>
          <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">{{ t("products.games.board.try_game") }}</h2>
          <p class="mt-2 text-sm text-white/50">{{ t("products.games.entertainment_only_virtual_coins_no_account_needed") }}</p>
        </div>
        <div class="flex items-center justify-between gap-4 rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] px-4 py-3 sm:min-w-52">
          <span class="text-xs font-semibold uppercase tracking-wider text-amber-100/65">{{ t("products.games.virtual_coins") }}</span>
          <strong class="text-2xl tabular-nums text-amber-300">{{ balance }}</strong>
        </div>
      </div>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div class="rounded-3xl border border-white/10 bg-[#0e2138] p-4 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">{{ t("products.games.1_choose") }}</p>
              <h3 class="mt-1 text-lg font-bold text-white">{{ t("products.games.board.choose_symbols") }}</h3>
            </div>
            <span class="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/60">
              {{ selectedSymbols.length }}/6
            </span>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KlaKlokSymbolCard
              v-for="symbol in KLA_KLOK_SYMBOLS"
              :key="symbol.id"
              :symbol="symbol"
              :selected="selectedSymbols.includes(symbol.id)"
              :disabled="isAnimating"
              @toggle="toggleSymbol"
            />
          </div>

          <div class="mt-7 border-t border-white/10 pt-6">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">{{ t("products.games.2_points") }}</p>
                <h3 class="mt-1 text-base font-bold text-white">{{ t("products.games.board.points_per_symbol") }}</h3>
              </div>
              <span class="text-sm text-white/45">{{ t("products.games.total") }} <strong class="text-white">{{ totalStake }}</strong></span>
            </div>
            <div class="mt-4 grid grid-cols-4 gap-2">
              <button
                v-for="value in pointOptions"
                :key="value"
                type="button"
                class="min-h-11 rounded-xl border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-50"
                :class="pointPerSymbol === value
                  ? 'border-amber-300 bg-amber-300 text-[#401515]'
                  : 'border-white/10 bg-white/[0.04] text-white hover:border-white/25'"
                :aria-pressed="pointPerSymbol === value"
                :disabled="isAnimating"
                @click="selectPointValue(value)"
              >
                {{ value }}
              </button>
            </div>
            <p v-if="!hasEnoughPoints" class="mt-3 text-sm font-semibold text-red-300">
              {{ t("products.games.board.not_enough_points") }}
            </p>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-[#0a1a2d] p-4 sm:p-6">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">{{ t("products.games.3_roll") }}</p>
              <h3 class="mt-1 text-lg font-bold text-white">{{ t("products.games.board.dice_results") }}</h3>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-semibold text-white/55 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                :aria-label="soundEnabled ? t(&quot;products.games.board.mute&quot;) : t(&quot;products.games.board.unmute&quot;)"
                :aria-pressed="soundEnabled"
                :disabled="isAnimating"
                @click="soundEnabled = !soundEnabled"
              >
                {{ soundEnabled ? t("products.games.board.sound_on") : t("products.games.board.sound_off") }}
              </button>
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                :disabled="isAnimating"
                @click="resetGame"
              >
                {{ t("products.common.reset") }}
              </button>
            </div>
          </div>

          <KlaKlokBowl
            class="mt-3"
            :covered="isCovered"
            :rolling="isRolling"
            :revealing="isRevealing"
          >
            <KlaKlokDice
              v-for="(symbolId, index) in dice"
              :key="index"
              :symbol="symbolId"
              :rolling="isRolling"
              :roll-index="index"
              size="game"
            />
          </KlaKlokBowl>

          <div
            class="mt-7 min-h-20 rounded-2xl border p-4 text-center"
            :class="lastResult?.matches.length
              ? 'border-amber-300/30 bg-amber-300/[0.08]'
              : 'border-white/10 bg-white/[0.035]'"
            aria-live="polite"
            :aria-busy="isAnimating"
          >
            <p class="text-sm font-semibold" :class="lastResult?.matches.length ? 'text-amber-200' : 'text-white/65'">
              {{ t(statusMessage.key, statusMessage.params) }}
            </p>
            <div v-if="lastResult?.matches.length" class="mt-2 flex flex-wrap justify-center gap-2">
              <span
                v-for="match in lastResult.matches"
                :key="match.symbolId"
                class="rounded-full bg-white/[0.07] px-3 py-1 text-xs font-bold text-white"
              >
                {{ getKlaKlokSymbol(match.symbolId).glyph }} {{ match.count }}× = +{{ match.winnings }}
              </span>
            </div>
          </div>

          <div class="kla-roll-dock mt-5">
            <button
              type="button"
              class="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#d64c4c] px-6 text-base font-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.28)] transition hover:bg-[#bd3e3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
              :disabled="!canRoll"
              @click="rollDice"
            >
              <span aria-hidden="true">🎲</span>
              {{ isAnimating ? t("products.games.board.rolling_button") : t("products.games.board.roll_button") }}
            </button>
          </div>

          <div class="mt-7 border-t border-white/10 pt-5">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-white">{{ t("products.games.board.recent_results") }}</h3>
              <span class="text-xs text-white/40">{{ t("products.games.recent_results") }}</span>
            </div>
            <div v-if="history.length" class="mt-3 space-y-2">
              <div
                v-for="round in history"
                :key="round.id"
                class="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
              >
                <span class="text-xl tracking-wide" :aria-label="round.dice.map((symbolId) => t(getKlaKlokSymbol(symbolId).labelKey)).join(', ')">
                  {{ round.dice.map((symbolId) => getKlaKlokSymbol(symbolId).glyph).join(" ") }}
                </span>
                <strong
                  class="text-sm tabular-nums"
                  :class="round.result.balanceDelta >= 0 ? 'text-emerald-300' : 'text-red-300'"
                >
                  {{ formatSigned(round.result.balanceDelta) }}
                </strong>
              </div>
            </div>
            <p v-else class="mt-3 rounded-xl bg-white/[0.03] px-3 py-4 text-center text-xs text-white/35">
              {{ t("products.games.board.empty_results") }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@media (max-width: 639px) {
  .kla-roll-dock {
    position: sticky;
    bottom: calc(5.75rem + env(safe-area-inset-bottom));
    z-index: 25;
    padding-block: 0.25rem;
    background: #0a1a2d;
  }
}
</style>
