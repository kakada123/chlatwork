<script setup lang="ts">
import { translateMessage } from "~/lib/i18n";
import { useAppI18n } from "~/composables/useAppI18n";
import CelebrationBrowser from "~/components/khmer-calendar/CelebrationBrowser.vue";
import CalendarShareButton from "~/components/khmer-calendar/CalendarShareButton.vue";
import {
  calendarDetailPath,
  getCalendarDetailMeta,
  parseCalendarDate,
} from "~/lib/calendar-sharing";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  Flower2,
  Lock,
  Minimize,
  Moon,
  Plus,
  RotateCcw,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
} from "lucide-vue-next";
import { useAuth } from "~/composables/useAuth";
import { useRoster } from "~/composables/useRoster";
import { calculateDayWorkingHours } from "~/lib/roster";
import type { RosterDay, RosterGeneratePreview } from "~/types/roster";
import RosterDayEditorModal from "~/components/roster/RosterDayEditorModal.vue";
import RosterSummaryBar from "~/components/roster/RosterSummaryBar.vue";
import RosterGeneratorModal from "~/components/roster/RosterGeneratorModal.vue";
import RosterSettingsModal from "~/components/roster/RosterSettingsModal.vue";
import RosterExportModal from "~/components/roster/RosterExportModal.vue";
import {
  calendarDateKey,
  ENGLISH_MONTHS,
  getCalendarMonth,
  getDayDetails,
  getPhnomPenhToday,
  KHMER_MONTHS,
  KHMER_WEEKDAYS,
  MAX_CALENDAR_YEAR,
  MIN_CALENDAR_YEAR,
  moveCalendarMonth,
  toKhmerDigits,
  type CalendarDate,
  type CalendarDay,
} from "~/lib/khmer-calendar";
import {
  getHolidaySchedule,
  type CalendarEvent,
} from "~/data/cambodia-holidays";



definePageMeta({ layout: false, blankCanvas: true });

const route = useRoute();
const khmer = ref(route.query.lang !== "en");
const { t } = useAppI18n(khmer);
useSeoMeta({ title: () => t("tools.khmerCalendar.metaTitle"), description: () => t("tools.khmerCalendar.metaDescription"), ogTitle: () => t("tools.khmerCalendar.metaOgTitle"), ogDescription: () => t("tools.khmerCalendar.metaOgDescription") });
// Lunar notations remain in Khmer as part of the calendar data in either interface language.
const lunarText = (key: string, params: Record<string, unknown>) => translateMessage("km", key, params);
// Nuxt serializes this initial civil date so hydration cannot cross a midnight boundary.
const today = useState<CalendarDate>("khmer-calendar-today", () =>
  getPhnomPenhToday(),
);
const selected = ref<CalendarDate>(
  parseCalendarDate(route.query.date) ?? { ...today.value },
);
watch(
  () => route.query.date,
  (value) => {
    const date = parseCalendarDate(value);
    if (date) selected.value = date;
  },
);
watch(
  () => route.query.lang,
  (value) => {
    khmer.value = value !== "en";
  },
);

const router = useRouter();
const calendarMode = ref<"calendar" | "roster">(
  route.query.mode === "roster" ? "roster" : "calendar",
);

watch(
  () => route.query.mode,
  (mode) => {
    calendarMode.value = mode === "roster" ? "roster" : "calendar";
  },
);

function setCalendarMode(mode: "calendar" | "roster") {
  calendarMode.value = mode;
  const query = { ...route.query };
  if (mode === "roster") {
    query.mode = "roster";
  } else {
    delete query.mode;
  }
  void router.replace({ query });
}

const { user, isReady: isAuthReady, fetchMe } = useAuth();
const signedIn = computed(
  () => isAuthReady.value && Boolean(user.value),
);

const rosterYear = computed(() => selected.value.year);
const rosterMonth = computed(() => selected.value.month);
const roster = useRoster(rosterYear, rosterMonth, signedIn);

const rosterEditorOpen = ref(false);
const rosterGeneratorOpen = ref(false);
const rosterSettingsOpen = ref(false);
const rosterExportOpen = ref(false);
const rosterResetConfirmOpen = ref(false);
const generatorPreview = ref<RosterGeneratePreview | null>(null);

function confirmResetMonth() {
  rosterResetConfirmOpen.value = true;
}

async function executeResetMonth() {
  await roster.resetMonth();
  rosterResetConfirmOpen.value = false;
}

function openGenerator() {
  generatorPreview.value = roster.previewSmartRoster();
  rosterGeneratorOpen.value = true;
}

async function handleApplyGenerator() {
  if (!generatorPreview.value) return;
  await roster.applySmartRoster(generatorPreview.value);
  rosterGeneratorOpen.value = false;
}

function handleDayClick(day: CalendarDay) {
  selectDate(day.date);
  if (calendarMode.value === "roster") {
    rosterEditorOpen.value = true;
  } else {
    void activateDate(day.date);
  }
}
const calendarRoot = ref<HTMLElement | null>(null);
const fullscreen = ref(false);
const fullscreenSupported = ref(false);
const fullscreenError = ref("");
const showObservances = ref(true);
const years = Array.from(
  { length: MAX_CALENDAR_YEAR - MIN_CALENDAR_YEAR + 1 },
  (_, index) => MIN_CALENDAR_YEAR + index,
);
const months = computed(() => Array.from({ length: 12 }, (_, index) => t(`tools.khmerCalendar.months.${index + 1}`)));
const weekdays = computed(() => Array.from({ length: 7 }, (_, index) => t(`tools.khmerCalendar.weekdays.${index}`)));
const cells = computed(() =>
  getCalendarMonth(selected.value.year, selected.value.month),
);
const weeks = computed(() =>
  Array.from({ length: 6 }, (_, row) =>
    cells.value.slice(row * 7, row * 7 + 7),
  ),
);
const detail = computed(() => getDayDetails(selected.value));
const schedule = computed(() => getHolidaySchedule(selected.value.year));
const previousMonth = computed(() =>
  moveCalendarMonth(selected.value.year, selected.value.month, -1),
);
const nextMonth = computed(() =>
  moveCalendarMonth(selected.value.year, selected.value.month, 1),
);
const todayKey = computed(() => calendarDateKey(today.value));
const selectedKey = computed(() => calendarDateKey(selected.value));
const monthTitle = computed(
  () =>
    `${months.value[selected.value.month - 1]} ${digits(selected.value.year)}`,
);
const lunarMonths = computed(() =>
  [
    ...new Set(
      cells.value
        .filter((day) => day !== null)
        .map((day) => day.lunar.monthName),
    ),
  ].join(" · "),
);
const monthEvents = computed(() =>
  cells.value
    .filter((day) => day !== null)
    .flatMap((day) =>
      day.events
        .filter(visibleEvent)
        .map((event) => ({ ...event, day: day.date.day })),
    ),
);
const selectedEvents = computed(() => detail.value.events.filter(visibleEvent));
const monthHolidayCount = computed(
  () => cells.value.filter((day) => day && publicHoliday(day)).length,
);
const lunarYear = computed(
  () =>
    lunarText("tools.khmerCalendar.lunarYear", { animalYear: detail.value.lunar.animalYearName, sakName: detail.value.lunar.sakName, beYear: toKhmerDigits(detail.value.lunar.beYear) }),
);

