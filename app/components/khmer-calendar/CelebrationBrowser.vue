<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { computed, ref } from "vue";
import { calendarDetailPath, parseCalendarDate } from "~/lib/calendar-sharing";
import {
  CELEBRATION_CATEGORIES,
  CELEBRATION_SOURCES,
} from "~/data/calendar-celebrations";
import {
  ENGLISH_MONTHS,
  getCalendarYearEvents,
  KHMER_MONTHS,
  toKhmerDigits,
  type CalendarDate,
} from "~/lib/khmer-calendar";

const props = defineProps<{ year: number; khmer: boolean }>();
const { t } = useAppI18n(computed(() => props.khmer));
const emit = defineEmits<{ select: [date: CalendarDate] }>();
const categoryLabelKeys: Record<string, string> = {
  "cambodian": "shared.calendar_categories.cambodian",
  "chinese": "shared.calendar_categories.chinese",
  "international": "shared.calendar_categories.international",
  "family": "shared.calendar_categories.family",
  "buddhist": "shared.calendar_categories.buddhist",
  "christian": "shared.calendar_categories.christian",
  "muslim": "shared.calendar_categories.muslim"
};
const search = ref("");
const category = ref("all");
const yearEvents = computed(() => getCalendarYearEvents(props.year));
const filteredEvents = computed(() => {
  const query = search.value.normalize("NFKC").trim().toLowerCase();
  return yearEvents.value.filter(
    (event) =>
      (category.value === "all" ||
        (category.value === "public-holiday"
          ? event.kind === "public-holiday"
          : (event.category ?? "cambodian") === category.value)) &&
      (!query ||
        `${event.nameKm} ${event.nameEn} ${event.date}`
          .normalize("NFKC")
          .toLowerCase()
          .includes(query)),
  );
});
const eventGroups = computed(() =>
  Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    title: (props.khmer ? KHMER_MONTHS : ENGLISH_MONTHS)[index],
    events: filteredEvents.value.filter(
      (event) => Number(event.date.slice(5, 7)) === index + 1,
    ),
  })).filter((group) => group.events.length),
);
function digits(value: number | string) {
  return props.khmer ? toKhmerDigits(value) : value;
}
function openDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  emit("select", { year: year!, month: month!, day: day! });
}
function eventPath(date: string, id: string) {
  return calendarDetailPath(parseCalendarDate(date)!, id, props.khmer);
}
</script>

