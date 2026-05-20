<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

type DateInputType = "date" | "datetime-local";

type CalendarDay = {
  key: string;
  label: number;
  value: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

defineOptions({
  inheritAttrs: false,
});

const value = defineModel<string>({ required: true });

const props = withDefaults(
  defineProps<{
    type?: DateInputType;
    size?: "sm" | "md";
    ariaLabel?: string;

    /**
     * Optional year range for dropdown.
     * Example: minYear="2000" maxYear="2035"
     */
    minYear?: number;
    maxYear?: number;
  }>(),
  {
    type: "date",
    size: "md",
    ariaLabel: "Choose date",
    minYear: 1970,
    maxYear: 2100,
  },
);

const rootRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const activeMonth = ref(
  startOfMonth(parseValueDate(value.value) ?? new Date()),
);
const timeValue = ref(parseValueTime(value.value));

const inputSizeClass = computed(() =>
  props.size === "sm" ? "h-10 rounded-lg text-sm" : "h-11 rounded-xl text-sm",
);

const monthOptions = computed(() =>
  Array.from({ length: 12 }, (_, index) => ({
    value: index,
    label: new Intl.DateTimeFormat("en-US", { month: "long" }).format(
      new Date(2000, index, 1),
    ),
  })),
);

const yearOptions = computed(() => {
  const start = props.minYear;
  const end = props.maxYear;

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
});

const activeMonthIndex = computed({
  get: () => activeMonth.value.getMonth(),
  set: (monthIndex: number) => {
    setActiveMonth(Number(monthIndex));
  },
});

const activeYear = computed({
  get: () => activeMonth.value.getFullYear(),
  set: (year: number) => {
    setActiveYear(Number(year));
  },
});

const displayValue = computed(() => {
  const date = parseValueDate(value.value);
  if (!date) return "";

  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  return props.type === "datetime-local" && timeValue.value
    ? `${label}, ${timeValue.value}`
    : label;
});

const calendarDays = computed<CalendarDay[]>(() => {
  const month = activeMonth.value;
  const selected = parseValueDate(value.value);
  const todayValue = toDateValue(new Date());
  const firstVisibleDate = new Date(month);
  firstVisibleDate.setDate(
    firstVisibleDate.getDate() - firstVisibleDate.getDay(),
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDate);
    date.setDate(firstVisibleDate.getDate() + index);

    const dayValue = toDateValue(date);

    return {
      key: `${dayValue}-${index}`,
      label: date.getDate(),
      value: dayValue,
      inMonth:
        date.getMonth() === month.getMonth() &&
        date.getFullYear() === month.getFullYear(),
      isToday: dayValue === todayValue,
      isSelected: selected ? dayValue === toDateValue(selected) : false,
    };
  });
});

watch(
  () => value.value,
  (nextValue) => {
    const selectedDate = parseValueDate(nextValue);
    if (selectedDate) activeMonth.value = startOfMonth(selectedDate);
    timeValue.value = parseValueTime(nextValue);
  },
);

function openCalendar() {
  isOpen.value = true;
}

function closeCalendar() {
  isOpen.value = false;
}

function moveMonth(step: number) {
  const nextMonth = new Date(activeMonth.value);
  nextMonth.setMonth(nextMonth.getMonth() + step);
  activeMonth.value = startOfMonth(nextMonth);
}

function setActiveMonth(monthIndex: number) {
  activeMonth.value = startOfMonth(
    new Date(activeMonth.value.getFullYear(), monthIndex, 1),
  );
}

function setActiveYear(year: number) {
  activeMonth.value = startOfMonth(
    new Date(year, activeMonth.value.getMonth(), 1),
  );
}

function selectDate(dateValue: string) {
  value.value =
    props.type === "datetime-local"
      ? `${dateValue}T${timeValue.value}`
      : dateValue;

  if (props.type === "date") closeCalendar();
}

function selectToday() {
  selectDate(toDateValue(new Date()));
}

function clearValue() {
  value.value = "";
  timeValue.value = "00:00";
  closeCalendar();
}

function updateTime() {
  const dateValue = value.value.split("T")[0];
  if (!dateValue) return;

  value.value = `${dateValue}T${timeValue.value}`;
}