function digits(value: number | string) {
  return khmer.value ? toKhmerDigits(value) : String(value);
}
const d = digits;
function eventName(event: CalendarEvent) {
  return khmer.value ? event.nameKm : event.nameEn;
}
function publicHoliday(day: CalendarDay) {
  return day.events.some((event) => event.kind === "public-holiday");
}
function visibleEvent(event: CalendarEvent) {
  return showObservances.value || event.kind === "public-holiday";
}
function lunarLabel(day: CalendarDay) {
  return `${toKhmerDigits(day.lunar.day)}${day.lunar.moonPhaseName}`;
}
function dayLabel(day: CalendarDay) {
  return [
    `${weekdays.value[day.weekday]} ${digits(day.date.day)} ${months.value[day.date.month - 1]} ${digits(day.date.year)}`,
    lunarText("tools.khmerCalendar.lunarMonth", { lunar: lunarLabel(day), month: day.lunar.monthName }),
    day.holyDay ? t("tools.khmerCalendar.buddhistHolyDay") : "",
    ...day.events.filter(visibleEvent).map(eventName),
  ]
    .filter(Boolean)
    .join(" · ");
}

function selectDate(date: CalendarDate) {
  // All navigation enters through validation, including keyboard moves at the supported limits.
  try {
    getDayDetails(date);
    selected.value = { ...date };
    return true;
  } catch {
    return false;
  }
}
function mobileCalendar() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 850px)").matches
  );
}
async function activateDate(date: CalendarDate) {
  if (!selectDate(date)) return;
  // A separate page keeps mobile date details reachable without scrolling past the month grid.
  if (mobileCalendar())
    await navigateTo(calendarDetailPath(date, undefined, khmer.value));
}
function selectCelebrationDate(date: CalendarDate) {
  if (mobileCalendar()) return activateDate(date);
  selectDate(date);
  calendarRoot.value
    ?.querySelector(".month-panel")
    ?.scrollIntoView({ block: "start" });
}
function setMonthYear(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  selectDate({ year, month, day: Math.min(selected.value.day, lastDay) });
}
function changeMonth(offset: number) {
  const target = moveCalendarMonth(
    selected.value.year,
    selected.value.month,
    offset,
  );
  if (target) setMonthYear(target.year, target.month);
}
function goToday() {
  today.value = getPhnomPenhToday();
  selectDate(today.value);
}

async function handleDayKey(event: KeyboardEvent, day: CalendarDay) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const offsets: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
    Home: -day.weekday,
    End: 6 - day.weekday,
  };
  if (event.key === "PageUp" || event.key === "PageDown") {
    event.preventDefault();
    changeMonth(event.key === "PageUp" ? -1 : 1);
  } else if (event.key in offsets) {
    event.preventDefault();
    const target = new Date(
      Date.UTC(
        day.date.year,
        day.date.month - 1,
        day.date.day + offsets[event.key]!,
      ),
    );
    selectDate({
      year: target.getUTCFullYear(),
      month: target.getUTCMonth() + 1,
      day: target.getUTCDate(),
    });
  } else return;
  await nextTick();
  calendarRoot.value
    ?.querySelector<HTMLButtonElement>(`[data-date="${selectedKey.value}"]`)
    ?.focus();
}

function syncFullscreen() {
  fullscreen.value = Boolean(
    calendarRoot.value && document.fullscreenElement === calendarRoot.value,
  );
}
async function toggleFullscreen() {
  fullscreenError.value = "";
  try {
    if (document.fullscreenElement === calendarRoot.value)
      await document.exitFullscreen();
    else await calendarRoot.value?.requestFullscreen();
    syncFullscreen();
  } catch {
    // Mobile browsers and embedded tabs may deny fullscreen; the full-window calendar remains usable.
    fullscreenError.value = t("tools.khmerCalendar.fullscreenIsUnavailableInThisBrowserYouCanKeep");
  }
}
let todayTimer: ReturnType<typeof setInterval> | undefined;
function refreshToday() {
  today.value = getPhnomPenhToday();
}
onMounted(() => {
  if (!isAuthReady.value) void fetchMe();
  fullscreenSupported.value = Boolean(
    document.fullscreenEnabled && calendarRoot.value?.requestFullscreen,
  );
  refreshToday();
  todayTimer = setInterval(refreshToday, 60_000);
  document.addEventListener("fullscreenchange", syncFullscreen);
  window.addEventListener("focus", refreshToday);
});
onBeforeUnmount(() => {
  if (todayTimer) clearInterval(todayTimer);
  document.removeEventListener("fullscreenchange", syncFullscreen);
  window.removeEventListener("focus", refreshToday);
  if (calendarRoot.value && document.fullscreenElement === calendarRoot.value)
    void document.exitFullscreen().catch(() => undefined);
});
</script>

