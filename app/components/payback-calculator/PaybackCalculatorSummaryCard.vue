<script setup lang="ts">
import type {
  PaybackCurrency,
  PaybackKhrRemainderMeta,
  PaybackKhrRemainderMode,
  PaybackPerson,
  PaybackSettlement,
} from "~/lib/payback-calculator";
import {
  formatPaybackAmount,
  formatPaybackExactKhr,
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

function fmt(value: number) {
  return formatPaybackAmount(value, props.currency);
}
</script>

<template>
  <div class="rounded-xl border bg-white p-4">
    <h2 class="mb-3 font-semibold">Summary</h2>

    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-xl border bg-gray-50 p-3">
        <div class="text-xs text-gray-500">People</div>
        <div class="text-lg font-bold">{{ props.people.length }}</div>
      </div>
      <div class="rounded-xl border bg-gray-50 p-3">
        <div class="text-xs text-gray-500">Total</div>
        <div class="text-lg font-bold">{{ fmt(props.total) }}</div>
      </div>
      <div class="rounded-xl border bg-gray-50 p-3">
        <div class="text-xs text-gray-500">Average</div>
        <div class="text-lg font-bold">{{ fmt(props.avg) }}</div>
      </div>
    </div>

    <div class="mt-4">
      <h3 class="mb-2 font-semibold">Balances</h3>

      <div class="overflow-auto rounded-xl border">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
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
              <td class="p-2 font-medium">{{ person.name }}</td>
              <td class="p-2 text-right">{{ fmt(person.paid) }}</td>
              <td class="p-2 text-right">
                <span
                  class="font-semibold"
                  :class="
                    person.balance >= 0 ? 'text-green-700' : 'text-red-700'
                  "
                >
                  {{ person.balance >= 0 ? "+" : "" }}{{ fmt(person.balance) }}
                </span>
              </td>
            </tr>

            <tr v-if="props.people.length === 0">
              <td class="p-3 text-gray-500" colspan="3">No data yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mt-4">
      <h3 class="mb-2 font-semibold">Who pays who</h3>

      <div v-if="props.settlements.length === 0" class="text-sm text-gray-500">
        Add input to see settlements.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="(settlement, index) in props.settlements"
          :key="`${settlement.from}-${settlement.to}-${index}`"
          class="flex items-center justify-between gap-3 rounded-xl border bg-gray-50 p-3"
        >
          <div class="text-sm">
            <span class="font-semibold">{{ settlement.from }}</span>
            <span class="text-gray-500"> → </span>
            <span class="font-semibold">{{ settlement.to }}</span>
          </div>
          <div class="font-bold">{{ fmt(settlement.amount) }}</div>
        </li>
      </ul>
    </div>

    <div
      v-if="showKhrRemainder"
      class="mt-4 space-y-3 rounded-xl border bg-gray-50 p-3"
    >
      <div>
        <h3 class="font-semibold">KHR rounding remainder</h3>
        <p class="mt-1 text-sm text-gray-600">
          Remaining amount that cannot be evenly split by 100៛:
          <span class="font-semibold">
            {{ formatPaybackExactKhr(props.khrRemainder.leftover) }}
          </span>
        </p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium">
          How should this leftover be handled?
        </label>

        <select
          v-model="khrRemainderMode"
          class="w-full rounded-lg border bg-white px-3 py-2 text-sm"
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
          class="w-full rounded-lg border bg-white px-3 py-2 text-sm"
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

      <p class="text-xs text-gray-500">
        This only affects the small KHR remainder after rounding to 100៛.
      </p>
    </div>

    <p class="mt-4 text-xs text-gray-500">
      Tip: rows like <span class="font-mono">Name + Amount</span> are easier.
      Paste mode still supports <span class="font-mono">Name: 10$</span> or
      <span class="font-mono">Name 10</span>.
    </p>
  </div>
</template>
