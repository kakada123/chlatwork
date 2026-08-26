<script setup lang="ts">
import { Check, ChevronDown, ReceiptText } from "lucide-vue-next";
import type { ExpenseCurrency, ExpenseRow } from "~/lib/expense-tracker";
import {
  createExpenseRow,
  expenseCategories,
  parseExpenseAmountToCents,
  todayISO,
} from "~/lib/expense-tracker";

const props = withDefaults(
  defineProps<{
    currency: ExpenseCurrency;
    busy?: boolean;
    submitLabel?: string;
    autofocus?: boolean;
  }>(),
  {
    busy: false,
    submitLabel: "Add expense",
    autofocus: false,
  },
);

const emit = defineEmits<{
  submit: [row: ExpenseRow];
}>();

const featuredCategories = ["Food", "Coffee", "Transport", "Bills", "Shopping", "Other"];
const amount = ref("");
const category = ref("Food");
const customCategory = ref("");
const date = ref(todayISO());
const note = ref("");
const error = ref("");
const amountInput = ref<HTMLInputElement | null>(null);
const categoryPicker = ref<HTMLDetailsElement | null>(null);
const customCategoryInput = ref<HTMLInputElement | null>(null);
const formId = useId();
const amountId = `${formId}-amount`;
const currencyId = `${formId}-currency`;
const errorId = `${formId}-error`;
const noteId = `${formId}-note`;
const customCategoryId = `${formId}-custom-category`;
const categoryLabel = computed(() =>
  category.value === "__custom__"
    ? customCategory.value.trim() || "Custom category"
    : category.value,
);

function focusAmount() {
  amountInput.value?.focus();
}

function resetForm() {
  amount.value = "";
  note.value = "";
  date.value = todayISO();
  error.value = "";
}

async function selectMobileCategory(value: string) {
  category.value = value;
  if (categoryPicker.value) {
    categoryPicker.value.open = false;
  }

  if (value === "__custom__") {
    await nextTick();
    customCategoryInput.value?.focus();
  }
}

function submit() {
  error.value = "";

  try {
    parseExpenseAmountToCents(amount.value);
  } catch {
    error.value = "Enter an amount greater than zero with up to 2 decimal places.";
    focusAmount();
    return;
  }

  if (category.value === "__custom__" && !customCategory.value.trim()) {
    error.value = "Enter a category name.";
    return;
  }

  const row = createExpenseRow(category.value, date.value);
  if (category.value === "__custom__") {
    row.customCategory = customCategory.value.trim();
  }
  row.amount = amount.value.trim();
  row.note = note.value.trim();
  row.showNote = Boolean(row.note);
  emit("submit", row);
}

onMounted(async () => {
  if (!props.autofocus) return;
  await nextTick();
  focusAmount();
});

defineExpose({ focusAmount, resetForm });
</script>

