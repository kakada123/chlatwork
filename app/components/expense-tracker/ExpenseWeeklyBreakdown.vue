<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";
import { useProductCopy } from "~/composables/useProductCopy";
import { CalendarRange, ChevronDown } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import type { ExpenseCurrency, ExpenseRow } from "~/lib/expense-tracker";
import {
  getPresetCategoriesForExpenseRow,
  resolveExpenseCategory,
} from "~/lib/expense-tracker";
import {
  buildWeeklyExpenseBreakdown,
  type ExpenseTrendPoint,
} from "~/lib/expense-dashboard-view";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();
const { productCategoryText } = useProductCopy();

const props = withDefaults(
  defineProps<{
    data: ExpenseTrendPoint[];
    currency: ExpenseCurrency;
    rows?: ExpenseRow[];
    searchedDate?: string | null;
    loadingEntries?: boolean;
    busy?: boolean;
    incomeVisible?: boolean;
  }>(),
  {
    rows: () => [],
    searchedDate: null,
    loadingEntries: false,
    busy: false,
    incomeVisible: false,
  },
);

const emit = defineEmits<{
  "select-day": [date: string];
}>();

const weeklyGroups = computed(() =>
  buildWeeklyExpenseBreakdown(props.data, isKhmer.value),
);

const expandedDate = ref<string | null>(props.searchedDate ?? null);

watch(
  () => props.searchedDate,
  (val) => {
    if (val) expandedDate.value = val;
  },
);

function toggleDay(date: string) {
  if (expandedDate.value === date) {
    expandedDate.value = null;
  } else {
    expandedDate.value = date;
    emit("select-day", date);
  }
}

function handleViewDetail(date: string) {
  expandedDate.value = date;
  emit("select-day", date);
}

function dayEntries(date: string): ExpenseRow[] {
  return props.rows.filter((row) => row.date === date);
}

function categoryLabel(row: ExpenseRow) {
  const key = getPresetCategoriesForExpenseRow(row).includes(row.category)
    ? row.category
    : undefined;
  return productCategoryText(resolveExpenseCategory(row), key);
}

function amountValue(row: ExpenseRow) {
  return row.amount && Number.isFinite(Number(row.amount))
    ? Number(row.amount)
    : 0;
}
</script>

<template>
  <section
    id="weekly-breakdown"
    class="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08] sm:p-5"
    :aria-label="t('products.expenses.weekly_breakdown')"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h3 class="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
          <CalendarRange
            class="h-5 w-5 text-sky-600 dark:text-cyan-200"
            aria-hidden="true"
          />
          {{ t("products.expenses.weekly_breakdown") }}
        </h3>
        <p class="mt-1 text-xs text-slate-500 dark:text-white/55">
          {{ t("products.expenses.weekly_breakdown_description") }}
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="weeklyGroups.length === 0"
      class="py-8 text-center text-sm text-slate-500 dark:text-white/50"
    >
      {{ t("products.expenses.no_expenses_to_breakdown") }}
    </div>

    <!-- Weekly Groups List -->
    <div v-else class="mt-4 space-y-4">
      <div
        v-for="week in weeklyGroups"
        :key="week.weekKey"
        class="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/40 dark:border-white/10 dark:bg-white/[0.02]"
      >
        <!-- Week Header -->
        <div
          class="flex items-center justify-between border-b border-slate-200/70 bg-slate-100/70 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80"
        >
          <span class="truncate">
            {{ week.formattedRange }}
          </span>
          <span class="shrink-0 font-bold tabular-nums text-red-500 dark:text-red-300">
            {{ t("products.expenses.week_total") }}:
            <MoneyAmount :value="week.totalSpent" :currency="currency" />
          </span>
        </div>

        <!-- Days in Week -->
        <ul class="divide-y divide-slate-100 dark:divide-white/[0.06]">
          <li
            v-for="day in week.days"
            :key="day.date"
            class="transition-colors"
            :class="
              searchedDate === day.date
                ? 'bg-sky-500/[0.06] dark:bg-cyan-200/[0.06]'
                : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
            "
          >
            <!-- Day Row Header / Main Clickable Area -->
            <div
              class="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3"
              @click="toggleDay(day.date)"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-slate-950 dark:text-white">
                  {{ day.formattedDate }}
                  <span class="text-xs font-normal text-slate-500 dark:text-white/50">
                    ({{ day.dayOfWeek }})
                  </span>
                </p>
              </div>

              <!-- Day Total -->
              <div class="shrink-0 text-right text-sm font-bold tabular-nums text-red-500 dark:text-red-300">
                <MoneyAmount :value="day.spent" :currency="currency" />
              </div>

              <!-- View Detail Action Button -->
              <button
                type="button"
                :disabled="busy"
                :aria-label="`${t('products.expenses.view_detail')} ${day.formattedDate}`"
                :aria-expanded="expandedDate === day.date"
                class="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-sky-700 hover:bg-sky-100/50 disabled:opacity-50 dark:text-cyan-200 dark:hover:bg-white/10"
                @click.stop="handleViewDetail(day.date)"
              >
                <span>{{ t("products.expenses.view_detail") }}</span>
                <ChevronDown
                  class="size-3.5 transition-transform"
                  :class="expandedDate === day.date ? 'rotate-180' : ''"
                  aria-hidden="true"
                />
              </button>
            </div>

            <!-- Inline Details Panel (when expanded) -->
            <div
              v-if="expandedDate === day.date"
              class="border-t border-slate-200/50 bg-slate-100/40 px-3.5 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.02]"
            >
              <div
                v-if="loadingEntries"
                class="py-2 text-xs text-slate-500 dark:text-white/50"
              >
                {{ t("products.expenses.loading_entries") }}
              </div>
              <div
                v-else-if="dayEntries(day.date).length === 0"
                class="py-2 text-xs text-slate-500 dark:text-white/50"
              >
                {{ t("products.expenses.no_entries_for_this_day") }}
              </div>
              <ul v-else class="divide-y divide-slate-200/50 dark:divide-white/[0.05]">
                <li
                  v-for="entry in dayEntries(day.date)"
                  :key="entry.id"
                  class="flex items-center justify-between py-1.5 text-xs"
                >
                  <div class="min-w-0 pr-3">
                    <p class="font-medium text-slate-900 dark:text-white truncate">
                      {{ entry.note || categoryLabel(entry) }}
                    </p>
                    <p class="text-[10px] text-slate-500 dark:text-white/50">
                      {{ categoryLabel(entry) }}
                    </p>
                  </div>
                  <div
                    class="shrink-0 text-right font-bold tabular-nums"
                    :class="
                      entry.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-red-500 dark:text-red-300'
                    "
                  >
                    <MoneyAmount
                      v-if="entry.type !== 'income' || incomeVisible"
                      :value="amountValue(entry)"
                      :currency="currency"
                    />
                    <span
                      v-else
                      :aria-label="t('products.common.income_amount_hidden')"
                    >••••</span>
                  </div>
                </li>
              </ul>
            </div>
          </li>
        </ul>

        <!-- Week Summary Footer -->
        <div
          class="flex items-center justify-between border-t border-slate-200/70 bg-slate-100/40 px-3.5 py-2 text-xs font-bold text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
        >
          <span>
            {{ t("products.expenses.total") }} ({{ week.activeRangeLabel }})
          </span>
          <span class="tabular-nums text-red-500 dark:text-red-300">
            <MoneyAmount :value="week.totalSpent" :currency="currency" />
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