<template>
  <details class="celebration-browser">
    <summary>
      <span
        ><strong>{{
          t("shared.calendar.festivals_special_occasions_throughout_the_year")
        }}</strong
        ><small
          >{{ digits(filteredEvents.length) }}
          {{ t("shared.calendar.events_in") }}
          {{ digits(year) }}</small
        ></span
      ><span aria-hidden="true">＋</span>
    </summary>
    <div class="browser-body">
      <p class="scope-note">
        {{
          t("shared.calendar.includes_cambodian_chinese_religious_family_and_major_international_occasions")
        }}
      </p>
      <div class="browser-filters">
        <label
          >{{ t("shared.calendar.find_a_celebration")
          }}<input
            v-model="search"
            type="search"
            :placeholder="
              t(&quot;shared.calendar.e_g_christmas_2026_12&quot;)
            "
        /></label>
        <label
          >{{ t("shared.layouts_default.category")
          }}<ModernSelect
            v-model="category"
            class="w-full"
            :search-placeholder="t(&quot;shared.calendar.search_categories&quot;)"
          >
            <option value="all">{{ t("shared.calendar.all_occasions") }}</option>
            <option value="public-holiday">
              {{ t("shared.calendar.official_public_holidays") }}
            </option>
            <option
              v-for="item in CELEBRATION_CATEGORIES"
              :key="item.key"
              :value="item.key"
            >
              {{ t(categoryLabelKeys[item.key]!) }}
            </option>
          </ModernSelect></label
        >
      </div>
      <p class="result-count" role="status">
        {{ digits(filteredEvents.length) }} {{ t("shared.calendar.results") }}
      </p>
      <div v-if="eventGroups.length" class="annual-events">
        <section v-for="group in eventGroups" :key="group.month">
          <h3>{{ group.title }}</h3>
          <ul>
            <li
              v-for="event in group.events"
              :key="`${event.date}-${event.id}`"
            >
              <button type="button" @click="openDate(event.date)">
                <span class="occasion-day">{{
                  digits(Number(event.date.slice(8)))
                }}</span
                ><span
                  ><strong>{{ khmer ? event.nameKm : event.nameEn }}</strong
                  ><small :class="event.kind"
                    >{{
                      event.kind === "public-holiday"
                        ? t("shared.calendar.public_holiday")
                        : t("shared.calendar.celebration_observance")
                    }}<template v-if="event.estimated">
                      · {{ t("shared.calendar.estimated") }}</template
                    ></small
                  ><span v-if="event.noteEn" class="occasion-note">{{
                    khmer ? event.noteKm : event.noteEn
                  }}</span></span
                >
              </button>
              <NuxtLink
                :to="eventPath(event.date, event.id)"
                class="occasion-details"
                >{{
                  t("shared.calendar.details_share")
                }}
                ↗</NuxtLink
              >
            </li>
          </ul>
        </section>
      </div>
      <p v-else class="scope-note">
        {{
          t("shared.calendar.no_matching_occasions_try_another_search_or_choose_all")
        }}
      </p>
      <div class="celebration-sources">
        <span>{{ t("shared.calendar.sources_references") }}</span
        ><a
          v-for="source in CELEBRATION_SOURCES"
          :key="source.url"
          :href="source.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ source.name }} ↗</a
        >
      </div>
    </div>
  </details>
</template>

<style scoped>
.celebration-browser {
  margin-top: 22px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
}
summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 19px 22px;
  cursor: pointer;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
summary strong {
  font-size: 14px;
  font-weight: 700;
}
summary small {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-top: 5px;
}
summary > span:last-child {
  font-size: 24px;
  color: var(--red);
}
.browser-body {
  padding: 0 22px 22px;
}
.scope-note {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.9;
}
.browser-filters {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 15px;
  margin-top: 18px;
}
.browser-filters label {
  display: grid;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
}
.browser-filters input {
  min-width: 0;
  width: 100%;
  padding: 9px 12px;
  min-height: 42px;
  font-size: 13px;
  color: var(--ink);
  background: var(--canvas);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.result-count {
  margin: 13px 0;
  font-size: 11px;
  color: var(--muted);
}
.annual-events {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 25px;
}
h3 {
  color: var(--red);
  font-size: 14px;
  font-weight: 700;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}
li + li {
  border-top: 1px solid var(--line);
}
li button {
  display: flex;
  width: 100%;
  gap: 11px;
  text-align: left;
  padding: 11px 0;
}
li button:hover strong {
  color: var(--red);
}
.occasion-day {
  color: var(--muted);
  width: 24px;
  flex-shrink: 0;
  font-size: 15px;
}
li strong {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.9;
}
li small {
  display: block;
  font-size: 10px;
  color: var(--teal);
  margin-top: 3px;
}
li small.public-holiday {
  color: var(--red);
}
.occasion-note {
  display: block;
  font-size: 10px;
  color: var(--muted);
  margin-top: 4px;
}
.occasion-details {
  display: inline-block;
  margin: 0 0 10px 35px;
  min-height: 30px;
  color: var(--red);
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.celebration-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 16px;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 10px;
}
.celebration-sources a {
  text-decoration: underline;
  text-underline-offset: 3px;
}
button:focus-visible,
summary:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 3px;
}
@media (max-width: 850px) {
  .annual-events {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 540px) {
  summary {
    padding: 16px;
  }
  summary strong {
    font-size: 13px;
  }
  .browser-body {
    padding: 0 16px 16px;
  }
  .browser-filters,
  .annual-events {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