function handleDocumentClick(event: MouseEvent) {
  if (!rootRef.value?.contains(event.target as Node)) closeCalendar();
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape") closeCalendar();
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleEscape);
});

function parseValueDate(input: string) {
  const datePart = input.split("T")[0];
  if (!datePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function parseValueTime(input: string) {
  return input.includes("T")
    ? input.split("T")[1]?.slice(0, 5) || "00:00"
    : "00:00";
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
</script>

<template>
  <div ref="rootRef" v-bind="$attrs" class="relative w-full">
    <button
      type="button"
      :aria-label="props.ariaLabel"
      :aria-expanded="isOpen"
      :class="[
        inputSizeClass,
        'group flex w-full items-center justify-between gap-3 border border-slate-200 bg-white px-3 text-left text-slate-950 shadow-sm outline-none transition hover:border-slate-300 hover:bg-slate-50 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.10] dark:focus:border-cyan-300/50 dark:focus:ring-cyan-200/15',
      ]"
      @click.stop="openCalendar"
    >
      <span
        class="truncate"
        :class="displayValue ? '' : 'text-slate-400 dark:text-white/45'"
      >
        {{
          displayValue ||
          (props.type === "datetime-local"
            ? "Select date and time"
            : "Select date")
        }}
      </span>

      <span
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 transition group-hover:bg-slate-950 group-hover:text-white dark:bg-white/10 dark:text-cyan-200 dark:group-hover:bg-cyan-200 dark:group-hover:text-slate-950"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
        </svg>
      </span>
    </button>

    <div
      v-if="isOpen"
      class="absolute left-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 shadow-2xl shadow-slate-950/15 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-black/50"
      @click.stop
    >
      <div class="mb-3 flex items-center justify-between gap-2">
        <div class="grid flex-1 grid-cols-2 gap-2">
          <select
            v-model.number="activeMonthIndex"
            aria-label="Select month"
            class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-950 outline-none transition hover:bg-slate-50 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-cyan-300/50 dark:focus:ring-cyan-200/15"
          >
            <option
              v-for="month in monthOptions"
              :key="month.value"
              :value="month.value"
            >
              {{ month.label }}
            </option>
          </select>

          <select
            v-model.number="activeYear"
            aria-label="Select year"
            class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-950 outline-none transition hover:bg-slate-50 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-cyan-300/50 dark:focus:ring-cyan-200/15"
          >
            <option v-for="year in yearOptions" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <div class="flex items-center gap-1">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Previous month"
            @click="moveMonth(-1)"
          >
            ‹
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Next month"
            @click="moveMonth(1)"
          >
            ›
          </button>
        </div>
      </div>

      <div
        class="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-white/50"
      >
        <span
          v-for="(day, index) in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
          :key="`${day}-${index}`"
          class="py-1"
        >
          {{ day }}
        </span>
      </div>

      <div class="mt-1 grid grid-cols-7 gap-1">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          type="button"
          class="relative inline-flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition"
          :class="[
            day.inMonth
              ? 'text-slate-950 hover:bg-sky-50 dark:text-white dark:hover:bg-white/10'
              : 'text-slate-400 hover:bg-slate-50 dark:text-white/35 dark:hover:bg-white/5',
            day.isToday && !day.isSelected
              ? 'ring-1 ring-inset ring-sky-300 dark:ring-cyan-200/35'
              : '',
            day.isSelected
              ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20 hover:bg-sky-700 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100'
              : '',
          ]"
          @click="selectDate(day.value)"
        >
          {{ day.label }}
        </button>
      </div>

      <div
        v-if="props.type === 'datetime-local'"
        class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]"
      >
        <span class="text-sm font-medium text-slate-600 dark:text-white/65"
          >Time</span
        >
        <input
          v-model="timeValue"
          type="time"
          class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-cyan-200/15"
          @change="updateTime"
        />
      </div>

      <div
        class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/10"
      >
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
          @click="clearValue"
        >
          Clear
        </button>

        <button
          type="button"
          class="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100"
          @click="selectToday"
        >
          Today
        </button>
      </div>
    </div>
  </div>
</template>
