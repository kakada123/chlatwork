<script setup lang="ts">
import { ArrowLeft, CalendarDays, Flower2, Moon, Sun } from "lucide-vue-next";
import CalendarShareButton from "~/components/khmer-calendar/CalendarShareButton.vue";
import {
  calendarDateLabel,
  calendarDetailPath,
  calendarMonthPath,
  getCalendarDetail,
  getCalendarDetailMeta,
} from "~/lib/calendar-sharing";
import {
  ENGLISH_MONTHS,
  KHMER_MONTHS,
  KHMER_WEEKDAYS,
  toKhmerDigits,
} from "~/lib/khmer-calendar";
import {
  getHolidaySchedule,
  type CalendarEvent,
} from "~/data/cambodia-holidays";
import { CELEBRATION_SOURCES } from "~/data/calendar-celebrations";

definePageMeta({ layout: false, blankCanvas: true });
const route = useRoute();
const { config } = useProductDomain();
const khmer = computed(() => route.query.lang !== "en");
const detail = computed(() => {
  const result = getCalendarDetail(route.params.date, route.query.event);
  // Fatal also shows Nuxt's 404 page when an invalid link is followed through client navigation.
  if (!result)
    throw createError({
      statusCode: 404,
      statusMessage: "Calendar date or event not found",
      fatal: true,
    });
  return result;
});
const day = computed(() => detail.value.day);
const event = computed(() => detail.value.event);
const schedule = computed(() => getHolidaySchedule(day.value.date.year));
const meta = computed(() =>
  getCalendarDetailMeta(day.value, event.value, khmer.value),
);
const dateLabel = computed(() => calendarDateLabel(day.value, khmer.value));
const path = computed(() =>
  calendarDetailPath(day.value.date, event.value?.id, khmer.value),
);
const publicUrl = computed(() => new URL(path.value, config.mainOrigin).href);
const events = computed(() => (event.value ? [event.value] : day.value.events));
const sources = computed(() => [
  ...schedule.value.sources,
  ...CELEBRATION_SOURCES,
]);
const weekday = computed(() =>
  khmer.value
    ? KHMER_WEEKDAYS[day.value.weekday]
    : [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][day.value.weekday],
);
const month = computed(
  () => (khmer.value ? KHMER_MONTHS : ENGLISH_MONTHS)[day.value.date.month - 1],
);

function label(km: string, en: string) {
  return khmer.value ? km : en;
}
function digits(value: number) {
  return khmer.value ? toKhmerDigits(value) : String(value);
}
function eventName(item: CalendarEvent) {
  return khmer.value ? item.nameKm : item.nameEn;
}

useSeoMeta({
  title: () => meta.value.title,
  description: () => meta.value.description,
  ogTitle: () => meta.value.title,
  ogDescription: () => meta.value.description,
  ogUrl: publicUrl,
  ogType: "website",
  twitterTitle: () => meta.value.title,
  twitterDescription: () => meta.value.description,
  twitterCard: "summary_large_image",
});
useHead(() => ({
  htmlAttrs: { lang: khmer.value ? "km" : "en" },
  link: [{ rel: "canonical", href: publicUrl.value }],
}));
</script>

