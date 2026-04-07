<script setup lang="ts">
import type {
  PaybackCurrency,
  PaybackInputRow,
} from "~/lib/payback-calculator";
import { createEmptyPaybackRow } from "~/lib/payback-calculator";

const props = defineProps<{
  copied: boolean;
  canCopy: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: "load-example"): void;
  (e: "copy-result"): void;
  (e: "sync-rows-from-raw"): void;
}>();

const currency = defineModel<PaybackCurrency>("currency", { required: true });
const rows = defineModel<PaybackInputRow[]>("rows", { required: true });
const raw = defineModel<string>("raw", { required: true });

const nameInputRefs = ref<(HTMLInputElement | null)[]>([]);

function setNameInputRef(element: Element | null, index: number) {
  nameInputRefs.value[index] = element as HTMLInputElement | null;
}

async function focusRowNameInput(index: number) {
  await nextTick();
  nameInputRefs.value[index]?.focus();
}

async function addRow() {
  rows.value = [...rows.value, createEmptyPaybackRow()];
  await focusRowNameInput(rows.value.length - 1);
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, rowIndex) => rowIndex !== index);
  nameInputRefs.value.splice(index, 1);
}
</script>

<template>
  <div class="rounded-xl border bg-white p-4">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-semibold">Input</h2>
      <select v-model="currency" class="rounded-lg border px-2 py-1 text-sm">
        <option value="USD">USD</option>
        <option value="KHR">KHR</option>
      </select>
    </div>

    <div class="overflow-auto rounded-xl border">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="w-[55%] p-2 text-left">Name</th>
            <th class="w-[35%] p-2 text-right">Amount</th>
            <th class="w-[10%] p-2"></th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="index"
            class="border-t align-top"
          >
            <td class="p-2">
              <input
                :ref="(element) => setNameInputRef(element, index)"
                v-model.trim="row.name"
                class="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g. Mina"
              />
            </td>

            <td class="p-2">
              <input
                v-model.trim="row.amount"
                inputmode="decimal"
                class="w-full rounded-lg border px-3 py-2 text-right outline-none focus:ring-2 focus:ring-black/10"
                placeholder="e.g. 5"
              />
            </td>

            <td class="p-2 text-right">
              <button
                class="rounded-lg border px-2 py-2 hover:bg-gray-100"
                type="button"
                :aria-label="`Remove row ${index + 1}`"
                @click="removeRow(index)"
              >
                ✕
              </button>
            </td>
          </tr>

          <tr v-if="rows.length === 0">
            <td class="p-3 text-gray-500" colspan="3">
              No rows yet. Click “Add row”.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2">
      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99]"
        type="button"
        @click="addRow"
      >
        <span class="text-base leading-none">＋</span>
        <span class="truncate">Add row</span>
      </button>

      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-black px-3 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99]"
        type="button"
        @click="emit('load-example')"
      >
        <span class="truncate">Load example</span>
      </button>

      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:opacity-40 disabled:hover:bg-white disabled:active:scale-100 active:scale-[0.99]"
        type="button"
        :disabled="!props.canCopy"
        @click="emit('copy-result')"
      >
        <svg
          v-if="!props.copied"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="h-4 w-4"
        >
          <path
            fill="currentColor"
            d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="h-4 w-4"
        >
          <path
            fill="currentColor"
            d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
          />
        </svg>

        <span class="truncate">{{ props.copied ? "Copied" : "Copy" }}</span>
      </button>
    </div>

    <details class="mt-4">
      <summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
        Paste mode (optional)
      </summary>

      <textarea
        v-model="raw"
        class="mt-2 h-40 w-full rounded-xl border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-black/10"
        placeholder="Example:
Mina 5$
Sreynea : 10$
John 4
Minea: 0
Reak: 0
Jompa: 38$"
      />

      <div class="mt-2 flex gap-2">
        <button
          class="rounded-lg border bg-white px-4 py-2 hover:bg-gray-100"
          type="button"
          @click="emit('sync-rows-from-raw')"
        >
          Apply paste to rows
        </button>
      </div>
    </details>

    <p v-if="props.error" class="mt-3 text-sm text-red-600">
      {{ props.error }}
    </p>
  </div>
</template>
