<script setup lang="ts">
import { ArrowRight, Check, LoaderCircle, Save } from "lucide-vue-next";
import type {
  PaybackCurrency,
  PaybackKhrRemainderMeta,
  PaybackKhrRemainderMode,
  PaybackPerson,
  PaybackSettlement,
} from "~/lib/payback-calculator";

const props = defineProps<{
  currency: PaybackCurrency;
  people: PaybackPerson[];
  total: number;
  avg: number;
  settlements: PaybackSettlement[];
  khrRemainder: PaybackKhrRemainderMeta;
  uniqueNames: string[];
  canSave: boolean;
  saveState: 'idle' | 'saving' | 'saved' | 'failed';
}>();

const emit = defineEmits<{ save: [] }>();

const khrRemainderMode = defineModel<PaybackKhrRemainderMode>(
  "khrRemainderMode",
  { required: true },
);
const khrRemainderPayer = defineModel<string>("khrRemainderPayer", {
  required: true,
});

const showKhrRemainder = computed(
  () => props.currency === "KHR" && props.khrRemainder.leftover > 0,
);

function balanceClass(value: number) {
  if (value > 0) {
    return "money-value-positive";
  }

  if (value < 0) {
    return "money-value-negative";
  }

  return "money-value-neutral";
}
</script>

<template>
  <section class="payback-card money-summary-surface min-w-0 rounded-2xl border p-5 shadow-sm shadow-sky-100/60 sm:p-6">
    <div class="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 class="font-bold">Settlement</h2>
        <p class="money-summary-muted mt-1 text-sm">Here’s the fairest way to balance the group.</p>
      </div>
      <button
        type="button"
        class="payback-secondary inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!props.canSave || props.saveState === 'saving'"
        @click="emit('save')"
      >
        <LoaderCircle v-if="props.saveState === 'saving'" class="h-4 w-4 animate-spin" aria-hidden="true" />
        <Check v-else-if="props.saveState === 'saved'" class="h-4 w-4" aria-hidden="true" />
        <Save v-else class="h-4 w-4" aria-hidden="true" />
        <span class="hidden sm:inline">{{ props.saveState === 'saved' ? 'Saved' : 'Save history' }}</span>
        <span class="sm:hidden">{{ props.saveState === 'saved' ? 'Saved' : 'Save' }}</span>
      </button>
    </div>

    <p v-if="props.saveState === 'failed'" class="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-200" role="alert">
      Could not save this calculation. Please try again.
    </p>

    <div class="grid grid-cols-3 gap-3 sm:gap-4">
      <div class="money-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="money-summary-muted text-xs font-semibold uppercase tracking-wide">People</div>
        <div class="text-lg font-bold">{{ props.people.length }}</div>
      </div>
      <div class="money-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="money-summary-muted text-xs font-semibold uppercase tracking-wide">Total paid</div>
        <div class="min-w-0 truncate text-base font-bold leading-tight sm:text-lg">
          <MoneyAmount :value="props.total" :currency="props.currency" />
        </div>
      </div>
      <div class="money-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="money-summary-muted text-xs font-semibold uppercase tracking-wide">Each share</div>
        <div class="min-w-0 truncate text-base font-bold leading-tight sm:text-lg">
          <MoneyAmount :value="props.avg" :currency="props.currency" />
        </div>
      </div>
    </div>

    <div class="mt-6">
      <h3 class="mb-3 text-sm font-bold">Payment breakdown</h3>

      <div class="money-summary-card overflow-auto rounded-xl border">
        <table class="w-full text-sm">
          <thead class="money-summary-card-muted">
            <tr>
              <th class="p-2 text-left">Name</th>
              <th class="p-2 text-right">Paid</th>
              <th class="p-2 text-right">Gets / owes</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="person in props.people"
              :key="person.name"
              class="border-t"
            >
              <td class="min-w-0 p-2 font-medium">
                <span class="block max-w-[10rem] truncate sm:max-w-none">
                  {{ person.name }}
                </span>
              </td>
              <td class="max-w-[9rem] p-2 text-right sm:max-w-none">
                <MoneyAmount :value="person.paid" :currency="props.currency" />
              </td>
              <td class="max-w-[9rem] p-2 text-right sm:max-w-none">
                <span
                  class="font-semibold"
                  :class="balanceClass(person.balance)"
                >
                  <MoneyAmount
                    :value="person.balance"
                    :currency="props.currency"
                    show-positive-sign
                  />
                </span>
              </td>
            </tr>

            <tr v-if="props.people.length === 0">
              <td class="money-summary-muted p-3" colspan="3">No data yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mt-6">
      <h3 class="mb-3 text-sm font-bold">Payments to make</h3>

      <div v-if="props.settlements.length === 0" class="money-summary-muted text-sm">
        Add at least two people and their amounts to see the payments.
      </div>

      <ul
        v-else
        class="money-summary-card divide-y overflow-hidden rounded-xl border"
      >
        <li
          v-for="(settlement, index) in props.settlements"
          :key="`${settlement.from}-${settlement.to}-${index}`"
          class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-4"
        >
          <div class="flex min-w-0 items-center gap-2 text-sm">
            <span class="min-w-0 truncate font-semibold">{{ settlement.from }}</span>
            <ArrowRight
              class="money-summary-muted h-4 w-4 shrink-0"
              aria-label="pays"
            />
            <span class="min-w-0 truncate font-semibold">{{ settlement.to }}</span>
          </div>
          <div class="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-right text-sm font-bold text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200">
            <MoneyAmount
              :value="settlement.amount"
              :currency="props.currency"
            />
          </div>
        </li>
      </ul>
    </div>

    <div
      v-if="showKhrRemainder"
      class="money-summary-card-muted mt-6 space-y-4 rounded-xl border p-4"
    >
      <div>
        <h3 class="font-semibold">KHR rounding remainder</h3>
        <p class="money-summary-body mt-1 text-sm">
          Remaining amount that cannot be evenly split by 100៛:
          <span class="font-semibold">
            <MoneyAmount
              :value="props.khrRemainder.leftover"
              currency="KHR"
            />
          </span>
        </p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium">
          How should this leftover be handled?
        </label>

        <select
          v-model="khrRemainderMode"
          class="money-summary-control h-11 w-full rounded-lg border px-3 text-sm"
        >
          <option value="LEFTOVER_ONLY">Keep leftover separate</option>
          <option value="ASSIGN_TO_PERSON">Assign leftover to one person</option>
        </select>
      </div>

      <div v-if="khrRemainderMode === 'ASSIGN_TO_PERSON'">
        <label class="mb-1 block text-sm font-medium">
          Who covers the leftover?
        </label>

        <select
          v-model="khrRemainderPayer"
          class="money-summary-control h-11 w-full rounded-lg border px-3 text-sm"
        >
          <option
            v-for="option in props.uniqueNames"
            :key="option"
            :value="option"
          >
            {{ option }}
          </option>
        </select>
      </div>

      <p class="money-summary-muted text-xs">
        This only affects the small KHR remainder after rounding to 100៛.
      </p>
    </div>

  </section>
</template>