<template>
  <main class="calendar-detail" :lang="khmer ? 'km' : 'en'">
    <div class="detail-shell">
      <header class="detail-header">
        <NuxtLink :to="calendarMonthPath(day.date, khmer)" class="back-link"
          ><ArrowLeft :size="16" aria-hidden="true" />{{
            label("ត្រឡប់ទៅប្រតិទិន", "Back to calendar")
          }}</NuxtLink
        >
        <NuxtLink
          :to="calendarDetailPath(day.date, event?.id, !khmer)"
          class="language-link"
          :aria-label="khmer ? 'Switch to English' : 'ប្ដូរទៅភាសាខ្មែរ'"
          >{{ khmer ? "EN" : "ខ្មែរ" }}</NuxtLink
        >
      </header>

      <section class="detail-hero">
        <p class="eyebrow">
          <CalendarDays :size="16" aria-hidden="true" />{{
            label("ប្រតិទិនខ្មែរ · កម្ពុជា", "KHMER CALENDAR · CAMBODIA")
          }}
        </p>
        <h1>{{ event ? eventName(event) : dateLabel }}</h1>
        <p class="hero-description">
          {{
            event
              ? dateLabel
              : label(
                  "ចន្ទគតិ ពិធីបុណ្យ និងទិវារំលឹកសម្រាប់ថ្ងៃនេះ",
                  "Lunar date, holidays and observances for this day",
                )
          }}
        </p>
        <CalendarShareButton :path="path" :title="meta.title" :khmer="khmer" />
      </section>

      <div class="detail-grid">
        <section
          class="date-card"
          :aria-label="label('ព័ត៌មានកាលបរិច្ឆេទ', 'Date information')"
        >
          <p class="date-weekday">{{ weekday }}</p>
          <div class="date-number">
            {{ digits(day.date.day)
            }}<component
              :is="day.lunar.moonPhase === 0 ? Sun : Moon"
              :size="34"
              :stroke-width="1"
              aria-hidden="true"
            />
          </div>
          <p class="date-month">{{ month }} {{ digits(day.date.year) }}</p>
          <div class="lunar-block">
            <h2>{{ label("ចន្ទគតិខ្មែរ", "Khmer lunar date") }}</h2>
            <p lang="km">
              {{ toKhmerDigits(day.lunar.day)
              }}{{ day.lunar.moonPhaseName }} ខែ{{ day.lunar.monthName }}
            </p>
            <p lang="km">
              ឆ្នាំ{{ day.lunar.animalYearName }} {{ day.lunar.sakName }} ព.ស.{{
                toKhmerDigits(day.lunar.beYear)
              }}
            </p>
          </div>
          <p v-if="day.holyDay" class="holy-label">
            <Flower2 :size="16" aria-hidden="true" />{{
              label("ថ្ងៃសីល", "Buddhist holy day")
            }}
          </p>
          <p class="timezone">Asia/Phnom_Penh · UTC+7</p>
        </section>

        <section
          class="events-panel"
          :aria-label="
            label('ពិធីបុណ្យ និងទិវារំលឹក', 'Holidays and observances')
          "
        >
          <div class="section-heading">
            <h2>
              {{
                event
                  ? label("អំពីព្រឹត្តិការណ៍នេះ", "About this occasion")
                  : label("ពិធីបុណ្យ និងទិវារំលឹក", "Holidays & observances")
              }}
            </h2>
            <span>{{ digits(events.length) }}</span>
          </div>
          <ul v-if="events.length" class="event-list">
            <li
              v-for="item in events"
              :key="item.id"
              :class="{ 'focused-event': event?.id === item.id }"
            >
              <span class="event-kind" :class="item.kind">{{
                item.kind === "public-holiday"
                  ? label(
                      "ថ្ងៃឈប់សម្រាកផ្លូវការនៅកម្ពុជា",
                      "Cambodian public holiday",
                    )
                  : label(
                      "ពិធីបុណ្យ / ទិវារំលឹក · មិនមែនថ្ងៃឈប់សម្រាក",
                      "Celebration / observance · not a public holiday",
                    )
              }}</span>
              <h3>
                <NuxtLink :to="calendarDetailPath(day.date, item.id, khmer)">{{
                  eventName(item)
                }}</NuxtLink>
              </h3>
              <p v-if="item.estimated" class="estimated">
                {{
                  label(
                    "កាលបរិច្ឆេទប៉ាន់ស្មាន · អាចប្រែប្រួលតាមសហគមន៍",
                    "Estimated date · local observance may vary",
                  )
                }}
              </p>
              <p v-if="khmer ? item.noteKm : item.noteEn" class="event-note">
                {{ khmer ? item.noteKm : item.noteEn }}
              </p>
              <CalendarShareButton
                :path="calendarDetailPath(day.date, item.id, khmer)"
                :title="getCalendarDetailMeta(day, item, khmer).title"
                :khmer="khmer"
              />
            </li>
          </ul>
          <p v-else class="empty-copy">
            {{
              label(
                "មិនមានពិធីបុណ្យ ឬទិវារំលឹកក្នុងបញ្ជីសម្រាប់ថ្ងៃនេះទេ។",
                "No listed holiday or observance for this date.",
              )
            }}
          </p>
          <NuxtLink
            v-if="event"
            :to="calendarDetailPath(day.date, undefined, khmer)"
            class="all-events-link"
            >{{
              label(
                "មើលព័ត៌មានទាំងអស់សម្រាប់ថ្ងៃនេះ",
                "View everything on this date",
              )
            }}</NuxtLink
          >
          <p v-if="!schedule.verified" class="coverage-notice" role="status">
            {{
              label(
                "មិនទាន់មានបញ្ជីថ្ងៃឈប់សម្រាកផ្លូវការសម្រាប់ឆ្នាំនេះទេ។ មានទិន្នន័យដែលបានផ្ទៀងផ្ទាត់សម្រាប់ឆ្នាំ ២០២៦ និង ២០២៧។",
                "The official public holiday schedule for this year is unavailable. Verified schedules cover 2026 and 2027.",
              )
            }}
          </p>
          <p class="classification-note">
            {{
              label(
                "ទិវារំលឹក និងថ្ងៃសីល មិនសុទ្ធតែជាថ្ងៃឈប់សម្រាកទេ។",
                "Observances and Buddhist holy days do not automatically mean a day off.",
              )
            }}
          </p>
        </section>
      </div>

      <footer class="detail-footer">
        <span
          >ChlatWork ·
          {{ label("ប្រភព និងឯកសារយោង", "Sources & references") }}</span
        >
        <a
          v-for="source in sources"
          :key="source.url"
          :href="source.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ source.name }} ↗</a
        >
      </footer>
    </div>
  </main>
