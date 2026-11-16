<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useAttrs,
  useId,
  watch,
} from "vue";
import { getDatePickerPosition } from "~/lib/date-picker-position";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

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
    placement?: "top" | "bottom";
    required?: boolean;
    disabled?: boolean;

    /**
     * Optional year range for dropdown.
     * Example: minYear="2000" maxYear="2035"
     */
    minYear?: number;
    maxYear?: number;
  }>(),
  {
    type: "date",
    required: false,
    disabled: false,
    size: "md",

    placement: "bottom",
    minYear: 1900,
    maxYear: 2100,
  },
);

const emit = defineEmits<{ change: [event: Event] }>();
const attrs = useAttrs();
const generatedId = useId();
const controlId = computed(() => String(attrs.id ?? generatedId + "-date"));
const triggerRef = ref<HTMLButtonElement | null>(null);
const nativeRef = ref<HTMLInputElement | null>(null);
const invalid = ref(false);
const validationMessage = ref("");
const implicitLabel = ref("");
function rootAttrs() {
  return Object.fromEntries(
    Object.entries(attrs).filter(
      ([key]) =>
        ![
          "id",
          "name",
          "form",
          "min",
          "max",
          "step",
          "tabindex",
          "autofocus",
          "aria-label",
          "aria-labelledby",
          "aria-describedby",
          "aria-invalid",
          "title",
        ].includes(key),
    ),
  );
}
function refreshLabel() {
  const text = (node: Node): string =>
    node === rootRef.value
      ? ""
      : node.nodeType === 3
        ? (node.textContent ?? "")
        : Array.from(node.childNodes).map(text).join(" ");
  // A wrapping label belongs to the first native control, so include the validation proxy's labels.
  const labels = new Set([
    ...Array.from(triggerRef.value?.labels ?? []),
    ...Array.from(nativeRef.value?.labels ?? []),
  ]);
  implicitLabel.value = Array.from(labels)
    .map(text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
async function commit(next: string) {
  value.value = next;
  invalid.value = false;
  await nextTick();
  // Existing forms receive the same native change target after the controlled model is updated.
  nativeRef.value?.dispatchEvent(new Event("change", { bubbles: true }));
}
function handleInvalid(event: Event) {
  event.preventDefault();
  invalid.value = true;
  validationMessage.value =
    nativeRef.value?.validationMessage || t("ui.invalidDate");
  triggerRef.value?.focus();
}
const rootRef = ref<HTMLElement | null>(null);
const calendarRef = ref<HTMLElement | null>(null);
const calendarStyle = ref<Record<string, string>>({});
const isOpen = ref(false);
const activeMonth = ref(
  startOfMonth(parseValueDate(value.value) ?? new Date()),
);
const timeValue = ref(parseValueTime(value.value));

const inputSizeClass = computed(() =>
  props.size === "sm" ? "h-11 rounded-lg text-sm" : "h-11 rounded-xl text-sm",
);

const localeTag = computed(() => (isKhmer.value ? "km-KH" : "en-US"));

const monthOptions = computed(() =>
  Array.from({ length: 12 }, (_, index) => ({
    value: index,
    label: new Intl.DateTimeFormat(localeTag.value, { month: "long" }).format(
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

  const label = new Intl.DateTimeFormat(localeTag.value, {
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

function updateCalendarPosition() {
  if (!isOpen.value || !rootRef.value || !calendarRef.value) return;
  const position = getDatePickerPosition(
    rootRef.value.getBoundingClientRect(),
    {
      width: calendarRef.value.offsetWidth,
      height: calendarRef.value.scrollHeight,
    },
    { width: document.documentElement.clientWidth, height: window.innerHeight },
    props.placement,
    window.innerWidth < 640,
  );
  calendarStyle.value = {
    top: `${position.top}px`,
    left: `${position.left}px`,
    maxHeight: `${position.maxHeight}px`,
  };
}

async function openCalendar() {
  if (props.disabled || triggerRef.value?.matches(":disabled")) return;
  isOpen.value = true;
  await nextTick();
  // The top layer escapes dialog overflow while preserving its focus-trap subtree.
  calendarRef.value?.showPopover?.();
  updateCalendarPosition();
}

function closeCalendar(restoreFocus = true) {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (restoreFocus) triggerRef.value?.focus();
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
  if (props.disabled) return;
  void commit(
    props.type === "datetime-local"
      ? `${dateValue}T${timeValue.value}`
      : dateValue,
  );

  if (props.type === "date") closeCalendar();
}

function selectToday() {
  selectDate(toDateValue(new Date()));
}

function clearValue() {
  if (props.disabled) return;
  void commit("");
  timeValue.value = "00:00";
  closeCalendar();
}

function updateTime() {
  const dateValue = value.value.split("T")[0];
  if (!dateValue) return;

  if (!props.disabled) void commit(`${dateValue}T${timeValue.value}`);
}

function handleDocumentClick(event: MouseEvent) {
  if (!rootRef.value?.contains(event.target as Node)) closeCalendar(false);
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape") closeCalendar();
}

onUpdated(refreshLabel);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeCalendar(false);
  },
);
onMounted(() => {
  refreshLabel();
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleEscape);
  window.addEventListener("resize", updateCalendarPosition);
  window.addEventListener("scroll", updateCalendarPosition, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleEscape);
  window.removeEventListener("resize", updateCalendarPosition);
  window.removeEventListener("scroll", updateCalendarPosition, true);
});

function parseValueDate(input: string) {
  const datePart = input.split("T")[0];
  if (!datePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : null;
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
  <div
    ref="rootRef"
    v-bind="rootAttrs()"
    class="modern-date relative w-full min-w-0"
  >
    <input
      ref="nativeRef"
      :type="props.type"
      :value="value"
      :name="attrs.name as string"
      :form="attrs.form as string"
      :required="props.required"
      :disabled="props.disabled"
      :min="attrs.min as string"
      :max="attrs.max as string"
      :step="attrs.step as string"
      tabindex="-1"
      aria-hidden="true"
      class="modern-date-native"
      @change="emit('change', $event)"
      @invalid="handleInvalid"
      @focus="triggerRef?.focus()"
    />
    <button
      ref="triggerRef"
      :id="controlId"
      :disabled="props.disabled"
      :aria-invalid="invalid || attrs['aria-invalid']"
      :aria-labelledby="attrs['aria-labelledby'] as string"
      :aria-describedby="
        [attrs['aria-describedby'], invalid ? controlId + '-error' : undefined]
          .filter(Boolean)
          .join(' ') || undefined
      "
      :title="attrs.title as string"
      :tabindex="attrs.tabindex as number"
      :autofocus="attrs.autofocus as boolean"
      type="button"
      :aria-label="
        attrs['aria-labelledby']
          ? undefined
          : props.ariaLabel ||
            implicitLabel ||
            t('shared.components_modern_date_input.choose_date')
      "
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      :aria-controls="controlId + '-calendar'"
      :class="[
        inputSizeClass,
        'group flex w-full disabled:cursor-not-allowed disabled:opacity-50 items-center justify-between gap-3 border border-slate-200 bg-white px-3 text-left text-slate-950 shadow-sm outline-none transition hover:border-slate-300 hover:bg-slate-50 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.10] dark:focus:border-cyan-300/50 dark:focus:ring-cyan-200/15',
      ]"
      @click.stop="openCalendar"
      @keydown.esc.stop.prevent="closeCalendar()"
    >
      <span
        class="min-w-0 truncate"
        :class="displayValue ? '' : 'text-slate-400 dark:text-white/45'"
      >
        {{
          displayValue ||
          (props.type === "datetime-local"
            ? t("shared.components_modern_date_input.select_date_and_time")
            : t("shared.components_modern_date_input.select_date"))
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

    <p
      v-if="invalid"
      :id="controlId + '-error'"
      role="alert"
      class="mt-1 text-xs text-red-600 dark:text-red-300"
    >
      {{ validationMessage }}
    </p>
    <div
      v-if="isOpen"
      ref="calendarRef"
      :id="controlId + '-calendar'"
      role="dialog"
      :aria-label="
        props.ariaLabel ||
        implicitLabel ||
        t('shared.components_modern_date_input.choose_date')
      "
      popover="manual"
      :style="calendarStyle"
      class="fixed inset-auto z-[10000] m-0 w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 shadow-2xl shadow-slate-950/15 sm:w-[min(22rem,calc(100vw-2rem))] dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-black/50"
      @click.stop
      @keydown.esc.stop.prevent="closeCalendar()"
    >
      <div
        class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="grid w-full grid-cols-2 gap-2 sm:flex-1">
          <ModernSelect
            v-model.number="activeMonthIndex"
            :aria-label="t('shared.components_modern_date_input.select_month')"
            class="h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-950 outline-none transition hover:bg-slate-50 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-cyan-300/50 dark:focus:ring-cyan-200/15"
          >
            <option
              v-for="month in monthOptions"
              :key="month.value"
              :value="month.value"
            >
              {{ month.label }}
            </option>
          </ModernSelect>

          <ModernSelect
            v-model.number="activeYear"
            :aria-label="t('shared.components_modern_date_input.select_year')"
            class="h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-950 outline-none transition hover:bg-slate-50 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-cyan-300/50 dark:focus:ring-cyan-200/15"
          >
            <option v-for="year in yearOptions" :key="year" :value="year">
              {{ year }}
            </option>
          </ModernSelect>
        </div>

        <div class="flex items-center justify-end gap-1">
          <button
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            :aria-label="
              t('shared.components_modern_date_input.previous_month')
            "
            @click="moveMonth(-1)"
          >
            ‹
          </button>
          <button
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            :aria-label="t('shared.components_modern_date_input.next_month')"
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
          v-for="(day, index) in [
            t('shared.extra_app_components_ModernDateInput_vue.s'),
            t('shared.extra_app_components_ModernDateInput_vue.m'),
            t('shared.extra_app_components_ModernDateInput_vue.t'),
            t('shared.extra_app_components_ModernDateInput_vue.w'),
            t('shared.extra_app_components_ModernDateInput_vue.t_2'),
            t('shared.extra_app_components_ModernDateInput_vue.f'),
            t('shared.extra_app_components_ModernDateInput_vue.s_2'),
          ]"
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
          :aria-pressed="day.isSelected"
          :aria-label="
            new Intl.DateTimeFormat(localeTag, { dateStyle: 'full' }).format(
              parseValueDate(day.value)!,
            )
          "
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
        <span class="text-sm font-medium text-slate-600 dark:text-white/65">{{
          t("shared.common.time")
        }}</span>
        <input
          v-model="timeValue"
          type="time"
          class="h-11 rounded-lg border border-slate-200 bg-white px-2 text-base sm:text-sm text-slate-950 outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-cyan-200/15"
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
          {{ t("shared.common.clear") }}
        </button>

        <button
          type="button"
          class="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100"
          @click="selectToday"
        >
          {{ t("shared.common.today") }}
        </button>
        <button
          v-if="props.type === 'datetime-local'"
          type="button"
          class="min-h-11 rounded-lg bg-sky-700 px-3 text-sm font-semibold text-white"
          @click="closeCalendar()"
        >
          {{ t("ui.done") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modern-date button[aria-invalid="true"] {
  border-color: #e11d48;
}
.modern-date-native {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  pointer-events: none;
}
</style>
