<script setup lang="ts">
import CelebrationBrowser from "~/components/khmer-calendar/CelebrationBrowser.vue";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Expand,
  Flower2,
  Minimize,
  Moon,
  Sun,
} from "lucide-vue-next";
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
useSeoMeta({
  title:
    "ប្រតិទិនខ្មែរ · Khmer Calendar & Cambodia Public Holidays | ChlatWork",
  description:
    "A full-screen Khmer calendar with Cambodian public holidays, Chinese New Year, Christmas, Halloween, Valentine’s Day, international celebrations and Khmer lunar dates.",
  ogTitle: "Khmer Calendar · ប្រតិទិនខ្មែរ | ChlatWork",
  ogDescription:
    "Explore Khmer lunar dates, Cambodian festivals and international celebrations in one calendar.",
});

const khmer = ref(true);
// Nuxt serializes this initial civil date so hydration cannot cross a midnight boundary.
const today = useState<CalendarDate>("khmer-calendar-today", () =>
  getPhnomPenhToday(),
);
const selected = ref<CalendarDate>({ ...today.value });
const calendarRoot = ref<HTMLElement | null>(null);
const fullscreen = ref(false);
const fullscreenSupported = ref(false);
const fullscreenError = ref("");
const showObservances = ref(true);
const years = Array.from(
  { length: MAX_CALENDAR_YEAR - MIN_CALENDAR_YEAR + 1 },
  (_, index) => MIN_CALENDAR_YEAR + index,
);
const months = computed(() => (khmer.value ? KHMER_MONTHS : ENGLISH_MONTHS));
const weekdays = computed(() =>
  khmer.value
    ? KHMER_WEEKDAYS
    : [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
);
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
    `ឆ្នាំ${detail.value.lunar.animalYearName} ${detail.value.lunar.sakName} ព.ស.${toKhmerDigits(detail.value.lunar.beYear)}`,
);

