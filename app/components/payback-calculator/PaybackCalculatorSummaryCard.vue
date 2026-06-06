<script setup lang="ts">
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
}>();

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
  <div class="money-summary-surface min-w-0 rounded-xl border p-4">
    <h2 class="mb-3 font-semibold">Summary</h2>

    <div class="grid grid-cols-3 gap-3">
      <div class="money-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="money-summary-muted text-xs">People</div>
        <div class="text-lg font-bold">{{ props.people.length }}</div>
      </div>
      <div class="money-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="money-summary-muted text-xs">Total</div>
        <div class="min-w-0 truncate text-base font-bold leading-tight sm:text-lg">
          <MoneyAmount :value="props.total" :currency="props.currency" />
        </div>
      </div>
      <div class="money-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="money-summary-muted text-xs">Average</div>
        <div class="min-w-0 truncate text-base font-bold leading-tight sm:text-lg">
          <MoneyAmount :value="props.avg" :currency="props.currency" />
        </div>
      </div>
    </div>

    <div class="mt-4">
      <h3 class="mb-2 font-semibold">Balances</h3>

      <div class="money-summary-card overflow-auto rounded-xl border">
        <table class="w-full text-sm">
          <thead class="money-summary-card-muted">
            <tr>
              <th class="p-2 text-left">Name</th>
              <th class="p-2 text-right">Paid</th>
              <th class="p-2 text-right">Balance</th>
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

    <div class="mt-4">
      <h3 class="mb-2 font-semibold">Who pays who</h3>

      <div v-if="props.settlements.length === 0" class="money-summary-muted text-sm">
        Add input to see settlements.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="(settlement, index) in props.settlements"
          :key="`${settlement.from}-${settlement.to}-${index}`"
          class="money-summary-card-muted flex min-w-0 items-center justify-between gap-3 rounded-xl border p-3"
        >
          <div class="min-w-0 truncate text-sm">
            <span class="font-semibold">{{ settlement.from }}</span>
            <span class="money-summary-muted"> → </span>
            <span class="font-semibold">{{ settlement.to }}</span>
          </div>
          <div class="min-w-0 max-w-[45%] shrink-0 truncate text-right font-bold">
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
      class="money-summary-card-muted mt-4 space-y-3 rounded-xl border p-3"
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

    <p class="money-summary-muted mt-4 text-xs">
      Tip: rows like <span class="font-mono">Name + Amount</span> are easier.
      Paste mode still supports <span class="font-mono">Name: 10$</span> or
      <span class="font-mono">Name 10</span>.
    </p>
  </div>
</template>
