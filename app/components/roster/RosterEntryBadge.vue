<script setup lang="ts">
import { computed } from "vue";
import type { LeaveCode, RosterShift } from "~/types/roster";

const props = defineProps<{
  code: string;
  leaveCode?: LeaveCode | null;
  shift?: Pick<RosterShift, "startTime" | "endTime">;
  khmer?: boolean;
  showDescription?: boolean;
}>();
const leaveDetails = {
  PRD: { en: "Day off", km: "ថ្ងៃសម្រាក" },
  PHL: { en: "Holiday leave", km: "ច្បាប់បុណ្យជាតិ" },
  AL: { en: "Annual leave", km: "ច្បាប់ប្រចាំឆ្នាំ" },
  H1: { en: "Half-day", km: "កន្លះថ្ងៃ" },
  H2: { en: "Half-day", km: "កន្លះថ្ងៃ" },
};
const details = computed(() => props.leaveCode ? leaveDetails[props.leaveCode] : null);
const description = computed(() => details.value?.[props.khmer ? "km" : "en"] ?? "");
const time = computed(() => props.shift ? `${props.shift.startTime} – ${props.shift.endTime}` : "");
</script>

<template>
  <span class="roster-entry" :class="'entry-' + (leaveCode?.toLowerCase() || 'shift')" :title="[code, time || description].filter(Boolean).join(' · ')">
    <span class="roster-entry-label">
      <span class="roster-entry-code">{{ code }}</span>
    </span>
    <span v-if="time" class="roster-entry-time">{{ time }}</span>
    <span v-else-if="description && showDescription" class="roster-entry-description">{{ description }}</span>
  </span>
</template>

<style scoped>
/* Date cells carry the status color; keep their labels plain in both views. */
.roster-entry {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  max-width: 100%;
  min-width: 0;
  font-size: 10px;
  line-height: 1.5;
}
.roster-entry-label {
  max-width: 100%;
  font-weight: 800;
}
.roster-entry-code { min-width: 0; overflow-wrap: anywhere; }
.roster-entry-time {
  color: inherit;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.roster-entry-description {
  font-size: 9px;
}
@container roster-day (max-width: 95px) {
  .roster-entry-time, .roster-entry-description { display: none; }
}
@container roster-day (max-width: 65px) {
  .roster-entry { font-size: 9px; }
}
</style>
