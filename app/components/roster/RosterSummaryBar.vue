<script setup lang="ts">
import { computed } from "vue";
import { AlertTriangle, Briefcase, CalendarCheck, Clock, FileQuestion, Info } from "lucide-vue-next";
import { toKhmerDigits } from "~/lib/khmer-calendar";
import type { MonthlyRosterSummary } from "~/types/roster";

const props = defineProps<{
  summary: MonthlyRosterSummary;
  khmer: boolean;
}>();

function d(val: number | string) {
  return props.khmer ? toKhmerDigits(val) : String(val);
}

const prdExceeded = computed(() => props.summary.prdRemaining < 0);
const alLow = computed(() => props.summary.alRemaining < 0);
const phlLow = computed(() => props.summary.phlRemaining < 0);
</script>

<template>
  <div class="roster-summary-bar mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <!-- Warnings if limits exceeded -->
    <div
      v-if="prdExceeded || alLow || phlLow"
      class="mb-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
      role="alert"
    >
      <AlertTriangle :size="15" class="shrink-0 text-rose-600 dark:text-rose-400" />
      <span>
        <template v-if="prdExceeded">
          {{ khmer ? `ការឈប់ PRD លើសកូតាប្រចាំខែ (${d(Math.abs(summary.prdRemaining))} ថ្ងៃ)!` : `PRD days exceed monthly allowance by ${Math.abs(summary.prdRemaining)} day(s)!` }}
        </template>
        <template v-if="alLow">
          {{ khmer ? `សមតុល្យ AL មិនគ្រប់គ្រាន់ (${d(summary.alRemaining)} ថ្ងៃ)!` : `Insufficient AL balance (${summary.alRemaining} days)!` }}
        </template>
        <template v-if="phlLow">
          {{ khmer ? `សមតុល្យ PHL មិនគ្រប់គ្រាន់ (${d(summary.phlRemaining)} ថ្ងៃ)!` : `Insufficient PHL balance (${summary.phlRemaining} days)!` }}
        </template>
      </span>
    </div>

    <!-- Metrics Cards Grid -->
    <div class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7">
      <!-- Working Days -->
      <div class="rounded-lg border border-slate-200/90 bg-slate-100 p-2.5 dark:border-zinc-700/80 dark:bg-zinc-800">
        <span class="flex items-center gap-1.5 text-[11px] font-bold text-teal-700 dark:text-teal-300">
          <Briefcase :size="13" class="text-teal-600 dark:text-teal-400" />
          {{ khmer ? "ថ្ងៃធ្វើការ" : "Work Days" }}
        </span>
        <strong class="summary-val mt-1.5 block text-lg font-extrabold text-slate-900 dark:text-zinc-50">
          {{ d(summary.workingDays) }} <span class="text-xs font-semibold text-slate-700 dark:text-zinc-300">{{ khmer ? "ថ្ងៃ" : "days" }}</span>
        </strong>
      </div>

      <!-- PRD Used / Allowance -->
      <div
        class="rounded-lg border p-2.5"
        :class="prdExceeded
          ? 'border-rose-400 bg-rose-100 text-rose-950 dark:border-rose-600 dark:bg-rose-950/70 dark:text-rose-100'
          : 'border-slate-200/90 bg-slate-100 dark:border-zinc-700/80 dark:bg-zinc-800'"
      >
        <span class="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
          <span class="h-2 w-2 rounded-full bg-rose-600 dark:bg-rose-400" />
          PRD (Day Off)
        </span>
        <div class="summary-val mt-1.5 flex items-baseline justify-between">
          <strong class="text-lg font-extrabold text-slate-900 dark:text-zinc-50">
            {{ d(summary.prdUsed) }} / {{ d(summary.prdAllowance) }}
          </strong>
          <span
            class="text-[11px] font-semibold"
            :class="prdExceeded ? 'font-bold text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-zinc-300'"
          >
            {{ d(summary.prdRemaining) }} {{ khmer ? "សល់" : "left" }}
          </span>
        </div>
      </div>

      <!-- PHL -->
      <div class="rounded-lg border border-slate-200/90 bg-slate-100 p-2.5 dark:border-zinc-700/80 dark:bg-zinc-800">
        <span class="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
          <span class="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
          PHL
        </span>
        <div class="summary-val mt-1.5 flex items-baseline justify-between">
          <strong class="summary-val text-lg font-extrabold text-slate-900 dark:text-zinc-50">{{ d(summary.phlUsed) }}</strong>
          <span class="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">
            {{ d(summary.phlRemaining) }} {{ khmer ? "សល់" : "left" }}
          </span>
        </div>
      </div>

      <!-- AL -->
      <div class="rounded-lg border border-slate-200/90 bg-slate-100 p-2.5 dark:border-zinc-700/80 dark:bg-zinc-800">
        <span class="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
          <span class="h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400" />
          AL (Annual)
        </span>
        <div class="summary-val mt-1.5 flex items-baseline justify-between">
          <strong class="summary-val text-lg font-extrabold text-slate-900 dark:text-zinc-50">{{ d(summary.alUsed) }}</strong>
          <span class="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">
            {{ d(summary.alRemaining) }} {{ khmer ? "សល់" : "left" }}
          </span>
        </div>
      </div>

      <!-- H1 / H2 Half Days -->
      <div class="rounded-lg border border-slate-200/90 bg-slate-100 p-2.5 dark:border-zinc-700/80 dark:bg-zinc-800">
        <span class="flex items-center gap-1.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
          <Clock :size="13" />
          H1 / H2
        </span>
        <strong class="summary-val mt-1.5 block text-lg font-extrabold text-slate-900 dark:text-zinc-50">
          {{ d(summary.halfDaysCount) }} <span class="text-xs font-semibold text-slate-700 dark:text-zinc-200">{{ khmer ? "កន្លះថ្ងៃ" : "half-days" }}</span>
        </strong>
      </div>

      <!-- Pending Requests -->
      <div class="rounded-lg border border-slate-200/90 bg-slate-100 p-2.5 dark:border-zinc-700/80 dark:bg-zinc-800">
        <span class="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
          <CalendarCheck :size="13" />
          {{ khmer ? "រង់ចាំបញ្ជាក់" : "Pending" }}
        </span>
        <strong class="summary-val mt-1.5 block text-lg font-extrabold text-slate-900 dark:text-zinc-50">
          {{ d(summary.pendingRequests) }}
        </strong>
      </div>

      <!-- Unassigned Days -->
      <div class="rounded-lg border border-slate-200/90 bg-slate-100 p-2.5 dark:border-zinc-700/80 dark:bg-zinc-800">
        <span class="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-zinc-300">
          <FileQuestion :size="13" />
          {{ khmer ? "មិនទាន់កំណត់" : "Unassigned" }}
        </span>
        <strong class="summary-val mt-1.5 block text-lg font-extrabold text-slate-900 dark:text-zinc-50">
          {{ d(summary.unassignedDays) }}
        </strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roster-summary-bar,
.roster-summary-bar * {
  font-family: "Hanuman", "Helvetica Neue", Helvetica, Arial, sans-serif !important;
}
</style>
