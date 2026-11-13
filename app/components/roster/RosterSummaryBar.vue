<script setup lang="ts">
import { computed } from "vue";
import { AlertTriangle } from "lucide-vue-next";
import { toKhmerDigits } from "~/lib/khmer-calendar";
import type { MonthlyRosterSummary } from "~/types/roster";
const props = defineProps<{
  summary: MonthlyRosterSummary;
  year: number;
  khmer: boolean;
}>();
const d = (value: number | string) =>
  props.khmer ? toKhmerDigits(value) : String(value);
const left = (value: number) => `${d(value)} ${props.khmer ? "សល់" : "left"}`;
const metrics = computed(() => [
  {
    key: "work",
    label: props.khmer ? "ថ្ងៃធ្វើការ" : "Work days",
    value: d(props.summary.workingDays),
    detail: "",
  },
  {
    key: "prd",
    label: "PRD",
    value: `${d(props.summary.prdUsed)} / ${d(props.summary.prdAllowance)}`,
    detail: left(props.summary.prdRemaining),
  },
  {
    key: "phl",
    label: `PHL · ${d(props.year)}`,
    value: d(props.summary.phlUsed),
    detail: left(props.summary.phlRemaining),
  },
  {
    key: "al",
    label: `AL · ${d(props.year)}`,
    value: d(props.summary.alUsed),
    detail: left(props.summary.alRemaining),
  },
  {
    key: "half",
    label: "H1 / H2",
    value: d(props.summary.halfDaysCount),
    detail: props.khmer ? "កន្លះថ្ងៃ" : "half-days",
  },
  {
    key: "pending",
    label: props.khmer ? "រង់ចាំបញ្ជាក់" : "Pending",
    value: d(props.summary.pendingRequests),
    detail: "",
  },
  {
    key: "empty",
    label: props.khmer ? "មិនទាន់កំណត់" : "Unassigned",
    value: d(props.summary.unassignedDays),
    detail: "",
  },
]);
const exceeded = computed(
  () =>
    props.summary.prdRemaining < 0 ||
    props.summary.phlRemaining < 0 ||
    props.summary.alRemaining < 0,
);
</script>
<template>
  <div class="roster-summary-bar">
    <div class="summary-metrics">
      <span
        v-for="metric in metrics"
        :key="metric.key"
        class="summary-metric"
        :class="'metric-' + metric.key"
        ><span class="metric-label">{{ metric.label }}</span
        ><strong>{{ metric.value }}</strong
        ><small v-if="metric.detail">{{ metric.detail }}</small></span
      >
    </div>
    <p v-if="exceeded" role="alert" class="summary-warning">
      <AlertTriangle :size="13" aria-hidden="true" />{{
        khmer
          ? "សូមពិនិត្យកូតា PRD និងសមតុល្យ PHL/AL។"
          : "Review PRD allowance and PHL/AL balances."
      }}
    </p>
  </div>
</template>
<style scoped>
.roster-summary-bar {
  border-top: 1px solid var(--line);
  color: var(--ink);
  font-family: var(--app-font);
}
.summary-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  padding: 9px 0;
  font-size: 11px;
}
.summary-metric {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
}
.metric-label {
  font-weight: 600;
}
.summary-metric small {
  color: var(--muted);
  font-size: 10px;
}
.metric-work .metric-label {
  color: var(--teal);
}
.metric-prd .metric-label {
  color: var(--red);
}
.metric-phl .metric-label,
.metric-pending .metric-label {
  color: var(--gold);
}
.metric-al .metric-label,
.metric-half .metric-label {
  color: #8b5cf6;
}
.summary-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--red);
  font-size: 11px;
  padding-bottom: 8px;
}
@media (max-width: 540px) {
  .summary-metrics {
    gap: 8px 14px;
  }
}
</style>
