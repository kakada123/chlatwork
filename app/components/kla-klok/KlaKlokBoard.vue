<script setup lang="ts">
import {
  KLA_KLOK_SYMBOLS,
  calculateKlaKlokRound,
  getKlaKlokSymbol,
  rollKlaKlokDice,
  type KlaKlokRound,
  type KlaKlokSymbolId,
} from "~/lib/kla-klok";

type RoundHistory = {
  id: number;
  dice: [KlaKlokSymbolId, KlaKlokSymbolId, KlaKlokSymbolId];
  selectedSymbols: KlaKlokSymbolId[];
  pointPerSymbol: number;
  result: KlaKlokRound;
};

const STARTING_BALANCE = 500;
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
const history = ref<RoundHistory[]>([]);
const lastResult = ref<KlaKlokRound | null>(null);
const statusMessage = ref("ជ្រើសរើសរូប រួចចាក់គ្រាប់។");

const totalStake = computed(() => selectedSymbols.value.length * pointPerSymbol.value);
const hasEnoughPoints = computed(() => totalStake.value <= balance.value);
const canRoll = computed(
  () => selectedSymbols.value.length > 0 && hasEnoughPoints.value && !isRolling.value,
);

function toggleSymbol(symbolId: KlaKlokSymbolId) {
  if (isRolling.value) return;

  selectedSymbols.value = selectedSymbols.value.includes(symbolId)
    ? selectedSymbols.value.filter((selected) => selected !== symbolId)
    : [...selectedSymbols.value, symbolId];
  lastResult.value = null;
  statusMessage.value = selectedSymbols.value.length
    ? `បានជ្រើស ${selectedSymbols.value.length} រូប។ ត្រៀមចាក់គ្រាប់!`
    : "សូមជ្រើសរើសយ៉ាងហោចណាស់មួយរូប។";
}

function selectPointValue(value: number) {
  if (isRolling.value) return;
  pointPerSymbol.value = value;
  lastResult.value = null;
}

async function rollDice() {
  if (!canRoll.value) return;

  isRolling.value = true;
  statusMessage.value = "កំពុងចាក់គ្រាប់…";

  try {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
    const rolledDice = rollKlaKlokDice();
    const result = calculateKlaKlokRound({
      selectedSymbols: selectedSymbols.value,
      pointPerSymbol: pointPerSymbol.value,
      dice: rolledDice,
    });

    dice.value = rolledDice;
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
      ? `ត្រូវ ${result.matches.reduce((total, match) => total + match.count, 0)} គ្រាប់ · ${formatSigned(result.balanceDelta)} ពិន្ទុ`
      : `មិនត្រូវទេ · ${formatSigned(result.balanceDelta)} ពិន្ទុ`;
  } catch {
    statusMessage.value = "មិនអាចចាក់គ្រាប់បានទេ។ សូមសាកល្បងម្ដងទៀត។";
  } finally {
    isRolling.value = false;
  }
}

function resetGame() {
  selectedSymbols.value = ["tiger"];
  pointPerSymbol.value = 10;
  balance.value = STARTING_BALANCE;
  dice.value = ["tiger", "gourd", "crab"];
  history.value = [];
  lastResult.value = null;
  statusMessage.value = "ជ្រើសរើសរូប រួចចាក់គ្រាប់។";
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
</script>

<template>
  <section id="kla-klok-game" class="scroll-mt-20 px-3 py-14 sm:px-10 lg:px-16">
    <div class="mx-auto max-w-6xl">
      <div class="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Game preview</p>
          <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">សាកល្បងលេងខ្លាឃ្លោក</h2>
          <p class="mt-2 text-sm text-white/50">Entertainment-only · virtual coins · no account needed</p>
        </div>
        <div class="flex items-center justify-between gap-4 rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] px-4 py-3 sm:min-w-52">
          <span class="text-xs font-semibold uppercase tracking-wider text-amber-100/65">Virtual coins</span>
          <strong class="text-2xl tabular-nums text-amber-300">{{ balance }}</strong>
        </div>
      </div>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div class="rounded-3xl border border-white/10 bg-[#0e2138] p-4 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">1 · Choose</p>
              <h3 class="mt-1 text-lg font-bold text-white">ជ្រើសរើសរូបមួយ ឬច្រើន</h3>
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
              :disabled="isRolling"
              @toggle="toggleSymbol"
            />
          </div>

          <div class="mt-7 border-t border-white/10 pt-6">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">2 · Points</p>
                <h3 class="mt-1 text-base font-bold text-white">ពិន្ទុក្នុងមួយរូប</h3>
              </div>
              <span class="text-sm text-white/45">Total: <strong class="text-white">{{ totalStake }}</strong></span>
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
                :disabled="isRolling"
                @click="selectPointValue(value)"
              >
                {{ value }}
              </button>
            </div>
            <p v-if="!hasEnoughPoints" class="mt-3 text-sm font-semibold text-red-300">
              ពិន្ទុមិនគ្រប់ទេ។ សូមបន្ថយពិន្ទុ ឬជ្រើសរើសរូបតិចជាងនេះ។
            </p>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-[#0a1a2d] p-4 sm:p-6">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">3 · Roll</p>
              <h3 class="mt-1 text-lg font-bold text-white">លទ្ធផលគ្រាប់</h3>
            </div>
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              :disabled="isRolling"
              @click="resetGame"
            >
              Reset
            </button>
          </div>

          <div class="mt-8 flex items-center justify-center gap-2 sm:gap-4">
            <KlaKlokDice v-for="(symbolId, index) in dice" :key="index" :symbol="symbolId" :rolling="isRolling" size="game" />
          </div>

          <div
            class="mt-7 min-h-20 rounded-2xl border p-4 text-center"
            :class="lastResult?.matches.length
              ? 'border-amber-300/30 bg-amber-300/[0.08]'
              : 'border-white/10 bg-white/[0.035]'"
            aria-live="polite"
          >
            <p class="text-sm font-semibold" :class="lastResult?.matches.length ? 'text-amber-200' : 'text-white/65'">
              {{ statusMessage }}
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
              {{ isRolling ? "កំពុងចាក់…" : "ចាក់គ្រាប់ · Roll Dice" }}
            </button>
          </div>

          <div class="mt-7 border-t border-white/10 pt-5">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-white">លទ្ធផលថ្មីៗ</h3>
              <span class="text-xs text-white/40">Recent results</span>
            </div>
            <div v-if="history.length" class="mt-3 space-y-2">
              <div
                v-for="round in history"
                :key="round.id"
                class="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
              >
                <span class="text-xl tracking-wide" :aria-label="round.dice.map((symbolId) => getKlaKlokSymbol(symbolId).labelEn).join(', ')">
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
              លទ្ធផលរបស់អ្នកនឹងបង្ហាញនៅទីនេះ។
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
