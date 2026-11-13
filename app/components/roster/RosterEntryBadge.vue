<script setup lang="ts">
import { computed } from "vue";
import { CalendarDays, Clock, Coffee, Flag, TreePalm } from "lucide-vue-next";
import type { LeaveCode, RosterShift } from "~/types/roster";

const props = defineProps<{
  code: string;
  leaveCode?: LeaveCode | null;
  shift?: Pick<RosterShift, "startTime" | "endTime">;
  khmer?: boolean;
  showDescription?: boolean;
}>();
const leaveDetails = {
  PRD: { icon: Coffee, en: "Day off", km: "ថ្ងៃសម្រាក" },
  PHL: { icon: Flag, en: "Holiday leave", km: "ច្បាប់បុណ្យជាតិ" },
  AL: { icon: TreePalm, en: "Annual leave", km: "ច្បាប់ប្រចាំឆ្នាំ" },
  H1: { icon: Clock, en: "Half-day", km: "កន្លះថ្ងៃ" },
  H2: { icon: Clock, en: "Half-day", km: "កន្លះថ្ងៃ" },
};
const details = computed(() => props.leaveCode ? leaveDetails[props.leaveCode] : null);
const description = computed(() => details.value?.[props.khmer ? "km" : "en"] ?? "");
const time = computed(() => props.shift ? `${props.shift.startTime} – ${props.shift.endTime}` : "");
</script>

<template>
  <span class="roster-entry" :class="'entry-' + (leaveCode?.toLowerCase() || 'shift')" :title="[code, time || description].filter(Boolean).join(' · ')">
    <span class="roster-entry-pill">
      <component :is="details?.icon || CalendarDays" :size="12" class="roster-entry-icon" aria-hidden="true" />
      <span class="roster-entry-code">{{ code }}</span>
    </span>
    <span v-if="time" class="roster-entry-time">{{ time }}</span>
    <span v-else-if="description && showDescription !== false" class="roster-entry-description">{{ description }}</span>
  </span>
</template>

<style scoped>
/* Share the same solid badge palette between the calendar and captured exports. */
.roster-entry {
  --badge-fill: #32776e;
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  max-width: 100%;
  min-width: 0;
  font-size: 10px;
  line-height: 1.5;
}
.entry-prd { --badge-fill: #b91c1c; }
.entry-phl { --badge-fill: #b45309; }
.entry-al { --badge-fill: #7e22ce; }
.entry-h1, .entry-h2 { --badge-fill: #6d28d9; }
.roster-entry-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
  padding: 3px 7px;
  border-radius: 7px;
  background: var(--badge-fill);
  color: #fff;
  font-weight: 800;
}
.roster-entry-icon { flex-shrink: 0; }
.roster-entry-code { min-width: 0; overflow-wrap: anywhere; }
.roster-entry-time {
  color: inherit;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.roster-entry-description {
  color: var(--badge-fill);
  font-size: 9px;
  font-weight: 600;
}
.dark .roster-entry-description { color: var(--ink, #eeeae3); }
@container roster-day (max-width: 155px) {
  .roster-entry-time, .roster-entry-description { display: none; }
}
@container roster-day (max-width: 65px) {
  .roster-entry { font-size: 9px; }
  .roster-entry-pill { padding: 2px 3px; gap: 2px; border-radius: 5px; }
  .roster-entry-icon { width: 10px; height: 10px; }
}
</style>