</template>

<style scoped>
.calendar-detail {
  --paper: #fffefa;
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
  border-top: 4px solid #9a3038;
  line-height: 1.8;
}
:global(.dark) .calendar-detail {
  --paper: #202124;
  --canvas: #171819;
  --ink: #eeeae3;
  --muted: #aaa9a6;
  --line: #373638;
  --red: #f18c94;
  --gold: #d9b46b;
  --teal: #81c9b5;
}
.detail-shell {
  max-width: 1040px;
  margin: auto;
  padding: 20px 30px 28px;
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 650;
  min-height: 40px;
}
.language-link {
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 5px 13px;
  font-size: 12px;
  font-weight: 700;
  min-height: 36px;
}
.detail-hero {
  padding: 26px 0;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gold);
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 650;
}
h1 {
  font-size: clamp(23px, 3.8vw, 34px);
  line-height: 1.65;
  font-weight: 800;
  margin: 8px 0;
  overflow-wrap: anywhere;
}
.hero-description {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 16px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  align-items: start;
  gap: 22px;
}
.date-card {
  background: #722832;
  color: #fff6e9;
  padding: 24px;
  border-radius: 16px;
}
.date-weekday {
  font-size: 14px;
  font-weight: 650;
}
.date-number {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 76px;
  line-height: 1.3;
  margin: 8px 0;
  font-weight: 650;
}
.date-number svg {
  color: #e8c88d;
}
.date-month {
  font-size: 16px;
}
.lunar-block {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #ffffff30;
}
.lunar-block h2 {
  color: #ecd2b2;
  font-size: 11px;
  margin-bottom: 8px;
}
.lunar-block p {
  font-size: 13px;
  line-height: 2;
}
.holy-label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #f8dc9b;
  font-size: 12px;
  margin-top: 14px;
}
.timezone {
  font-size: 10px;
  color: #ecd2b2;
  margin-top: 18px;
}
.events-panel {
  min-width: 0;
  padding: 22px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 16px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.section-heading h2 {
  font-size: 15px;
  font-weight: 750;
}
.section-heading > span {
  color: var(--muted);
  font-size: 12px;
}
.event-list li {
  padding: 20px 0;
}
.event-list li + li {
  border-top: 1px solid var(--line);
}
.event-kind {
  display: inline-block;
  font-size: 10px;
  color: var(--teal);
  background: color-mix(in srgb, var(--teal) 7%, transparent);
  border-radius: 5px;
  padding: 3px 7px;
}
.event-kind.public-holiday {
  color: var(--red);
  background: color-mix(in srgb, var(--red) 7%, transparent);
}
h3 {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.9;
  margin: 10px 0 14px;
}
h3 a:hover,
.back-link:hover {
  color: var(--red);
}
.event-note,
.estimated {
  margin-bottom: 14px;
  color: var(--muted);
  font-size: 12px;
}
.estimated {
  color: var(--gold);
}
.classification-note,
.empty-copy {
  font-size: 12px;
  color: var(--muted);
  margin-top: 16px;
}
.classification-note {
  border-top: 1px solid var(--line);
  padding-top: 14px;
}
.coverage-notice {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  margin-top: 18px;
  color: var(--gold);
}
.all-events-link {
  display: inline-block;
  font-size: 12px;
  color: var(--red);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.detail-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 16px;
  padding-top: 24px;
  color: var(--muted);
  font-size: 10px;
}
.detail-footer a {
  text-decoration: underline;
  text-underline-offset: 3px;
}
a:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
@media (max-width: 650px) {
  .detail-shell {
    padding: 12px 16px 24px;
  }
  .detail-hero {
    padding: 18px 0 22px;
  }
  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .date-card {
    padding: 20px;
  }
  .date-number {
    font-size: 58px;
    margin: 4px 0;
  }
  .lunar-block {
    margin-top: 16px;
    padding-top: 14px;
  }
  .events-panel {
    padding: 18px;
  }
}
</style>