function digits(value: number | string) {
  return khmer.value ? toKhmerDigits(value) : String(value);
}
function label(km: string, en: string) {
  return khmer.value ? km : en;
}
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
    `${lunarLabel(day)} ខែ${day.lunar.monthName}`,
    day.holyDay ? label("ថ្ងៃសីល", "Buddhist holy day") : "",
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
  } catch {
    return;
  }
}
function selectCelebrationDate(date: CalendarDate) {
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
    fullscreenError.value = label(
      "មិនអាចបើកពេញអេក្រង់បានទេ។ អ្នកអាចបន្តប្រើប្រតិទិននេះបាន។",
      "Fullscreen is unavailable in this browser. You can keep using the full-window calendar.",
    );
  }
}
let todayTimer: ReturnType<typeof setInterval> | undefined;
function refreshToday() {
  today.value = getPhnomPenhToday();
}
onMounted(() => {
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
  <main ref="calendarRoot" class="khmer-calendar" :lang="khmer ? 'km' : 'en'">
    <header class="calendar-header">
      <div class="brand-row">
        <NuxtLink to="/tools" class="back-link"
          ><ArrowLeft :size="15" aria-hidden="true" /> ChlatWork
          <span>/ {{ label("ឧបករណ៍", "Tools") }}</span></NuxtLink
        >
        <div class="header-actions">
          <button
            type="button"
            class="language-button"
            :aria-label="khmer ? 'Switch to English' : 'ប្ដូរទៅភាសាខ្មែរ'"
            @click="khmer = !khmer"
          >
            {{ khmer ? "EN" : "ខ្មែរ" }}
          </button>
          <button
            v-if="fullscreenSupported"
            type="button"
            class="icon-button"
            :aria-label="
              fullscreen
                ? label('ចាកចេញពីពេញអេក្រង់', 'Exit fullscreen')
                : label('បើកពេញអេក្រង់', 'Enter fullscreen')
            "
            :title="label('ពេញអេក្រង់', 'Fullscreen')"
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
          <CalendarDays :size="27" :stroke-width="1.5" aria-hidden="true" />
        </div>
        <div>
          <p class="eyebrow">
            {{
              label(
                "កាលបរិច្ឆេទ · ប្រពៃណី · កម្ពុជា",
                "DATES · TRADITION · CAMBODIA",
              )
            }}
          </p>
          <h1>{{ label("ប្រតិទិនខ្មែរ", "Khmer Calendar") }}</h1>
          <p class="header-description">
            {{
              label(
                "ចន្ទគតិខ្មែរ និងពិធីបុណ្យក្នុងស្រុក និងអន្តរជាតិ",
                "Khmer lunar dates & celebrations around the world",
              )
            }}
          </p>
        </div>
        <div class="today-summary">
          <span>{{ label("ថ្ងៃនេះនៅកម្ពុជា", "TODAY IN CAMBODIA") }}</span
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
          :aria-label="label('ប្រតិទិនប្រចាំខែ', 'Monthly calendar')"
        >
          <div class="month-toolbar">
            <div class="month-heading">
              <h2 aria-live="polite">{{ monthTitle }}</h2>
              <p lang="km">{{ lunarMonths }}</p>
            </div>
            <div class="month-controls">
              <button type="button" class="today-button" @click="goToday">
                {{ label("ថ្ងៃនេះ", "Today") }}
              </button>
              <button
                type="button"
                class="icon-button"
                :disabled="!previousMonth"
                :aria-label="label('ខែមុន', 'Previous month')"
                @click="changeMonth(-1)"
              >
                <ChevronLeft :size="19" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="icon-button"
                :disabled="!nextMonth"
                :aria-label="label('ខែបន្ទាប់', 'Next month')"
                @click="changeMonth(1)"
              >
                <ChevronRight :size="19" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="calendar-options">
            <div class="date-selectors">
              <label class="sr-only" for="calendar-month">{{
                label("ខែ", "Month")
              }}</label>
              <select
                id="calendar-month"
                :value="selected.month"
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
              </select>
              <label class="sr-only" for="calendar-year">{{
                label("ឆ្នាំ", "Year")
              }}</label>
              <select
                id="calendar-year"
                :value="selected.year"
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
              </select>
            </div>
            <label class="observance-toggle"
              ><input v-model="showObservances" type="checkbox" />
              {{ label("បង្ហាញទិវារំលឹក", "Show observances") }}</label
            >
          </div>

          <table class="month-grid">
            <caption class="sr-only">
              {{
                monthTitle
              }}
              ·
              {{
                label(
                  "ប្រើគ្រាប់ចុចព្រួញដើម្បីជ្រើសថ្ងៃ",
                  "Use arrow keys to select a date; Page Up and Page Down to change month",
                )
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
                    }"
                    :data-date="day.key"
                    :aria-label="dayLabel(day)"
                    :aria-pressed="day.key === selectedKey"
                    :aria-current="day.key === todayKey ? 'date' : undefined"
                    :tabindex="day.key === selectedKey ? 0 : -1"
                    @click="selectDate(day.date)"
                    @keydown="handleDayKey($event, day)"
                  >
                    <span class="day-top"
                      ><span class="day-number">{{ digits(day.date.day) }}</span
                      ><Flower2
                        v-if="day.holyDay"
                        :size="14"
                        class="holy-icon"
                        aria-hidden="true" /><span
                        v-else-if="day.key === todayKey"
                        class="today-dot"
                        aria-hidden="true"
                    /></span>
                    <span class="lunar-date" lang="km"
                      >{{ lunarLabel(day)
                      }}<span class="lunar-month">
                        {{ day.lunar.monthName }}</span
                      ></span
                    >
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
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="calendar-legend">
            <span
              ><i class="holiday-dot" />{{
                label("ថ្ងៃឈប់សម្រាក", "Public holiday")
              }}</span
            ><span
              ><Flower2 :size="13" class="holy-icon" aria-hidden="true" />{{
                label("ថ្ងៃសីល", "Buddhist holy day")
              }}</span
            ><span
              ><i class="observance-dot" />{{
                label("ទិវារំលឹក", "Observance")
              }}</span
            ><small
              >{{ digits(monthHolidayCount) }}
              {{
                label(
                  "ថ្ងៃឈប់សម្រាកក្នុងខែនេះ",
                  "public holiday dates this month",
                )
              }}</small
            >
          </div>
        </section>

        <aside
          class="calendar-sidebar"
          :aria-label="
            label('ព័ត៌មានថ្ងៃ និងពិធីបុណ្យ', 'Date details and events')
          "
        >
          <section class="selected-card" aria-live="polite" aria-atomic="true">
            <p class="selected-eyebrow">
              {{ label("ថ្ងៃដែលបានជ្រើសរើស", "SELECTED DATE") }}
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
                ថ្ងៃ{{ KHMER_WEEKDAYS[detail.weekday] }}
                {{ lunarLabel(detail) }} ខែ{{ detail.lunar.monthName }}
              </p>
              <p>{{ lunarYear }}</p>
            </div>
            <span v-if="detail.holyDay" class="holy-badge"
              ><Flower2 :size="14" aria-hidden="true" />{{
                label("ថ្ងៃសីល", "Buddhist holy day")
              }}</span
            >
            <dl class="year-details">
              <div>
                <dt>{{ label("ពុទ្ធសករាជ", "Buddhist Era") }}</dt>
                <dd>{{ digits(detail.lunar.beYear) }}</dd>
              </div>
              <div>
                <dt>{{ label("ឆ្នាំខ្មែរ", "Animal year") }}</dt>
                <dd lang="km">{{ detail.lunar.animalYearName }}</dd>
              </div>
              <div>
                <dt>{{ label("ស័ក", "Sak cycle") }}</dt>
                <dd lang="km">{{ detail.lunar.sakName }}</dd>
              </div>
            </dl>
          </section>

          <section class="day-detail-panel">
            <h3>{{ label("ពិធីបុណ្យ និងទិវា", "Holidays & observances") }}</h3>
            <ul v-if="selectedEvents.length" class="selected-events">
              <li v-for="event in selectedEvents" :key="event.id">
                <span class="event-type" :class="event.kind">{{
                  event.kind === "public-holiday"
                    ? label("ថ្ងៃឈប់សម្រាក", "Public holiday")
                    : label(
                        "ពិធីបុណ្យ / ទិវា · មិនមែនថ្ងៃឈប់សម្រាក",
                        "Celebration / observance · not a public holiday",
                      )
                }}</span>
                <p>{{ eventName(event) }}</p>
                <small v-if="event.estimated" class="estimated-note"
                  >{{ label("ប៉ាន់ស្មាន", "Estimated") }} ·
                  {{ khmer ? event.noteKm : event.noteEn }}</small
                >
              </li>
            </ul>
            <p v-else class="empty-copy">
              {{
                schedule.verified
                  ? label(
                      "មិនមានថ្ងៃបុណ្យក្នុងបញ្ជីសម្រាប់ថ្ងៃនេះទេ។",
                      "No listed holiday or observance for this date.",
                    )
                  : label(
                      "មិនទាន់មានបញ្ជីថ្ងៃឈប់សម្រាកផ្លូវការសម្រាប់ឆ្នាំនេះទេ។",
                      "The official public holiday schedule for this year is not available.",
                    )
              }}
            </p>
          </section>

          <section class="month-event-panel">
            <div class="section-heading">
              <h3>{{ label("ក្នុងខែនេះ", "This month") }}</h3>
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
                          ? label("ថ្ងៃឈប់សម្រាក", "Public holiday")
                          : label(
                              "ពិធីបុណ្យ / ទិវា",
                              "Celebration / observance",
                            )
                      }}<template v-if="event.estimated">
                        · {{ label("ប៉ាន់ស្មាន", "Estimated") }}</template
                      ></small
                    ></span
                  ><ChevronRight :size="14" aria-hidden="true" />
                </button>
              </li>
            </ul>
            <p v-else class="empty-copy">
              {{
                label(
                  "មិនមានពិធីបុណ្យក្នុងបញ្ជីសម្រាប់ខែនេះទេ។",
                  "No listed events this month.",
                )
              }}
            </p>
          </section>
        </aside>
      </div>

      <CelebrationBrowser
        :year="selected.year"
        :khmer="khmer"
        @select="selectCelebrationDate"
      />

      <footer class="calendar-footer">
        <div>
          <p v-if="schedule.verified">
            <strong
              >{{ digits(schedule.holidayDayCount ?? 0) }}
              {{
                label(
                  "ថ្ងៃឈប់សម្រាកផ្លូវការ ក្នុងឆ្នាំ",
                  "official public holiday dates in",
                )
              }}
              {{ digits(selected.year) }}</strong
            ><span>{{
              label(
                "ទិវារំលឹក និងថ្ងៃសីល មិនសុទ្ធតែជាថ្ងៃឈប់សម្រាកទេ។",
                "Observances and Buddhist holy days do not automatically mean a day off.",
              )
            }}</span>
          </p>
          <p v-else class="coverage-notice" role="status">
            <strong>{{
              label(
                "មិនទាន់មានបញ្ជីថ្ងៃឈប់សម្រាកផ្លូវការសម្រាប់ឆ្នាំនេះ",
                "Official holiday schedule unavailable for this year",
              )
            }}</strong
            ><span>{{
              label(
                "មានទិន្នន័យថ្ងៃឈប់សម្រាកដែលបានផ្ទៀងផ្ទាត់សម្រាប់ឆ្នាំ ២០២៦ និង ២០២៧។ កាលបរិច្ឆេទចន្ទគតិនៅតែអាចមើលបាន។",
                "Verified public holidays cover 2026 and 2027. Lunar dates remain available for the selected year.",
              )
            }}</span>
          </p>
        </div>
        <div class="source-links">
          <span>{{ label("ប្រភពផ្លូវការ", "Official sources") }}</span
          ><a
            v-for="source in schedule.sources"
            :key="source.url"
            :href="source.url"
            target="_blank"
            rel="noopener noreferrer"
            >{{ source.name }} ↗</a
          ><span v-if="!schedule.sources.length">{{
            label("ទិន្នន័យចន្ទគតិ · ១៩០០–២១០០", "Lunar calendar · 1900–2100")
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
  padding: 16px 36px 25px;
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
  margin-bottom: 23px;
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
  gap: 17px;
}
.calendar-emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 61px;
  height: 66px;
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
  margin-bottom: 4px;
}
h1 {
  font-size: 28px;
  line-height: 1.6;
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
}
.date-selectors select {
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 5px 28px 5px 10px;
  background-color: var(--paper);
  color: var(--ink);
  font-size: 12px;
  min-height: 34px;
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
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
  .selected-card {
    grid-row: span 2;
  }
  .month-grid td {
    height: 105px;
  }
  .calendar-header {
    padding: 13px 22px 22px;
  }
  .month-event-list {
    max-height: 220px;
  }
}
@media (max-width: 540px) {
  .calendar-header {
    padding: 10px 15px 19px;
  }
  .brand-row {
    margin-bottom: 17px;
  }
  .title-row {
    gap: 12px;
  }
  .calendar-emblem {
    width: 46px;
    height: 54px;
    border-radius: 14px 14px 6px 6px;
    flex-shrink: 0;
  }
  h1 {
    font-size: 24px;
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
  .date-selectors select {
    font-size: 11px;
    min-height: 32px;
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
}
@media (prefers-reduced-motion: reduce) {
  .day-button {
    transition: none;
  }
}
</style>
