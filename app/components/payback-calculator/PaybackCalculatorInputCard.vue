<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";
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

const currency = defineModel<PaybackCurrency>("currency", {
  required: true,
});

const rows = defineModel<PaybackInputRow[]>("rows", {
  required: true,
});

const raw = defineModel<string>("raw", {
  required: true,
});

const nameInputRefs = ref<(HTMLInputElement | null)[]>([]);

onBeforeUpdate(() => {
  nameInputRefs.value = [];
});

function setNameInputRef(
  element: Element | ComponentPublicInstance | null,
  index: number,
) {
  nameInputRefs.value[index] = element as HTMLInputElement | null;
}

async function focusRowNameInput(index: number) {
  await nextTick();

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  const input = nameInputRefs.value[index];

  input?.scrollIntoView({
    block: "nearest",
    inline: "nearest",
  });

  input?.focus({
    preventScroll: true,
  });
}

async function addRow() {
  const nextRows = [...rows.value, createEmptyPaybackRow()];
  const newRowIndex = nextRows.length - 1;

  rows.value = nextRows;

  await focusRowNameInput(newRowIndex);
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, rowIndex) => rowIndex !== index);

  nameInputRefs.value.splice(index, 1);
}

/**
 * Keep the amount as a string while the user is typing.
 *
 * Valid temporary USD values:
 * "", ".", "0.", "5.", "5.2", "5.25"
 *
 * KHR accepts whole numbers only.
 */
function updateAmount(row: PaybackInputRow, event: Event) {
  const input = event.target as HTMLInputElement;

  let value = input.value.replace(/,/g, ".").replace(/[^\d.]/g, "");

  if (currency.value === "KHR") {
    value = value.replace(/\D/g, "");
  } else {
    const firstDecimalIndex = value.indexOf(".");

    if (firstDecimalIndex !== -1) {
      const integerPart = value.slice(0, firstDecimalIndex);
      const decimalPart = value
        .slice(firstDecimalIndex + 1)
        .replace(/\./g, "")
        .slice(0, 2);

      value = `${integerPart}.${decimalPart}`;
    }
  }

  row.amount = value;

  // Keep the native input value synchronized when invalid
  // characters or extra decimals were removed.
  if (input.value !== value) {
    input.value = value;
  }
}

watch(currency, (nextCurrency) => {
  if (nextCurrency !== "KHR") {
    return;
  }

  rows.value.forEach((row) => {
    const amount = String(row.amount ?? "");
    row.amount = amount.split(/[.,]/)[0]?.replace(/\D/g, "") ?? "";
  });
});
</script>

<template>
  <section class="payback-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-sky-100/60 sm:p-6 lg:h-full">
    <div class="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 class="font-bold text-slate-950 dark:text-white">Who paid?</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/50">Enter each person’s total contribution.</p>
      </div>

      <label class="sr-only" for="payback-currency">Currency</label>
      <select id="payback-currency" v-model="currency" class="payback-control h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-400 dark:text-white">
        <option value="USD">USD</option>
        <option value="KHR">KHR</option>
      </select>
    </div>

    <div class="payback-panel overflow-hidden rounded-xl border border-slate-200">
      <table class="w-full table-fixed text-sm">
        <thead class="payback-subtle text-xs uppercase tracking-wide text-slate-500 dark:text-white/45">
          <tr>
            <th class="w-[48%] p-2 text-left sm:w-[55%]">Person</th>

            <th class="w-[38%] p-2 text-right sm:w-[35%]">Paid ({{ currency }})</th>

            <th class="w-[14%] p-2 sm:w-[10%]"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="index"
            class="border-t border-slate-200 align-top dark:border-white/10"
          >
            <td class="p-2">
              <input
                :ref="(element) => setNameInputRef(element, index)"
                v-model.trim="row.name"
                type="text"
                autocomplete="off"
                class="payback-control h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:text-white dark:placeholder:text-white/30"
                placeholder="Name"
              />
            </td>

            <td class="p-2">
              <input
                :value="row.amount"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                class="payback-control h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-right tabular-nums text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:text-white dark:placeholder:text-white/30"
                :placeholder="currency === 'USD' ? '0.00' : '0'"
                @input="updateAmount(row, $event)"
              />
            </td>

            <td class="p-2 text-right">
              <button
                class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-white/35 dark:hover:bg-red-400/10 dark:hover:text-red-300"
                type="button"
                :disabled="rows.length === 1"
                :aria-label="`Remove row ${index + 1}`"
                @click="removeRow(index)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
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

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <button
        class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100"
        type="button"
        @click="addRow"
      >
        <Plus class="h-4 w-4" aria-hidden="true" /> <span>Add person</span>
      </button>

      <button
        class="payback-secondary inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-white/75"
        type="button"
        @click="emit('load-example')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M4 19.5V5a2 2 0 0 1 2-2h8.5L20 8.5V19a2 2 0 0 1-2 2H5.5A1.5 1.5 0 0 1 4 19.5Z"
          />
          <path d="M14 3v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>

        <span class="truncate">Try example</span>
      </button>

      <button
        class="payback-secondary inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/75"
        type="button"
        :disabled="!props.canCopy"
        @click="emit('copy-result')"
      >
        <svg
          v-if="!props.copied"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="h-4 w-4"
          aria-hidden="true"
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
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
          />
        </svg>

        <span class="truncate">
          {{ props.copied ? "Copied" : "Copy result" }}
        </span>
      </button>
    </div>

    <details class="payback-subtle mt-4 rounded-xl p-4">
      <summary class="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-white/60 dark:hover:text-white">
        Paste a list instead
      </summary>

      <textarea
        v-model="raw"
        class="mt-3 h-36 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm text-slate-950 outline-none focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
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
          class="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2 hover:bg-gray-100"
          type="button"
          @click="emit('sync-rows-from-raw')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M8 4h8" />
            <path d="M9 2h6v4H9z" />
            <path
              d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
            />
            <path d="m9 14 2 2 4-4" />
          </svg>

          <span>Use this list</span>
        </button>
      </div>
    </details>

    <p v-if="props.error" class="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-400/10 dark:text-red-200" role="alert">
      {{ props.error }}
    </p>
  </section>
</template>
