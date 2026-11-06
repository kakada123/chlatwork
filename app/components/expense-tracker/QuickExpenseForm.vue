<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useProductCopy } from "~/composables/useProductCopy";
import { Check, ChevronDown, MessageSquarePlus, Plus, ReceiptText, Search, X } from "lucide-vue-next";
import type { ExpenseCurrency, ExpenseRow } from "~/lib/expense-tracker";
import {
  createExpenseRow,
  getPresetCategoriesForExpenseRow,
  parseExpenseAmountToCents,
  todayISO,
} from "~/lib/expense-tracker";

const { t } = useAppI18n();

const { productText } = useProductCopy();

const props = withDefaults(
  defineProps<{
    currency: ExpenseCurrency;
    busy?: boolean;
    submitLabel?: string;
    autofocus?: boolean;
    initialRow?: ExpenseRow;
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

const availableCategories = computed(() => getPresetCategoriesForExpenseRow(props.initialRow ?? createExpenseRow()));
const featuredCategories = computed(() => props.initialRow?.type === "income"
  ? availableCategories.value.slice(0, 6)
  : ["Food", "Coffee", "Transport", "Bills", "Shopping", "Other"]);
const initialCategory = props.initialRow?.category ?? "Food";
const isPresetCategory = availableCategories.value.includes(initialCategory);
const amount = ref(props.initialRow?.amount ?? "");
const category = ref(isPresetCategory ? initialCategory : "__custom__");
const customCategory = ref(props.initialRow?.customCategory ?? (isPresetCategory || initialCategory === "__custom__" ? "" : initialCategory));
const date = ref(props.initialRow?.date ?? todayISO());
const note = ref(props.initialRow?.note ?? "");
const showOptionalNote = ref(Boolean(props.initialRow?.note));
const error = ref("");
const amountInput = ref<HTMLInputElement | null>(null);
const categoryPicker = ref<HTMLDetailsElement | null>(null);
const desktopCategoryPicker = ref<HTMLDetailsElement | null>(null);
const desktopCategoryTrigger = ref<HTMLElement | null>(null);
const categorySearchInput = ref<HTMLInputElement | null>(null);
const categorySearch = ref("");
const filteredCategories = computed(() => {
  const query = categorySearch.value.trim().toLocaleLowerCase();
  return availableCategories.value.filter((item) => `${item} ${productText(item)}`.toLocaleLowerCase().includes(query));
});
const customCategoryInput = ref<HTMLInputElement | null>(null);
const mobileNoteInput = ref<HTMLInputElement | null>(null);
const formId = useId();
const amountId = `${formId}-amount`;
const currencyId = `${formId}-currency`;
const errorId = `${formId}-error`;
const desktopNoteId = `${formId}-desktop-note`;
const mobileNoteId = `${formId}-mobile-note`;
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
  showOptionalNote.value = false;
  date.value = todayISO();
  error.value = "";
  categorySearch.value = "";
  if (desktopCategoryPicker.value) desktopCategoryPicker.value.open = false;
}

async function handleCategoryToggle() {
  if (!desktopCategoryPicker.value?.open) return;
  categorySearch.value = "";
  await nextTick();
  categorySearchInput.value?.focus();
}

function closeDesktopCategoryPicker() {
  if (desktopCategoryPicker.value) desktopCategoryPicker.value.open = false;
  desktopCategoryTrigger.value?.focus();
}

async function selectDesktopCategory(value: string) {
  if (props.busy) return;
  category.value = value;
  closeDesktopCategoryPicker();
  if (value === "__custom__") {
    await nextTick();
    customCategoryInput.value?.focus();
  }
}

function moveCategoryFocus(event: KeyboardEvent, step: number) {
  const controls = Array.from(desktopCategoryPicker.value?.querySelectorAll<HTMLElement>("input, button:not(:disabled)") ?? []);
  const index = controls.indexOf(event.target as HTMLElement);
  controls[Math.max(0, Math.min(controls.length - 1, index + step))]?.focus();
}

function handleCategoryFocusOut(event: FocusEvent) {
  if (!desktopCategoryPicker.value?.contains(event.relatedTarget as Node | null)) {
    if (desktopCategoryPicker.value) desktopCategoryPicker.value.open = false;
  }
}

async function toggleOptionalNote() {
  if (showOptionalNote.value) {
    showOptionalNote.value = false;
    note.value = "";
    return;
  }

  showOptionalNote.value = true;
  await nextTick();
  mobileNoteInput.value?.focus();
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
  if (props.busy) return;
  error.value = "";

  const entryDate = new Date(`${date.value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value) || !Number.isFinite(entryDate.getTime()) || entryDate.toISOString().slice(0, 10) !== date.value) {
    error.value = "Choose a valid date for this entry.";
    return;
  }

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

  const row: ExpenseRow = { ...props.initialRow, ...createExpenseRow(category.value, date.value), type: props.initialRow?.type ?? "expense", customCategory: undefined };
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
    <div class="sm:grid sm:grid-cols-[minmax(12rem,1fr)_minmax(10rem,14rem)] sm:items-end sm:gap-3">
      <div class="min-w-0">
        <label :for="amountId" class="sr-only sm:not-sr-only sm:mb-2 sm:block sm:text-sm sm:font-bold sm:text-slate-700 sm:dark:text-white/75">
          {{ t("products.expenses.amount") }}
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
            class="h-14 min-w-0 w-full rounded-2xl border border-sky-200 bg-sky-50/70 pl-12 pr-20 text-right text-2xl font-black tabular-nums text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-cyan-300/20 dark:bg-cyan-300/[0.07] dark:text-white dark:placeholder:text-white/20 dark:focus:border-cyan-300/60 dark:focus:ring-cyan-300/10 sm:h-16 sm:text-3xl"
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
        {{ props.busy ? t("products.common.saving") : productText(props.submitLabel) }}
      </button>
    </div>

    <fieldset class="min-w-0 max-w-full overflow-hidden">
      <legend class="sr-only sm:not-sr-only sm:mb-2 sm:block sm:text-sm sm:font-bold sm:text-slate-700 sm:dark:text-white/75">{{ t("products.expenses.category") }}</legend>
      <details ref="categoryPicker" class="group rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] sm:hidden">
        <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500">
          <span class="min-w-0">
            <span class="block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/40">{{ t("products.expenses.category") }}</span>
            <span class="block truncate font-black text-slate-800 dark:text-white">{{ category === "__custom__" ? categoryLabel : productText(categoryLabel) }}</span>
          </span>
          <ChevronDown class="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div class="border-t border-slate-200 p-2 dark:border-white/10">
          <div class="relative mb-2">
            <Search class="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400 dark:text-white/40" aria-hidden="true" />
            <input v-model="categorySearch" type="search" :aria-label="t(&quot;products.common.search_categories&quot;)" autocomplete="off" maxlength="80" :placeholder="t(&quot;products.common.search_categories_alternative&quot;)" class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-base text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-cyan-200/50 dark:focus:ring-cyan-200/10" :disabled="props.busy" />
          </div>
          <div class="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto overscroll-contain">
          <button
            v-for="item in filteredCategories"
            :key="`mobile-${productText(item)}`"
            type="button"
            class="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            :class="category === item
              ? 'border-sky-500 bg-sky-600 text-white dark:border-cyan-200 dark:bg-cyan-200 dark:text-slate-950'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65'"
            :disabled="props.busy"
            @click="selectMobileCategory(item)"
          >
            <Check v-if="category === item" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span class="truncate">{{ productText(item) }}</span>
          </button>
          <p v-if="!filteredCategories.length" role="status" class="col-span-2 px-3 py-4 text-center text-sm text-slate-500 dark:text-white/45">{{ t("products.expenses.no_categories_found") }}</p>
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
            {{ t("products.expenses.custom_category") }}
          </button>
          </div>
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
          {{ productText(item) }}
        </button>
      </div>
      <details
        ref="desktopCategoryPicker"
        class="group/category mt-2 hidden rounded-2xl border border-slate-200 bg-white open:border-sky-300 open:shadow-lg open:shadow-sky-950/5 dark:border-white/10 dark:bg-white/[0.035] dark:open:border-cyan-200/35 sm:block"
        @toggle="handleCategoryToggle"
        @keydown.esc.stop.prevent="closeDesktopCategoryPicker"
        @keydown.down.prevent="moveCategoryFocus($event, 1)"
        @keydown.up.prevent="moveCategoryFocus($event, -1)"
        @focusout="handleCategoryFocusOut"
      >
        <summary
          ref="desktopCategoryTrigger"
          class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 text-sm outline-none transition hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden"
          :aria-label="t(&quot;products.common.all_entry_categories&quot;)"
          :aria-disabled="props.busy"
          @click="props.busy && $event.preventDefault()"
          @keydown.enter="props.busy && $event.preventDefault()"
          @keydown.space="props.busy && $event.preventDefault()"
        >
          <span class="flex min-w-0 items-center gap-2.5">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-cyan-200/10 dark:text-cyan-200">
              <Check class="size-4" aria-hidden="true" />
            </span>
            <span class="truncate font-semibold text-slate-800 dark:text-white/85">{{ category === "__custom__" ? categoryLabel : productText(categoryLabel) }}</span>
          </span>
          <ChevronDown class="size-4 shrink-0 text-slate-400 transition group-open/category:rotate-180 dark:text-white/45" aria-hidden="true" />
        </summary>
        <!-- Expand within the form so the dialog can scroll every search result into view. -->
        <div class="border-t border-slate-100 p-2 dark:border-white/10">
          <div class="relative mb-2">
            <Search class="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400 dark:text-white/40" aria-hidden="true" />
            <input
              ref="categorySearchInput"
              v-model="categorySearch"
              type="search"
              :aria-label="t(&quot;products.common.search_categories&quot;)"
              autocomplete="off"
              maxlength="80"
              :placeholder="t(&quot;products.common.search_categories_alternative&quot;)"
              class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-white/35 dark:focus:border-cyan-200/50 dark:focus:ring-cyan-200/10"
              :disabled="props.busy"
              @keydown.enter.prevent="filteredCategories[0] && selectDesktopCategory(filteredCategories[0])"
            />
          </div>
          <div role="group" :aria-label="t(&quot;products.common.category_results&quot;)" class="max-h-52 space-y-1 overflow-y-auto overscroll-contain">
            <button
              v-for="item in filteredCategories"
              :key="item"
              type="button"
              :aria-label="`${t(&quot;products.expenses.select&quot;)} ${productText(item)}`"
              :aria-pressed="category === item"
              :disabled="props.busy"
              class="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 disabled:opacity-50"
              :class="category === item
                ? 'bg-sky-600 text-white dark:bg-cyan-200 dark:text-slate-950'
                : 'text-slate-600 hover:bg-sky-50 dark:text-white/70 dark:hover:bg-white/5'"
              @click="selectDesktopCategory(item)"
            >
              <span class="truncate">{{ productText(item) }}</span>
              <Check v-if="category === item" class="size-4 shrink-0" aria-hidden="true" />
            </button>
            <p v-if="!filteredCategories.length" role="status" class="px-3 py-5 text-center text-sm text-slate-500 dark:text-white/45">{{ t("products.expenses.no_categories_found") }}</p>
          </div>
          <div class="mt-2 border-t border-slate-100 pt-2 dark:border-white/10">
            <button
              type="button"
              :aria-label="t(&quot;products.common.choose_custom_category&quot;)"
              :disabled="props.busy"
              class="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-sky-700 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 disabled:opacity-50 dark:text-cyan-200 dark:hover:bg-cyan-200/5"
              @click="selectDesktopCategory('__custom__')"
            >
              <Plus class="size-4" aria-hidden="true" />
              {{ t("products.expenses.custom_category") }}
            </button>
          </div>
        </div>
      </details>
      <div v-if="category === '__custom__'" class="mt-2">
        <label :for="customCategoryId" class="sr-only">{{ t("products.expenses.custom_category") }}</label>
        <input
          :id="customCategoryId"
          ref="customCategoryInput"
          v-model.trim="customCategory"
          type="text"
          maxlength="80"
          class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/75 dark:focus:ring-cyan-300/10"
          :placeholder="t(&quot;products.common.enter_your_category&quot;)"
          :disabled="props.busy"
        />
      </div>
    </fieldset>

    <div v-if="props.initialRow" class="sm:hidden">
      <p class="mb-1.5 text-xs font-bold text-slate-500 dark:text-white/50">{{ t("products.expenses.date") }}</p>
      <ModernDateInput v-model="date" placement="top" :aria-label="t(&quot;products.common.entry_date&quot;)" />
    </div>

    <div class="sm:hidden">
      <button
        type="button"
        class="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-cyan-300"
        :aria-expanded="showOptionalNote"
        :aria-controls="mobileNoteId"
        :disabled="props.busy"
        @click="toggleOptionalNote"
      >
        <X v-if="showOptionalNote" class="size-4" aria-hidden="true" />
        <MessageSquarePlus v-else class="size-4" aria-hidden="true" />
        {{ showOptionalNote ? t("products.expenses.remove_note") : t("products.expenses.add_note_optional") }}
      </button>
      <div v-if="showOptionalNote" class="mt-2">
        <label :for="mobileNoteId" class="sr-only">{{ t("products.expenses.note_optional") }}</label>
        <input
          :id="mobileNoteId"
          ref="mobileNoteInput"
          v-model.trim="note"
          type="text"
          maxlength="500"
          class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:ring-cyan-300/10"
          :placeholder="t(&quot;products.common.what_was_this_for&quot;)"
          :disabled="props.busy"
        />
      </div>
    </div>

    <details :open="Boolean(props.initialRow)" class="group hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.035] sm:block">
      <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-slate-600 dark:text-white/65">
        {{ t("products.expenses.date_and_note") }}
        <ChevronDown class="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div class="grid gap-4 border-t border-slate-200 p-4 dark:border-white/10 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-500 dark:text-white/50">{{ t("products.expenses.date") }}</label>
          <ModernDateInput v-model="date" placement="top" :aria-label="t(&quot;products.common.expense_date&quot;)" />
        </div>
        <div>
          <label :for="desktopNoteId" class="mb-1.5 block text-xs font-bold text-slate-500 dark:text-white/50">{{ t("products.expenses.note_optional") }}</label>
          <input
            :id="desktopNoteId"
            v-model.trim="note"
            type="text"
            maxlength="500"
            class="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:focus:ring-cyan-300/10"
            :placeholder="t(&quot;products.common.what_was_this_for&quot;)"
            :disabled="props.busy"
          />
        </div>
      </div>
    </details>

    <p v-if="error" :id="errorId" role="alert" class="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-300">
      {{ productText(error) }}
    </p>

    <button
      type="submit"
      class="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:bg-cyan-200 dark:text-slate-950 dark:shadow-cyan-200/10 dark:hover:bg-cyan-100 dark:focus-visible:ring-offset-[#101214] sm:hidden"
      :disabled="props.busy"
    >
      <ReceiptText class="h-5 w-5" aria-hidden="true" />
      {{ props.busy ? t("products.common.saving") : productText(props.submitLabel) }}
    </button>
  </form>
</template>
