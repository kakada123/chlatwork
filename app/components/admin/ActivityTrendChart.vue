<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import type { DailyAdminActivity } from "~/lib/admin-dashboard";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

const props = defineProps<{ days: DailyAdminActivity[] }>();
const descriptionId = useId();
const chart = ref<SVGSVGElement | null>(null);
const viewport = ref({ width: 720, height: 232 });
let observer: ResizeObserver | undefined;
onMounted(() => {
  if (typeof ResizeObserver === "undefined") return;
  observer = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
      // Match SVG units to CSS pixels so labels stay readable in narrow or short panels.
      viewport.value = { width: entry.contentRect.width, height: entry.contentRect.height };
    }
  });
  if (chart.value) observer.observe(chart.value);
});
watch(chart, (current, previous) => {
  if (previous) observer?.unobserve(previous);
  if (current) observer?.observe(current);
});
onBeforeUnmount(() => observer?.disconnect());
const maxValue = computed(() => {
  const maximum = Math.max(1, ...props.days.flatMap((day) => [day.opens, day.completions]));
  return Math.ceil(maximum / 4) * 4;
});
const hasActivity = computed(() => props.days.some((day) => day.opens || day.completions));
const plotWidth = computed(() => Math.max(1, viewport.value.width - 52));
const baseline = computed(() => Math.max(24, viewport.value.height - 30));
const x = (index: number) => 40 + ((index + 0.5) / Math.max(1, props.days.length)) * plotWidth.value;
const y = (value: number) => baseline.value - (value / maxValue.value) * Math.max(1, baseline.value - 14);
const barWidth = computed(() => Math.min(24, (plotWidth.value / Math.max(1, props.days.length)) * 0.55));
const completionPath = computed(() => props.days.map((day, index) =>
  `${index ? "L" : "M"} ${x(index)} ${y(day.completions)}`).join(" "));
const ticks = computed(() => [0, 1, 2, 3, 4].map((index) => ({
  value: (maxValue.value * index) / 4,
  y: y((maxValue.value * index) / 4),
})));
const labelIndices = computed(() => {
  const count = Math.min(viewport.value.width < 420 ? 3 : 5, props.days.length);
  return [...new Set(Array.from({ length: count }, (_, index) =>
    Math.round((index * (props.days.length - 1)) / Math.max(1, count - 1))))];
});
const dateLabel = (date: string) => new Intl.DateTimeFormat(t("shared.components_admin_activity_dashboard.en_us"), {
  month: "short", day: "numeric", timeZone: "UTC",
}).format(new Date(`${date}T00:00:00Z`));
const countLabel = (value: number) => new Intl.NumberFormat(t("shared.components_admin_activity_dashboard.en_us"), {
  notation: "compact", maximumFractionDigits: 1,
}).format(value);
const description = computed(() => props.days.map((day) =>
  t("shared.components_admin_activity_trend_chart.opens_completed_actions_active_users", { dateLabelDayDate: dateLabel(day.date), dayOpens: day.opens, dayCompletions: day.completions, dayActiveUsers: day.activeUsers })).join(" "));
</script>

<template>
  <div class="activity-trend">
    <div class="trend-legend" :aria-label="t(&quot;shared.components_admin_activity_trend_chart.chart_legend&quot;)">
      <span><i class="legend-opens" />{{ t("shared.components_admin_activity_dashboard.tool_opens") }}</span>
      <span><i class="legend-completions" />{{ t("shared.components_admin_activity_dashboard.completed_actions") }}</span>
      <span class="trend-timezone">{{ t("shared.components_admin_activity_trend_chart.utc_days") }}</span>
    </div>
    <svg v-if="hasActivity" ref="chart" :viewBox="`0 0 ${viewport.width} ${viewport.height}`" role="img" :aria-label="t(&quot;shared.components_admin_activity_trend_chart.daily_activity_chart&quot;)" :aria-describedby="descriptionId" class="trend-svg">
      <desc :id="descriptionId">{{ description }}</desc>
      <g v-for="tick in ticks" :key="tick.y" class="trend-axis">
        <line x1="40" :x2="viewport.width - 12" :y1="tick.y" :y2="tick.y" />
        <text x="30" :y="tick.y + 4" text-anchor="end">{{ countLabel(tick.value) }}</text>
      </g>
      <g v-for="(day, index) in props.days" :key="day.date">
        <title>{{ dateLabel(day.date) }}: {{ day.opens }} {{ t("shared.components_admin_activity_trend_chart.opens") }} {{ day.completions }} {{ t("shared.components_admin_activity_trend_chart.completed") }} {{ day.activeUsers }} {{ t("shared.components_admin_activity_trend_chart.users") }}</title>
        <rect :x="x(index) - barWidth / 2" :y="y(day.opens)" :width="barWidth" :height="baseline - y(day.opens)" rx="2" class="trend-bar" />
      </g>
      <path :d="completionPath" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" class="trend-line" />
      <circle v-if="props.days.length === 1" :cx="x(0)" :cy="y(props.days[0]!.completions)" r="3" class="trend-point" />
      <text v-for="index in labelIndices" :key="index" :x="x(index)" :y="viewport.height - 7" :text-anchor="index === 0 ? 'start' : index === props.days.length - 1 ? 'end' : 'middle'" class="trend-date">{{ dateLabel(props.days[index]!.date) }}</text>
    </svg>
    <div v-else class="trend-empty">{{ t("shared.components_admin_activity_trend_chart.no_activity_in_this_period") }}</div>
  </div>
</template>

<style scoped>
.activity-trend { display: flex; min-height: 0; height: 100%; flex-direction: column; gap: 8px; }
.trend-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; font-size: 11px; color: var(--dashboard-muted, #64748b); }
.trend-legend span { display: inline-flex; align-items: center; gap: 6px; }
.trend-legend i { height: 8px; width: 8px; border-radius: 3px; }
.legend-opens { background: var(--dashboard-opens, #0284c7); }
.legend-completions { background: var(--dashboard-completions, #8b5cf6); }
.trend-timezone { margin-left: auto; }
.trend-svg { width: 100%; height: 100%; flex: 1; min-height: 0; overflow: visible; }
.trend-axis line { stroke: var(--dashboard-border, #e2e8f0); stroke-dasharray: 3 5; }
.trend-axis text, .trend-date { fill: var(--dashboard-muted, #64748b); font-size: 11px; }
.trend-bar { fill: var(--dashboard-opens, #0284c7); opacity: 0.8; }
.trend-bar:hover { opacity: 1; }
.trend-line { stroke: var(--dashboard-completions, #8b5cf6); }
.trend-point { fill: var(--dashboard-completions, #8b5cf6); }
.trend-empty { display: grid; flex: 1; min-height: 0; place-items: center; color: var(--dashboard-muted, #64748b); font-size: 14px; }
</style>