<template>
  <main ref="calendarRoot" class="khmer-calendar" :lang="(khmer ? 'km' : 'en')">
    <header class="calendar-header">
      <div class="brand-row">
        <NuxtLink to="/tools" class="back-link"
          ><ArrowLeft :size="15" aria-hidden="true" /> ChlatWork
          <span>/ {{ t("tools.khmerCalendar.tools") }}</span></NuxtLink
        >
        <div class="calendar-mode-switch" role="tablist" :aria-label="khmer ? 'របៀបប្រតិទិន' : 'Calendar Mode'">
          <button
            type="button"
            role="tab"
            :aria-selected="calendarMode === 'calendar'"
            class="mode-switch-btn"
            :class="{ 'is-active': calendarMode === 'calendar' }"
            @click="setCalendarMode('calendar')"
          >
            <CalendarDays :size="14" aria-hidden="true" />
            <span>{{ khmer ? "ប្រតិទិនខ្មែរ" : "Khmer Calendar" }}</span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="calendarMode === 'roster'"
            class="mode-switch-btn"
            :class="{ 'is-active': calendarMode === 'roster' }"
            @click="setCalendarMode('roster')"
          >
            <Briefcase :size="14" aria-hidden="true" />
            <span>{{ khmer ? "តារាងវេនខ្ញុំ" : "My Roster" }}</span>
          </button>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="language-button"
            :aria-label="t(&quot;tools.khmerCalendar.message&quot;)"
            @click="khmer = !khmer"
          >
            {{ t("tools.khmerCalendar.message_2") }}
          </button>
          <button
            v-if="fullscreenSupported"
            type="button"
            class="icon-button"
            :aria-label="
              fullscreen
                ? t(&quot;tools.khmerCalendar.exitFullscreen&quot;)
                : t(&quot;tools.khmerCalendar.enterFullscreen&quot;)
            "
            :title="t(&quot;tools.khmerCalendar.fullscreen&quot;)"
            @click="toggleFullscreen"
          >
            <component
              :is="fullscreen ? Minimize : Expand"
              :size="18"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      <div class="title-row">
        <div class="calendar-emblem">
          <component
            :is="calendarMode === 'roster' ? Briefcase : CalendarDays"
            :size="27"
            :stroke-width="1.5"
            aria-hidden="true"
          />
        </div>
        <div>
          <p class="eyebrow">
            {{
              calendarMode === "roster"
                ? (khmer ? "កាលវិភាគវេនការងារ និងការឈប់សម្រាកផ្ទាល់ខ្លួន" : "Personal Shifts & Leave Schedule")
                : t("tools.khmerCalendar.datesTraditionCambodia")
            }}
          </p>
          <h1>
            {{
              calendarMode === "roster"
                ? (khmer ? "តារាងវេនការងារខ្ញុំ" : "My Roster")
                : t("tools.khmerCalendar.khmerCalendar")
            }}
          </h1>
          <p class="header-description">
            {{
              calendarMode === "roster"
                ? (khmer ? "រៀបចំវេនការងារ កត់ត្រា PRD, PHL, AL និងនាំចេញតារាងវេន" : "Plan shifts, track PRD, PHL, AL balances, and export monthly roster")
                : t("tools.khmerCalendar.khmerLunarDatesCelebrationsAroundTheWorld")
            }}
          </p>
        </div>
        <div class="today-summary">
          <span>{{ t("tools.khmerCalendar.todayInCambodia") }}</span
          ><strong
            >{{ digits(today.day) }} {{ months[today.month - 1] }}
            {{ digits(today.year) }}</strong
          ><small>Asia/Phnom_Penh · UTC+7</small>
        </div>
      </div>
    </header>

    <div class="calendar-content">
      <p v-if="fullscreenError" role="status" class="notice">
        {{ fullscreenError }}
      </p>
      <div class="calendar-workspace">
        <section
          class="month-panel"
          :aria-label="t(&quot;tools.khmerCalendar.monthlyCalendar&quot;)"
        >
          <div class="month-toolbar">
            <div class="month-heading">
              <h2 aria-live="polite">{{ monthTitle }}</h2>
              <p v-if="calendarMode !== 'roster'" lang="km">{{ lunarMonths }}</p>
            </div>
            <div v-if="calendarMode === 'roster'" class="roster-toolbar-actions">
              <button
                type="button"
                class="roster-action-btn"
                :title="khmer ? 'បង្កើតតារាងវេនស្វ័យប្រវត្តិ' : 'Auto-Generate Roster'"
                @click="openGenerator"
              >
                <Sparkles :size="14" aria-hidden="true" />
                <span>{{ khmer ? "បង្កើតស្វ័យប្រវត្តិ" : "Auto-Generate" }}</span>
              </button>
              <button
                type="button"
                class="roster-action-btn"
                :title="khmer ? 'នាំចេញតារាងវេនជារូបភាព/PDF' : 'Export Roster as Image/PDF'"
                @click="rosterExportOpen = true"
              >
                <Download :size="14" aria-hidden="true" />
                <span>{{ khmer ? "នាំចេញ" : "Export" }}</span>
              </button>
              <button
                type="button"
                class="roster-action-btn"
                :title="khmer ? 'ការកំណត់សមតុល្យ និងវេន' : 'Roster Settings'"
                @click="rosterSettingsOpen = true"
              >
                <SettingsIcon :size="14" aria-hidden="true" />
                <span>{{ khmer ? "ការកំណត់" : "Settings" }}</span>
              </button>
              <button
                type="button"
                class="roster-action-btn roster-reset-btn"
                :title="khmer ? 'កំណត់ឡើងវិញនូវទិន្នន័យខែនេះ' : 'Reset Month Roster'"
                @click="confirmResetMonth"
              >
                <RotateCcw :size="14" aria-hidden="true" />
                <span>{{ khmer ? "កំណត់ឡើងវិញ" : "Reset" }}</span>
              </button>
            </div>
            <div class="month-controls">
              <button type="button" class="today-button" @click="goToday">
                {{ t("tools.khmerCalendar.today") }}
              </button>
              <button
                type="button"
                class="icon-button"
                :disabled="!previousMonth"
                :aria-label="t(&quot;tools.khmerCalendar.previousMonth&quot;)"
                @click="changeMonth(-1)"
              >
                <ChevronLeft :size="19" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="icon-button"
                :disabled="!nextMonth"
                :aria-label="t(&quot;tools.khmerCalendar.nextMonth&quot;)"
                @click="changeMonth(1)"
              >
                <ChevronRight :size="19" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="calendar-options">
            <div class="date-selectors">
              <label class="sr-only" for="calendar-month">{{
                t("tools.khmerCalendar.month")
              }}</label>
              <ModernSelect
                id="calendar-month"
                class="w-40"
                :value="selected.month"
                :search-placeholder="t(&quot;tools.khmerCalendar.searchMonths&quot;)"
                @change="
                  setMonthYear(
                    selected.year,
                    Number(($event.target as HTMLSelectElement).value),
                  )
                "
              >
                <option
                  v-for="(month, index) in months"
                  :key="index"
                  :value="index + 1"
                >
                  {{ month }}
                </option>
              </ModernSelect>
              <label class="sr-only" for="calendar-year">{{
                t("tools.khmerCalendar.year")
              }}</label>
              <ModernSelect
                id="calendar-year"
                class="w-28"
                :value="selected.year"
                :search-placeholder="t(&quot;tools.khmerCalendar.searchYears&quot;)"
                @change="
                  setMonthYear(
                    Number(($event.target as HTMLSelectElement).value),
                    selected.month,
                  )
                "
              >
                <option v-for="year in years" :key="year" :value="year">
                  {{ digits(year) }}
                </option>
              </ModernSelect>
            </div>
            <label class="observance-toggle"
              ><input v-model="showObservances" type="checkbox" />
              {{ t("tools.khmerCalendar.showObservances") }}</label
            >
          </div>

          <div v-if="calendarMode === 'roster'" class="px-5 pt-3">
            <RosterSummaryBar
              :summary="roster.summary.value"
              :khmer="khmer"
            />
          </div>

          <table class="month-grid">
            <caption class="sr-only">
              {{
                monthTitle
              }}
              ·
              {{
                t("tools.khmerCalendar.useArrowKeysToSelectADatePageUp")
              }}
            </caption>
            <thead>
              <tr>
                <th
                  v-for="(weekday, index) in weekdays"
                  :key="index"
                  scope="col"
                  :class="{ 'sunday-heading': index === 0 }"
                >
                  <abbr :title="weekday">{{
                    khmer ? weekday : weekday.slice(0, 3)
                  }}</abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(week, row) in weeks" :key="row">
                <td
                  v-for="(day, column) in week"
                  :key="day?.key ?? `blank-${row}-${column}`"
                  :class="{ 'blank-day': !day }"
                >
                  <button
                    v-if="day"
                    type="button"
                    class="day-button"
                    :class="{
                      'is-selected': day.key === selectedKey,
                      'is-today': day.key === todayKey,
                      'is-holiday': publicHoliday(day),
                      'is-sunday': day.weekday === 0,
                      'is-roster-mode': calendarMode === 'roster',
                    }"
                    :data-date="day.key"
                    :aria-label="dayLabel(day)"
                    :aria-pressed="day.key === selectedKey"
                    :aria-current="day.key === todayKey ? 'date' : undefined"
                    :tabindex="day.key === selectedKey ? 0 : -1"
                    @click="handleDayClick(day)"
                    @keydown="handleDayKey($event, day)"
                  >
                    <span class="day-top"
                      ><span class="day-number">{{ digits(day.date.day) }}</span
                      ><Lock
                        v-if="calendarMode === 'roster' && roster.daysByDate.value.get(day.key)?.isLocked"
                        :size="12"
                        class="text-slate-400"
                        aria-hidden="true"
                      /><Flower2
                        v-else-if="calendarMode !== 'roster' && day.holyDay"
                        :size="14"
                        class="holy-icon"
                        aria-hidden="true" /><span
                        v-else-if="day.key === todayKey"
                        class="today-dot"
                        aria-hidden="true"
                    /></span>
                    <span v-if="calendarMode !== 'roster'" class="lunar-date" lang="km"
                      >{{ lunarLabel(day)
                      }}<span class="lunar-month">
                        {{ day.lunar.monthName }}</span
                      ></span
                    >
                    <template v-if="calendarMode === 'roster'">
                      <div
                        v-if="day.events.filter((e) => e.kind === 'public-holiday').length"
                        class="roster-cell-holiday"
                      >
                        <span
                          class="roster-cell-holiday-tag"
                          :title="eventName(day.events.filter((e) => e.kind === 'public-holiday')[0])"
                        >
                          {{ eventName(day.events.filter((e) => e.kind === 'public-holiday')[0]) }}
                        </span>
                      </div>
                      <div v-if="roster.daysByDate.value.get(day.key)" class="roster-cell-badge">
                        <span
                          v-if="roster.daysByDate.value.get(day.key)?.leaveCode"
                          class="roster-leave-tag"
                          :class="`roster-leave-${roster.daysByDate.value.get(day.key)!.leaveCode!.toLowerCase()}`"
                        >
                          {{ roster.daysByDate.value.get(day.key)!.leaveCode }}
                        </span>
                        <div
                          v-if="roster.daysByDate.value.get(day.key)?.shiftCode"
                          class="roster-shift-tag"
                        >
                          <span class="shift-code">{{ roster.daysByDate.value.get(day.key)!.shiftCode }}</span>
                          <span
                            v-if="roster.shiftsByCode.value.get(roster.daysByDate.value.get(day.key)!.shiftCode!)"
                            class="shift-time"
                          >
                            {{ roster.shiftsByCode.value.get(roster.daysByDate.value.get(day.key)!.shiftCode!)!.startTime }}
                          </span>
                        </div>
                        <span
                          v-if="roster.daysByDate.value.get(day.key)?.note"
                          class="roster-note-indicator"
                          :title="roster.daysByDate.value.get(day.key)!.note!"
                        >
                          ✎ {{ roster.daysByDate.value.get(day.key)!.note }}
                        </span>
                      </div>
                      <div v-else class="roster-empty-cell" aria-hidden="true">
                        <span class="roster-add-hint">+</span>
                      </div>
                    </template>
                    <template v-else>
                      <span class="day-events" aria-hidden="true"
                        ><span
                          v-for="event in day.events
                            .filter(visibleEvent)
                            .slice(0, 2)"
                          :key="event.id"
                          class="cell-event"
                          :class="event.kind"
                          >{{ eventName(event) }}</span
                        ></span
                      >
                      <span class="mobile-markers" aria-hidden="true"
                        ><i v-if="publicHoliday(day)" class="holiday-dot" /><i
                          v-if="
                            showObservances &&
                            day.events.some(
                              (event) => event.kind === 'observance',
                            )
                          "
                          class="observance-dot"
                      /></span>
                    </template>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="calendarMode === 'roster'" class="calendar-legend">
            <span><span class="legend-swatch roster-leave-prd">PRD</span>{{ khmer ? "ថ្ងៃសម្រាកធម្មតា" : "Day Off" }}</span>
            <span><span class="legend-swatch roster-leave-phl">PHL</span>{{ khmer ? "ច្បាប់បុណ្យជាតិ" : "Holiday Leave" }}</span>
            <span><span class="legend-swatch roster-leave-al">AL</span>{{ khmer ? "ច្បាប់ប្រចាំឆ្នាំ" : "Annual Leave" }}</span>
            <span><span class="legend-swatch roster-leave-h1">H1/H2</span>{{ khmer ? "កន្លះថ្ងៃ" : "Half-Day" }}</span>
            <small>
              {{ digits(roster.summary.value.workingDays) }} {{ khmer ? "ថ្ងៃធ្វើការ" : "work days" }} ·
              {{ digits(roster.summary.value.prdUsed) }}/{{ digits(roster.summary.value.prdAllowance) }} PRD
            </small>
          </div>
          <div v-else class="calendar-legend">
            <span
              ><i class="holiday-dot" />{{
                t("tools.khmerCalendar.publicHoliday")
              }}</span
            ><span
              ><Flower2 :size="13" class="holy-icon" aria-hidden="true" />{{
                t("tools.khmerCalendar.buddhistHolyDay")
              }}</span
            ><span
              ><i class="observance-dot" />{{
                t("tools.khmerCalendar.observance")
              }}</span
            ><small
              >{{ digits(monthHolidayCount) }}
              {{
                t("tools.khmerCalendar.publicHolidayDatesThisMonth")
              }}</small
            >
          </div>
        </section>

        <aside
          class="calendar-sidebar"
          :aria-label="
            t(&quot;tools.khmerCalendar.dateDetailsAndEvents&quot;)
          "
        >
          <section class="selected-card" aria-live="polite" aria-atomic="true">
            <p class="selected-eyebrow">
              {{ t("tools.khmerCalendar.selectedDate") }}
            </p>
            <div class="selected-date">
              <strong>{{ digits(selected.day) }}</strong>
              <div>
                <span>{{ weekdays[detail.weekday] }}</span>
                <p>
                  {{ months[selected.month - 1] }} {{ digits(selected.year) }}
                </p>
              </div>
              <component
                :is="detail.lunar.moonPhase === 0 ? Sun : Moon"
                :size="30"
                :stroke-width="1"
                class="phase-icon"
                aria-hidden="true"
              />
            </div>
            <div class="selected-lunar" lang="km">
              <p>
                {{ lunarText("tools.khmerCalendar.lunarSelected", { weekday: KHMER_WEEKDAYS[detail.weekday], lunar: lunarLabel(detail), month: detail.lunar.monthName }) }}
              </p>
              <p>{{ lunarYear }}</p>
            </div>
            <span v-if="calendarMode !== 'roster' && detail.holyDay" class="holy-badge"
              ><Flower2 :size="14" aria-hidden="true" />{{
                t("tools.khmerCalendar.buddhistHolyDay")
              }}</span
            >
            <details class="year-information">
              <summary>
                {{ t("tools.khmerCalendar.khmerYearDetails") }}
              </summary>
              <dl class="year-details">
                <div>
                  <dt>{{ t("tools.khmerCalendar.buddhistEra") }}</dt>
                  <dd>{{ digits(detail.lunar.beYear) }}</dd>
                </div>
                <div>
                  <dt>{{ t("tools.khmerCalendar.animalYear") }}</dt>
                  <dd lang="km">{{ detail.lunar.animalYearName }}</dd>
                </div>
                <div>
                  <dt>{{ t("tools.khmerCalendar.sakCycle") }}</dt>
                  <dd lang="km">{{ detail.lunar.sakName }}</dd>
                </div>
              </dl>
            </details>

            <div v-if="calendarMode === 'roster'" class="roster-selected-section">
              <div class="roster-selected-header">
                <h4>{{ khmer ? "ផែនការងារថ្ងៃនេះ:" : "Selected Day Roster:" }}</h4>
                <button
                  type="button"
                  class="edit-roster-btn"
                  @click="rosterEditorOpen = true"
                >
                  <Plus :size="13" />
                  {{ khmer ? "កែសម្រួល" : "Edit" }}
                </button>
              </div>

              <div v-if="roster.daysByDate.value.get(selectedKey)" class="roster-selected-details">
                <div v-if="roster.daysByDate.value.get(selectedKey)?.leaveCode" class="roster-detail-row">
                  <span class="label">{{ khmer ? "ការឈប់សម្រាក:" : "Leave:" }}</span>
                  <span
                    class="roster-leave-tag"
                    :class="`roster-leave-${roster.daysByDate.value.get(selectedKey)!.leaveCode!.toLowerCase()}`"
                  >
                    {{ roster.daysByDate.value.get(selectedKey)!.leaveCode }}
                  </span>
                </div>
                <div v-if="roster.daysByDate.value.get(selectedKey)?.shiftCode" class="roster-detail-row">
                  <span class="label">{{ khmer ? "ផែនការងារ:" : "Shift:" }}</span>
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono font-bold text-white">{{ roster.daysByDate.value.get(selectedKey)!.shiftCode }}</span>
                    <span
                      v-if="roster.shiftsByCode.value.get(roster.daysByDate.value.get(selectedKey)!.shiftCode!)"
                      class="shift-hours"
                    >
                      ({{ calculateDayWorkingHours(roster.shiftsByCode.value.get(roster.daysByDate.value.get(selectedKey)!.shiftCode!), roster.daysByDate.value.get(selectedKey)?.leaveCode) }}h)
                    </span>
                  </div>
                </div>
                <div class="roster-detail-row">
                  <span class="label">{{ khmer ? "ស្ថានភាព:" : "Status:" }}</span>
                  <span
                    class="status-pill"
                    :class="`status-${roster.daysByDate.value.get(selectedKey)!.status.toLowerCase()}`"
                  >
                    {{ roster.daysByDate.value.get(selectedKey)!.status }}
                  </span>
                </div>
                <div v-if="roster.daysByDate.value.get(selectedKey)?.note" class="roster-detail-note">
                  "{{ roster.daysByDate.value.get(selectedKey)!.note }}"
                </div>
              </div>
              <div v-else class="roster-no-entry">
                <p>{{ khmer ? "មិនទាន់បានកំណត់វេន" : "No shift or leave set" }}</p>
                <button type="button" class="set-shift-quick-btn" @click="rosterEditorOpen = true">
                  + {{ khmer ? "កំណត់វេន" : "Set shift" }}
                </button>
              </div>
            </div>
          </section>

          <template v-if="calendarMode === 'roster'">
            <section class="day-detail-panel">
              <h3>{{ khmer ? "សកម្មភាពតារាងវេន" : "Roster Actions" }}</h3>
              <div class="roster-sidebar-actions">
                <button
                  type="button"
                  class="roster-menu-btn auto-gen-btn"
                  @click="openGenerator"
                >
                  <Sparkles :size="15" />
                  <span>{{ khmer ? "បង្កើតវេនស្វ័យប្រវត្តិ" : "Auto-Generate Roster" }}</span>
                </button>
                <button
                  type="button"
                  class="roster-menu-btn"
                  @click="rosterExportOpen = true"
                >
                  <Download :size="15" />
                  <span>{{ khmer ? "នាំចេញតារាងវេន (PNG/PDF)" : "Export Roster" }}</span>
                </button>
                <button
                  type="button"
                  class="roster-menu-btn"
                  @click="rosterSettingsOpen = true"
                >
                  <SettingsIcon :size="15" />
                  <span>{{ khmer ? "ការកំណត់សមតុល្យ & វេន" : "Roster Settings" }}</span>
                </button>
              </div>
            </section>
          </template>
          <template v-else>
            <div class="selected-date-actions">
              <NuxtLink :to="calendarDetailPath(selected, undefined, khmer)">{{
                t("tools.khmerCalendar.viewDateDetails")
              }}</NuxtLink>
              <CalendarShareButton
                :path="calendarDetailPath(selected, undefined, khmer)"
                :title="getCalendarDetailMeta(detail, null, khmer).title"
                :khmer="khmer"
              />
            </div>

            <section class="day-detail-panel">
              <h3>{{ t("tools.khmerCalendar.holidaysObservances") }}</h3>
              <ul v-if="selectedEvents.length" class="selected-events">
                <li v-for="event in selectedEvents" :key="event.id">
                  <span class="event-type" :class="event.kind">{{
                    event.kind === "public-holiday"
                      ? t("tools.khmerCalendar.publicHoliday")
                      : t("tools.khmerCalendar.celebrationObservanceNotAPublicHoliday")
                  }}</span>
                  <p>
                    <NuxtLink
                      :to="calendarDetailPath(selected, event.id, khmer)"
                      >{{ eventName(event) }}</NuxtLink
                    >
                  </p>
                  <small v-if="event.estimated" class="estimated-note"
                    >{{ t("tools.khmerCalendar.estimated") }} ·
                    {{ khmer ? event.noteKm : event.noteEn }}</small
                  >
                  <CalendarShareButton
                    :path="calendarDetailPath(selected, event.id, khmer)"
                    :title="getCalendarDetailMeta(detail, event, khmer).title"
                    :khmer="khmer"
                  />
                </li>
              </ul>
              <p v-else class="empty-copy">
                {{
                  schedule.verified
                    ? t("tools.khmerCalendar.noListedHolidayOrObservanceForThisDate")
                    : t("tools.khmerCalendar.theOfficialPublicHolidayScheduleForThisYearIs")
                }}
              </p>
            </section>

            <section class="month-event-panel">
              <div class="section-heading">
                <h3>{{ t("tools.khmerCalendar.thisMonth") }}</h3>
                <span>{{ digits(monthEvents.length) }}</span>
              </div>
              <ul v-if="monthEvents.length" class="month-event-list">
                <li
                  v-for="event in monthEvents"
                  :key="`${event.date}-${event.id}`"
                >
                  <button
                    type="button"
                    @click="
                      selectDate({
                        year: selected.year,
                        month: selected.month,
                        day: event.day,
                      })
                    "
                  >
                    <span class="event-day" :class="event.kind">{{
                      digits(event.day)
                    }}</span
                    ><span
                      >{{ eventName(event)
                      }}<small
                        >{{
                          event.kind === "public-holiday"
                            ? t("tools.khmerCalendar.publicHoliday")
                            : t("tools.khmerCalendar.celebrationObservance")
                        }}<template v-if="event.estimated">
                          · {{ t("tools.khmerCalendar.estimated") }}</template
                        ></small
                      ></span
                    ><ChevronRight :size="14" aria-hidden="true" />
                  </button>
                </li>
              </ul>
              <p v-else class="empty-copy">
                {{
                  t("tools.khmerCalendar.noListedEventsThisMonth")
                }}
              </p>
            </section>
          </template>
        </aside>
      </div>

      <CelebrationBrowser
        v-if="calendarMode === 'calendar'"
        :year="selected.year"
        :khmer="khmer"
        @select="selectCelebrationDate"
      />

      <RosterDayEditorModal
        :open="rosterEditorOpen"
        :date-key="selectedKey"
        :day="detail"
        :entry="roster.daysByDate.value.get(selectedKey) || null"
        :shifts="roster.shifts.value"
        :preferences="roster.preferences.value"
        :prd-remaining="roster.summary.value.prdRemaining"
        :al-remaining="roster.summary.value.alRemaining"
        :phl-remaining="roster.summary.value.phlRemaining"
        :khmer="khmer"
        @close="rosterEditorOpen = false"
        @save="roster.saveDay(selectedKey, $event)"
        @delete="roster.deleteDay($event)"
      />

      <RosterGeneratorModal
        :open="rosterGeneratorOpen"
        :year="selected.year"
        :month="selected.month"
        :preferences="roster.preferences.value"
        :preview="generatorPreview"
        :khmer="khmer"
        :busy="roster.saving.value"
        @close="rosterGeneratorOpen = false"
        @apply="handleApplyGenerator"
      />

      <RosterSettingsModal
        :open="rosterSettingsOpen"
        :preferences="roster.preferences.value"
        :shifts="roster.shifts.value"
        :balances="roster.balances.value"
        :transactions="roster.transactions.value"
        :khmer="khmer"
        :busy="roster.saving.value"
        @close="rosterSettingsOpen = false"
        @save-preferences="roster.savePreferences($event)"
        @create-shift="roster.createShift($event)"
        @update-shift="roster.updateShift"
        @record-leave-adjustment="roster.recordLeaveAdjustment($event)"
      />

      <RosterExportModal
        :open="rosterExportOpen"
        :year="selected.year"
        :month="selected.month"
        :month-title="monthTitle"
        :days="roster.days.value"
        :shifts-by-code="roster.shiftsByCode.value"
        :preferences="roster.preferences.value"
        :summary="roster.summary.value"
        :khmer="khmer"
        @close="rosterExportOpen = false"
      />

      <!-- Reset Month Confirmation Modal -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0"
          leave-active-class="transition duration-100 ease-in"
          leave-to-class="opacity-0"
        >
          <div
            v-if="rosterResetConfirmOpen"
            class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            @click.self="rosterResetConfirmOpen = false"
          >
            <div
              role="dialog"
              aria-modal="true"
              class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
              :class="{ 'font-khmer': khmer }"
              @keydown.esc.prevent="rosterResetConfirmOpen = false"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  <RotateCcw :size="20" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100">
                    {{ khmer ? "កំណត់ឡើងវិញ?" : "Reset Month Roster?" }}
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-zinc-400">
                    {{ khmer ? `ខែ ${digits(selected.month)}/${digits(selected.year)}` : `Month ${selected.month}/${selected.year}` }}
                  </p>
                </div>
              </div>

              <p class="mt-4 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                {{ khmer ? "តើអ្នកពិតជាចង់កំណត់ឡើងវិញនូវទិន្នន័យវេនការងារ និងការឈប់សម្រាកទាំងអស់ក្នុងខែនេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។" : "Are you sure you want to reset all shift assignments and leave entries for this month? This cannot be undone." }}
              </p>

              <div class="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  class="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  @click="rosterResetConfirmOpen = false"
                >
                  {{ khmer ? "បោះបង់" : "Cancel" }}
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                  :disabled="roster.saving.value"
                  @click="executeResetMonth"
                >
                  {{ roster.saving.value ? (khmer ? "កំពុងលុប..." : "Resetting...") : (khmer ? "កំណត់ឡើងវិញ" : "Reset") }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <footer class="calendar-footer">
        <div>
          <p v-if="schedule.verified">
            <strong
              >{{ digits(schedule.holidayDayCount ?? 0) }}
              {{
                t("tools.khmerCalendar.officialPublicHolidayDatesIn")
              }}
              {{ digits(selected.year) }}</strong
            ><span>{{
              t("tools.khmerCalendar.observancesAndBuddhistHolyDaysDoNotAutomaticallyMean")
            }}</span>
          </p>
          <p v-else class="coverage-notice" role="status">
            <strong>{{
              t("tools.khmerCalendar.officialHolidayScheduleUnavailableForThisYear")
            }}</strong
            ><span>{{
              t("tools.khmerCalendar.verifiedPublicHolidaysCover2026And2027LunarDates")
            }}</span>
          </p>
        </div>
        <div class="source-links">
          <span>{{ t("tools.khmerCalendar.officialSources") }}</span
          ><a
            v-for="source in schedule.sources"
            :key="source.url"
            :href="source.url"
            target="_blank"
            rel="noopener noreferrer"
            >{{ source.name }} ↗</a
          ><span v-if="!schedule.sources.length">{{
            t("tools.khmerCalendar.lunarCalendar19002100")
          }}</span>
        </div>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.khmer-calendar {
  --paper: #fff;
  --canvas: #f7f6f2;
  --ink: #292b31;
  --muted: #6e717b;
  --line: #e9e6df;
  --red: #a9323a;
  --gold: #a47926;
  --teal: #32776e;
  min-height: 100dvh;
  background: var(--canvas);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.7;
}
:global(.dark) .khmer-calendar {
  --paper: #202124;
  --canvas: #171819;
  --ink: #eeeae3;
  --muted: #aaa9a6;
  --line: #373638;
  --red: #f18c94;
  --gold: #d9b46b;
  --teal: #81c9b5;
}
.khmer-calendar:fullscreen {
  overflow: auto;
}
.calendar-header {
  border-top: 4px solid #9a3038;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
  padding: 12px 30px 16px;
}
.brand-row,
.title-row,
.header-actions,
.month-toolbar,
.month-controls,
.calendar-options,
.date-selectors,
.calendar-legend,
.section-heading {
  display: flex;
  align-items: center;
}
.brand-row {
  justify-content: space-between;
  margin-bottom: 10px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 750;
  text-decoration: none;
}
.back-link span {
  color: var(--muted);
  font-weight: 400;
}
.header-actions {
  gap: 10px;
}
.language-button {
  font-size: 12px;
  padding: 4px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-weight: 700;
  min-height: 36px;
}
.title-row {
  gap: 12px;
}
.calendar-emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 52px;
  flex-shrink: 0;
  border: 1px solid var(--line);
  border-radius: 18px 18px 8px 8px;
  color: var(--red);
  background: color-mix(in srgb, var(--gold) 7%, var(--paper));
}
.eyebrow {
  color: var(--gold);
  font-size: 10px;
  letter-spacing: 0.14em;
  font-weight: 650;
  margin-bottom: 2px;
}
h1 {
  font-size: 24px;
  line-height: 1.5;
  font-weight: 800;
  letter-spacing: -0.025em;
}
.header-description {
  font-size: 12px;
  color: var(--muted);
  margin-top: 3px;
}
.today-summary {
  margin-left: auto;
  text-align: right;
  display: grid;
  gap: 3px;
}
.today-summary > span {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.08em;
}
.today-summary strong {
  font-size: 16px;
  font-weight: 700;
}
.today-summary small {
  font-size: 10px;
  color: var(--muted);
}
.calendar-content {
  padding: 25px 30px 20px;
  max-width: 1920px;
  margin: auto;
}
.calendar-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  align-items: start;
  gap: 22px;
}
.month-panel {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 15px;
  overflow: hidden;
}
.month-toolbar {
  padding: 22px 22px 13px;
  justify-content: space-between;
  gap: 10px;
}
.month-heading h2 {
  font-size: 22px;
  font-weight: 750;
  line-height: 1.6;
}
.month-heading p {
  color: var(--muted);
  font-size: 12px;
}
.month-controls {
  gap: 6px;
}
.icon-button {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  flex-shrink: 0;
}
.icon-button:hover,
.language-button:hover,
.today-button:hover {
  background: color-mix(in srgb, var(--muted) 8%, transparent);
}
.icon-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.today-button {
  color: var(--red);
  border: 1px solid var(--line);
  padding: 4px 15px;
  height: 36px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  margin-right: 3px;
}
.calendar-options {
  justify-content: space-between;
  gap: 12px;
  padding: 0 22px 17px;
  flex-wrap: wrap;
}
.date-selectors {
  gap: 7px;
  min-width: 0;
  max-width: 100%;
}
.observance-toggle {
  font-size: 11px;
  color: var(--muted);
  display: flex;
  gap: 7px;
  align-items: center;
  cursor: pointer;
  min-height: 30px;
}
.observance-toggle input {
  accent-color: #a9323a;
}
.month-grid {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.month-grid th {
  height: 40px;
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
  background: color-mix(in srgb, var(--gold) 5%, var(--paper));
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.month-grid th abbr {
  text-decoration: none;
}
.month-grid th.sunday-heading {
  color: var(--red);
}
.month-grid td {
  border: 1px solid var(--line);
  padding: 0;
  vertical-align: top;
  height: clamp(88px, calc((100dvh - 380px) / 6), 160px);
}
.month-grid td:first-child {
  border-left: 0;
}
.month-grid td:last-child {
  border-right: 0;
}
.month-grid .blank-day {
  background: color-mix(in srgb, var(--muted) 3%, var(--paper));
}
.day-button {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 90px;
  padding: 8px 9px;
  text-align: left;
  position: relative;
  border: 2px solid transparent;
  transition: background 0.15s;
}
.day-button:hover {
  background: color-mix(in srgb, var(--gold) 8%, var(--paper));
}
.day-button.is-selected {
  border-color: var(--red);
  background: color-mix(in srgb, var(--red) 5%, var(--paper));
}
.day-top {
  display: flex;
  align-items: center;
  gap: 5px;
  justify-content: space-between;
  width: 100%;
}
.day-number {
  font-size: 23px;
  font-weight: 650;
  line-height: 1.5;
}
.is-holiday .day-number,
.is-sunday .day-number {
  color: var(--red);
}
.is-today .day-number {
  background: #a9323a;
  color: #fff;
  padding: 0 5px;
  border-radius: 7px;
}
.holy-icon {
  color: var(--gold);
  flex-shrink: 0;
}
.today-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--red);
}
.lunar-date {
  font-size: 10px;
  color: var(--muted);
  white-space: nowrap;
  line-height: 1.8;
}
.lunar-month {
  display: none;
}
.day-events {
  display: grid;
  gap: 2px;
  width: 100%;
  margin-top: 5px;
}
.cell-event {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  width: 100%;
  font-size: 9px;
  border-radius: 3px;
  padding: 1px 3px;
  line-height: 1.7;
}
.public-holiday {
  color: var(--red);
  background: color-mix(in srgb, var(--red) 8%, transparent);
}
.observance {
  color: var(--teal);
  background: color-mix(in srgb, var(--teal) 8%, transparent);
}
.mobile-markers {
  display: none;
}
.holiday-dot,
.observance-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--red);
}
.observance-dot {
  background: var(--teal);
}
.calendar-legend {
  flex-wrap: wrap;
  padding: 13px 18px;
  gap: 10px 17px;
  font-size: 10px;
  color: var(--muted);
}
.calendar-legend > span {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.calendar-legend small {
  margin-left: auto;
  font-size: 10px;
}
.calendar-sidebar {
  display: grid;
  gap: 17px;
  min-width: 0;
}
.selected-card {
  background: #722832;
  background-image: radial-gradient(
    circle at 100% 0%,
    #ae6a4229,
    transparent 65%
  );
  color: #fff6e9;
  padding: 20px;
  border-radius: 15px;
}
.selected-eyebrow {
  color: #ecd2b2;
  font-size: 10px;
  letter-spacing: 0.1em;
}
.selected-date {
  display: flex;
  align-items: center;
  gap: 13px;
  margin: 11px 0 15px;
}
.selected-date > strong {
  font-size: 52px;
  font-weight: 650;
  line-height: 1.2;
}
.selected-date > div {
  font-size: 12px;
}
.selected-date > div > span {
  font-weight: 700;
}
.selected-date p {
  opacity: 0.75;
  margin-top: 4px;
}
.phase-icon {
  margin-left: auto;
  color: #e8c88d;
}
.selected-lunar {
  border-top: 1px solid #ffffff23;
  padding-top: 14px;
  font-size: 12px;
  line-height: 2;
}
.holy-badge {
  color: #f8dc9b;
  border: 1px solid #d9ac563f;
  border-radius: 20px;
  font-size: 10px;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-top: 9px;
  padding: 3px 9px;
}
.year-details {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 7px;
  border-top: 1px solid #ffffff23;
  margin-top: 15px;
  padding-top: 12px;
}
.year-information {
  margin-top: 10px;
}
.year-information summary {
  cursor: pointer;
  color: #ecd2b2;
  font-size: 11px;
}
.selected-date-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 3px;
}
.selected-date-actions > a {
  color: var(--red);
  font-size: 12px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.selected-events :deep(.calendar-share) {
  margin-top: 8px;
}
.selected-events a:hover {
  color: var(--red);
}
.year-details dt {
  font-size: 9px;
  color: #e7c5b9;
}
.year-details dd {
  font-size: 12px;
  margin-top: 3px;
}
.day-detail-panel,
.month-event-panel {
  padding: 18px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 13px;
}
.calendar-sidebar h3 {
  font-weight: 700;
  font-size: 13px;
}
.selected-events {
  display: grid;
  gap: 14px;
  margin-top: 12px;
}
.estimated-note {
  display: block;
  color: var(--muted);
  margin-top: 5px;
  font-size: 10px;
  line-height: 1.9;
}
.event-type {
  display: inline-block;
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
}
.selected-events p {
  font-size: 12px;
  line-height: 1.9;
  margin-top: 5px;
}
.empty-copy {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.9;
  margin-top: 11px;
}
.section-heading {
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-heading > span {
  color: var(--muted);
  font-size: 11px;
}
.month-event-list {
  max-height: 290px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.month-event-list li + li {
  border-top: 1px solid var(--line);
}
.month-event-list button {
  display: flex;
  align-items: center;
  text-align: left;
  width: 100%;
  gap: 11px;
  padding: 11px 0;
}
.month-event-list button:hover {
  color: var(--red);
}
.event-day {
  width: 31px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  border-radius: 7px;
  flex-shrink: 0;
}
.month-event-list button > span:nth-child(2) {
  font-size: 11px;
  flex: 1;
}
.month-event-list small {
  display: block;
  font-size: 9px;
  color: var(--muted);
  margin-top: 3px;
}
.month-event-list svg {
  color: var(--muted);
  flex-shrink: 0;
}
.calendar-footer {
  display: flex;
  justify-content: space-between;
  gap: 22px;
  padding: 20px 3px 0;
  font-size: 10px;
  color: var(--muted);
}
.calendar-footer p {
  display: grid;
  gap: 4px;
}
.calendar-footer strong {
  color: var(--ink);
  font-weight: 600;
}
.source-links {
  display: grid;
  gap: 3px;
  text-align: right;
}
.source-links a {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.coverage-notice strong {
  color: var(--gold);
}
.notice {
  background: var(--paper);
  border: 1px solid var(--line);
  padding: 10px 15px;
  border-radius: 10px;
  margin-bottom: 15px;
  font-size: 12px;
}
button:focus-visible,
select:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
summary:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
@media (min-width: 851px) {
  .calendar-content {
    padding-top: 16px;
  }
  .month-toolbar {
    padding: 12px 18px 8px;
  }
  .month-heading h2 {
    font-size: 20px;
  }
  .calendar-options {
    padding: 0 18px 10px;
  }
  .month-grid th {
    height: 32px;
  }
  .month-grid td {
    height: clamp(64px, calc((100dvh - 360px) / 6), 120px);
  }
  .day-button {
    height: clamp(64px, calc((100dvh - 360px) / 6), 120px);
    min-height: 0;
    padding: 4px 7px;
    overflow: hidden;
  }
  .day-number {
    font-size: 21px;
    line-height: 1.25;
  }
  .day-events {
    margin-top: 2px;
    gap: 1px;
  }
  .calendar-legend {
    padding: 8px 14px;
  }
  /* Bound long event content to the calendar workspace instead of extending the whole page. */
  .calendar-sidebar {
    max-height: max(480px, calc(100dvh - 190px));
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    gap: 12px;
    padding: 2px;
  }
  .selected-card {
    padding: 14px;
  }
  .selected-date {
    margin: 5px 0 9px;
  }
  .selected-date > strong {
    font-size: 38px;
  }
  .selected-lunar {
    padding-top: 8px;
    line-height: 1.8;
  }
  .day-detail-panel,
  .month-event-panel {
    padding: 13px;
  }
  .month-event-list {
    max-height: 190px;
  }
}
@media (min-width: 1500px) {
  .lunar-month {
    display: inline;
  }
  .cell-event {
    font-size: 11px;
  }
  .day-number {
    font-size: 28px;
  }
}
@media (max-width: 1100px) {
  .calendar-workspace {
    grid-template-columns: minmax(0, 1fr) 275px;
    gap: 16px;
  }
  .calendar-content {
    padding: 20px;
  }
  .day-button {
    padding: 7px 6px;
  }
  .calendar-legend small {
    margin-left: 0;
    width: 100%;
  }
}
@media (max-width: 850px) {
  .calendar-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
  .calendar-sidebar {
    display: none;
  }
  .selected-card {
    grid-row: span 2;
  }
  .month-grid td {
    height: 105px;
  }
  .calendar-header {
    padding: 10px 22px 14px;
  }
  .month-event-list {
    max-height: 220px;
  }
}
@media (max-width: 540px) {
  .calendar-header {
    padding: 8px 15px 12px;
  }
  .brand-row {
    margin-bottom: 8px;
  }
  .title-row {
    gap: 12px;
  }
  .calendar-emblem {
    width: 40px;
    height: 46px;
    border-radius: 14px 14px 6px 6px;
    flex-shrink: 0;
  }
  h1 {
    font-size: 21px;
  }
  .eyebrow {
    font-size: 8px;
    letter-spacing: 0.06em;
  }
  .header-description {
    font-size: 10px;
  }
  .today-summary {
    display: none;
  }
  .calendar-content {
    padding: 14px 10px 24px;
  }
  .month-toolbar {
    padding: 16px 12px 11px;
  }
  .month-heading h2 {
    font-size: 18px;
  }
  .month-heading p {
    font-size: 10px;
  }
  .month-controls {
    gap: 4px;
  }
  .month-controls .icon-button {
    width: 30px;
    height: 34px;
  }
  .today-button {
    padding: 3px 9px;
    font-size: 11px;
    margin-right: 0;
    height: 34px;
  }
  .calendar-options {
    padding: 0 12px 12px;
    gap: 5px;
  }
  .observance-toggle {
    font-size: 10px;
  }
  .month-grid th {
    font-size: 9px;
    height: 35px;
  }
  .month-grid td {
    height: 76px;
  }
  .day-button {
    padding: 5px 3px;
    min-height: 76px;
  }
  .day-number {
    font-size: 20px;
  }
  .lunar-date {
    font-size: 9px;
  }
  .holy-icon {
    width: 11px;
    height: 11px;
  }
  .day-events {
    display: none;
  }
  .mobile-markers {
    display: flex;
    gap: 4px;
    margin-top: 6px;
  }
  .mobile-markers i {
    width: 4px;
    height: 4px;
  }
  .calendar-legend {
    padding: 11px 12px;
    gap: 7px 12px;
    font-size: 9px;
  }
  .calendar-legend small {
    font-size: 9px;
  }
  .calendar-sidebar {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .selected-card {
    grid-row: auto;
  }
  .selected-date > strong {
    font-size: 48px;
  }
  .selected-lunar {
    font-size: 13px;
  }
  .month-event-list {
    max-height: 320px;
  }
  .calendar-footer {
    flex-direction: column;
    padding: 17px 5px 0;
    gap: 12px;
  }
  .source-links {
    text-align: left;
  }
  .calendar-mode-switch {
    width: 100%;
    order: 3;
    margin-top: 6px;
    justify-content: center;
  }
  .mode-switch-btn {
    flex: 1;
    justify-content: center;
  }
  .roster-toolbar-actions {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .day-button {
    transition: none;
  }
}
@media (min-width: 851px) and (max-height: 800px) {
  /* Short windows retain readable dates; occasion names remain available in the sidebar. */
  .day-button {
    padding: 4px 7px;
  }
  .day-number {
    font-size: 20px;
  }
  .day-events {
    display: none;
  }
  .mobile-markers {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }
}

/* My Roster Feature Styles */
.calendar-mode-switch {
  display: inline-flex;
  align-items: center;
  background: color-mix(in srgb, var(--muted) 16%, var(--paper));
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 3px;
  gap: 3px;
}
.mode-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.mode-switch-btn:hover {
  color: var(--ink);
}
.mode-switch-btn.is-active {
  background: var(--paper);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.roster-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
  margin-left: 12px;
}
.roster-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s;
  min-height: 34px;
}
.roster-action-btn:hover {
  background: color-mix(in srgb, var(--teal) 8%, var(--paper));
  border-color: var(--teal);
  color: var(--teal);
}
.roster-cell-badge {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 3px;
  width: 100%;
}
.roster-leave-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 5px;
  line-height: 1.2;
  text-align: center;
  width: fit-content;
}
.roster-leave-prd {
  background: #fee2e2;
  color: #b91c1c;
}
:global(.dark) .roster-leave-prd {
  background: rgba(185, 28, 28, 0.35);
  color: #fca5a5;
}
.roster-leave-phl {
  background: #fef3c7;
  color: #b45309;
}
:global(.dark) .roster-leave-phl {
  background: rgba(180, 83, 9, 0.35);
  color: #fcd34d;
}
.roster-leave-al {
  background: #f3e8ff;
  color: #7e22ce;
}
:global(.dark) .roster-leave-al {
  background: rgba(126, 34, 206, 0.35);
  color: #d8b4fe;
}
.roster-leave-h1,
.roster-leave-h2 {
  background: #ede9fe;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
}
:global(.dark) .roster-leave-h1,
:global(.dark) .roster-leave-h2 {
  background: rgba(109, 40, 217, 0.3);
  color: #c4b5fd;
  border-color: rgba(109, 40, 217, 0.5);
}
.roster-shift-tag {
  display: flex;
  align-items: baseline;
  gap: 4px;
  background: color-mix(in srgb, var(--ink) 6%, var(--paper));
  border-radius: 5px;
  padding: 2px 5px;
  width: 100%;
  line-height: 1.3;
}
.shift-code {
  font-family: monospace;
  font-size: 11px;
  font-weight: 800;
  color: var(--ink);
}
.shift-time {
  font-size: 9px;
  color: var(--muted);
}
.roster-note-indicator {
  font-size: 9px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.roster-empty-cell {
  opacity: 0;
  margin-top: auto;
  text-align: right;
  transition: opacity 0.15s;
}
.day-button:hover .roster-empty-cell {
  opacity: 0.6;
}
.roster-add-hint {
  display: inline-block;
  font-size: 14px;
  font-weight: bold;
  color: var(--teal);
}
.legend-swatch {
  display: inline-block;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 800;
  margin-right: 4px;
}
.roster-selected-section {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 246, 233, 0.25);
  font-family: "Hanuman", "Helvetica Neue", Helvetica, Arial, sans-serif;
}
.roster-selected-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}
.roster-selected-header h4 {
  font-size: 11px;
  font-weight: 700;
  color: #ecd2b2;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.edit-roster-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #fff6e9;
  background: rgba(255, 246, 233, 0.18);
  border: 1px solid rgba(255, 246, 233, 0.35);
  padding: 3px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.edit-roster-btn:hover {
  background: rgba(255, 246, 233, 0.3);
  color: #ffffff;
}
.roster-selected-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}
.roster-detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.roster-detail-row .label {
  color: #ecd2b2;
  font-weight: 600;
}
.roster-detail-row .shift-hours {
  color: #fff6e9;
  font-size: 11px;
  opacity: 0.95;
}
.status-pill {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 9999px;
  letter-spacing: 0.05em;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.status-pill.status-draft {
  background: #f1f5f9;
  color: #0f172a;
  border: 1px solid #cbd5e1;
}
.status-pill.status-confirmed {
  background: #dcfce7;
  color: #14532d;
  border: 1px solid #86efac;
}
.status-pill.status-requested {
  background: #fef3c7;
  color: #78350f;
  border: 1px solid #fcd34d;
}
.status-pill.status-cancelled {
  background: #ffe4e6;
  color: #881337;
  border: 1px solid #fda4af;
}
.roster-detail-note {
  font-size: 11px;
  color: #fff6e9;
  font-style: italic;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 246, 233, 0.2);
  padding: 6px 9px;
  border-radius: 6px;
  margin-top: 4px;
}
.roster-no-entry {
  text-align: center;
  padding: 10px 0;
  color: #ecd2b2;
  font-size: 11px;
}
.set-shift-quick-btn {
  margin-top: 6px;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 246, 233, 0.35);
  background: rgba(255, 246, 233, 0.18);
  font-size: 11px;
  font-weight: 700;
  color: #fff6e9;
  cursor: pointer;
}
.roster-reset-btn {
  color: #e11d48;
}
.roster-reset-btn:hover {
  background: #ffe4e6;
  border-color: #f43f5e;
  color: #be123c;
}
:global(.dark) .roster-reset-btn {
  color: #fb7185;
}
:global(.dark) .roster-reset-btn:hover {
  background: rgba(225, 29, 72, 0.2);
  border-color: #fb7185;
  color: #fca5a5;
}
.roster-cell-holiday {
  width: 100%;
  margin-top: 2px;
  margin-bottom: 2px;
}
.roster-cell-holiday-tag {
  display: block;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 1px 4px;
  border-radius: 4px;
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  line-height: 1.3;
}
:global(.dark) .roster-cell-holiday-tag {
  background: rgba(185, 28, 28, 0.35);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.4);
}
.roster-sidebar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
.roster-menu-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.roster-menu-btn:hover {
  background: color-mix(in srgb, var(--teal) 6%, var(--paper));
  border-color: var(--teal);
  color: var(--teal);
}
.roster-menu-btn.auto-gen-btn {
  background: color-mix(in srgb, var(--teal) 10%, var(--paper));
  border-color: var(--teal);
  color: var(--teal);
}
</style>