<template>
  <form class="min-w-0 max-w-full space-y-3 sm:space-y-5" @submit.prevent="submit">
    <div class="sm:grid sm:grid-cols-[minmax(0,1fr)_18rem] sm:items-end sm:gap-3">
      <div class="min-w-0">
        <label :for="amountId" class="sr-only sm:not-sr-only sm:mb-2 sm:block sm:text-sm sm:font-bold sm:text-slate-700 sm:dark:text-white/75">
          Amount
        </label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-xl font-black text-sky-600 dark:text-cyan-200">
            {{ props.currency === "USD" ? "$" : "៛" }}
          </span>
          <input
            :id="amountId"
            ref="amountInput"
            v-model.trim="amount"
            name="amount"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            maxlength="15"
            class="h-14 w-full rounded-2xl border border-sky-200 bg-sky-50/70 pl-12 pr-20 text-right text-2xl font-black tabular-nums text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-cyan-300/20 dark:bg-cyan-300/[0.07] dark:text-white dark:placeholder:text-white/20 dark:focus:border-cyan-300/60 dark:focus:ring-cyan-300/10 sm:h-16 sm:text-3xl"
            placeholder="0.00"
            :aria-describedby="error ? `${currencyId} ${errorId}` : currencyId"
            :disabled="props.busy"
          />
          <span :id="currencyId" class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-black tracking-wider text-slate-500 dark:text-white/45">
            {{ props.currency }}
          </span>
        </div>
      </div>

      <button
        type="submit"
        class="hidden h-16 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-base font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:bg-cyan-200 dark:text-slate-950 dark:shadow-cyan-200/10 dark:hover:bg-cyan-100 dark:focus-visible:ring-offset-[#101214] sm:inline-flex"
        :disabled="props.busy"
      >
        <ReceiptText class="h-5 w-5" aria-hidden="true" />
        {{ props.busy ? "Saving…" : props.submitLabel }}
      </button>
    </div>

    <fieldset class="min-w-0 max-w-full overflow-hidden">
      <legend class="sr-only sm:not-sr-only sm:mb-2 sm:block sm:text-sm sm:font-bold sm:text-slate-700 sm:dark:text-white/75">Category</legend>
      <details ref="categoryPicker" class="group rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] sm:hidden">
        <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500">
          <span class="min-w-0">
            <span class="block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/40">Category</span>
            <span class="block truncate font-black text-slate-800 dark:text-white">{{ categoryLabel }}</span>
          </span>
          <ChevronDown class="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div class="grid grid-cols-2 gap-2 border-t border-slate-200 p-2 dark:border-white/10">
          <button
            v-for="item in expenseCategories"
            :key="`mobile-${item}`"
            type="button"
            class="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            :class="category === item
              ? 'border-sky-500 bg-sky-600 text-white dark:border-cyan-200 dark:bg-cyan-200 dark:text-slate-950'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65'"
            :disabled="props.busy"
            @click="selectMobileCategory(item)"
          >
            <Check v-if="category === item" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span class="truncate">{{ item }}</span>
          </button>
          <button
            type="button"
            class="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            :class="category === '__custom__'
              ? 'border-sky-500 bg-sky-600 text-white dark:border-cyan-200 dark:bg-cyan-200 dark:text-slate-950'
              : 'border-dashed border-slate-300 bg-slate-50 text-slate-600 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/65'"
            :disabled="props.busy"
            @click="selectMobileCategory('__custom__')"
          >
            <Check v-if="category === '__custom__'" class="h-3.5 w-3.5" aria-hidden="true" />
            Custom category
          </button>
        </div>
      </details>

      <div class="hidden w-full max-w-full gap-2 sm:grid sm:grid-cols-6">
        <button
          v-for="item in featuredCategories"
          :key="item"
          type="button"
          class="inline-flex min-h-11 min-w-[6rem] shrink-0 items-center justify-center gap-1 rounded-xl border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:min-w-0"
          :class="category === item
            ? 'border-sky-500 bg-sky-600 text-white shadow-sm dark:border-cyan-200 dark:bg-cyan-200 dark:text-slate-950'
            : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65 dark:hover:bg-white/10'"
          :disabled="props.busy"
          @click="category = item"
        >
          <Check v-if="category === item" class="h-3.5 w-3.5" aria-hidden="true" />
          {{ item }}
        </button>
      </div>
      <div class="relative mt-2 hidden sm:block">
        <select
          v-model="category"
          class="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/75 dark:focus:ring-cyan-300/10"
          :disabled="props.busy"
          aria-label="All expense categories"
        >
          <option v-for="item in expenseCategories" :key="item" :value="item">{{ item }}</option>
          <option value="__custom__">Custom category…</option>
        </select>
        <ChevronDown class="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
      <div v-if="category === '__custom__'" class="mt-2">
        <label :for="customCategoryId" class="sr-only">Custom category</label>
        <input
          :id="customCategoryId"
          ref="customCategoryInput"
          v-model.trim="customCategory"
          type="text"
          maxlength="80"
          class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/75 dark:focus:ring-cyan-300/10"
          placeholder="Enter your category"
          :disabled="props.busy"
        />
      </div>
    </fieldset>

    <details class="group hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.035] sm:block">
      <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-slate-600 dark:text-white/65">
        Date and note
        <ChevronDown class="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="grid gap-4 border-t border-slate-200 p-4 dark:border-white/10 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-500 dark:text-white/50">Date</label>
          <ModernDateInput v-model="date" aria-label="Expense date" />
        </div>
        <div>
          <label :for="noteId" class="mb-1.5 block text-xs font-bold text-slate-500 dark:text-white/50">Note (optional)</label>
          <input
            :id="noteId"
            v-model.trim="note"
            type="text"
            maxlength="500"
            class="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:focus:ring-cyan-300/10"
            placeholder="What was this for?"
            :disabled="props.busy"
          />
        </div>
      </div>
    </details>

    <p v-if="error" :id="errorId" role="alert" class="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-300">
      {{ error }}
    </p>

    <button
      type="submit"
      class="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:bg-cyan-200 dark:text-slate-950 dark:shadow-cyan-200/10 dark:hover:bg-cyan-100 dark:focus-visible:ring-offset-[#101214] sm:hidden"
      :disabled="props.busy"
    >
      <ReceiptText class="h-5 w-5" aria-hidden="true" />
      {{ props.busy ? "Saving…" : props.submitLabel }}
    </button>
  </form>
</template>
