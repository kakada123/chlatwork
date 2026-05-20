<template>
  <div class="space-y-6 text-slate-950 dark:text-white">
    <div>
      <h1 class="text-lg font-bold text-slate-950 dark:text-white">
        Date Calculator
      </h1>
      <p class="text-sm text-slate-500 dark:text-white/60">
        Add/subtract dates, find differences, and count workdays (Mon–Fri).
      </p>
    </div>

    <!-- Tabs (inline, no component needed) -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in tabs"
        :key="t.key"
        @click="tab = t.key"
        class="rounded-xl border px-3 py-2 text-sm font-semibold transition"
        :class="
          tab === t.key
            ? 'border-slate-950 bg-slate-950 text-white dark:border-cyan-200 dark:bg-cyan-200 dark:text-slate-950'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.11] dark:hover:text-white'
        "
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 1) Add/Subtract -->
    <section
      v-if="tab === 'add'"
      class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-sky-100/60 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20"
    >
      <h2 class="text-sm font-semibold text-slate-950 dark:text-white">
        Add / Subtract
      </h2>

      <div class="grid gap-3 md:grid-cols-3">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50"
          >
            Base date
          </label>
          <ModernDateInput
            v-model="add.base"
            class="mt-1"
            aria-label="Choose base date"
          />
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50"
          >
            Operation
          </label>
          <select
            v-model="add.op"
            class="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:focus:ring-cyan-200/15"
          >
            <option value="plus">+</option>
            <option value="minus">-</option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50"
          >
            Amount
          </label>
          <input
            v-model.number="add.amount"
            type="number"
            min="0"
            class="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:placeholder:text-white/35 dark:focus:ring-cyan-200/15"
            placeholder="e.g. 10"
          />
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50"
          >
            Unit
          </label>
          <select
            v-model="add.unit"
            class="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:focus:ring-cyan-200/15"
          >
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>

        <div class="flex items-end gap-2">
          <button
            @click="computeAdd()"
            class="h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100"
          >
            Calculate
          </button>
          <button
            @click="resetAdd()"
            class="h-11 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/75 dark:hover:bg-white/[0.13] dark:hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>

      <ResultBox
        :error="add.error"
        :text="add.resultText"
        @copy="copyText(add.resultText)"
      />
    </section>

    <!-- 2) Difference -->
    <section
      v-if="tab === 'diff'"
      class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-sky-100/60 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20"
    >
      <h2 class="text-sm font-semibold text-slate-950 dark:text-white">
        Difference between 2 dates
      </h2>

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50"
          >
            From
          </label>
          <ModernDateInput
            v-model="diff.from"
            class="mt-1"
            aria-label="Choose difference start date"
          />
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50"
          >
            To
          </label>
          <ModernDateInput
            v-model="diff.to"
            class="mt-1"
            aria-label="Choose difference end date"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <button
          @click="computeDiff()"
          class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100"
        >
          Calculate
        </button>
        <button
          @click="resetDiff()"
          class="h-11 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/75 dark:hover:bg-white/[0.13] dark:hover:text-white"
        >
          Clear
        </button>
      </div>

      <ResultBox
        :error="diff.error"
        :text="diff.resultText"
        @copy="copyText(diff.resultText)"
      />
    </section>

    <!-- 3) Workdays -->
    <section
      v-if="tab === 'workdays'"
      class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-sky-100/60 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20"
    >
      <h2 class="text-sm font-semibold text-slate-950 dark:text-white">
        Workdays (Mon–Fri) between 2 dates
      </h2>

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50"
          >
            From
          </label>
          <ModernDateInput
            v-model="work.from"
            class="mt-1"
            aria-label="Choose workdays start date"
          />
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50"
          >
            To
          </label>
          <ModernDateInput
            v-model="work.to"
            class="mt-1"
            aria-label="Choose workdays end date"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <button
          @click="computeWorkdays()"
          class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-sky-700 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100"
        >
          Calculate
        </button>
        <button
          @click="resetWork()"
          class="h-11 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/75 dark:hover:bg-white/[0.13] dark:hover:text-white"
        >
          Clear
        </button>
      </div>

      <ResultBox
        :error="work.error"
        :text="work.resultText"
        @copy="copyText(work.resultText)"
      />

      <p class="text-xs text-slate-500 dark:text-white/50">
        Note: Excludes weekends only. Public holidays can be added later.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import ResultBox from "~/components/ResultBox.vue";

import {
  parseDateInput,
  formatDate,
  daysBetween,
  calendarDurationBetween,
  addMonthsSafe,
  addYearsSafe,
  isWeekend,
} from "~/lib/date.utils";

// ✅ SEO for this page
useSeoMeta({
  title: "Date Calculator — ChlatWork",
  description:
    "Add or subtract dates, calculate the difference between two dates, and count workdays (Mon–Fri).",
  ogTitle: "Date Calculator — ChlatWork",
  ogDescription:
    "Add/subtract dates, find differences, and count workdays (Mon–Fri).",
});

const tabs = [
  { key: "add", label: "Add/Subtract" },
  { key: "diff", label: "Difference" },
  { key: "workdays", label: "Workdays" },
] as const;

type TabKey = (typeof tabs)[number]["key"];
const tab = ref<TabKey>("add");

async function copyText(text: string) {
  if (!text) return;
  if (!import.meta.client) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

/** --- Add/Subtract --- */
const add = reactive({
  base: "",
  op: "plus" as "plus" | "minus",
  amount: 0,
  unit: "days" as "days" | "weeks" | "months" | "years",
  resultText: "",
  error: "",
});

function computeAdd() {
  add.error = "";
  add.resultText = "";

  const base = parseDateInput(add.base);
  if (!base) {
    add.error = "Please select a base date.";
    return;
  }

  const amt = Number(add.amount);
  if (!Number.isFinite(amt) || amt < 0) {
    add.error = "Amount must be 0 or more.";
    return;
  }

  const sign = add.op === "plus" ? 1 : -1;
  const n = Math.trunc(amt) * sign;

  let out = new Date(base);

  if (add.unit === "days") out.setDate(out.getDate() + n);
  if (add.unit === "weeks") out.setDate(out.getDate() + n * 7);
  if (add.unit === "months") out = addMonthsSafe(out, n);
  if (add.unit === "years") out = addYearsSafe(out, n);

  add.resultText = `Result date: ${formatDate(out)}\n(${out.toDateString()})`;
}

function resetAdd() {
  add.base = "";
  add.op = "plus";
  add.amount = 0;
  add.unit = "days";
  add.resultText = "";
  add.error = "";
}

/** --- Difference --- */
const diff = reactive({
  from: "",
  to: "",
  resultText: "",
  error: "",
});

function formatDurationPart(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function formatDurationText(duration: {
  years: number;
  months: number;
  days: number;
}) {
  const parts = [
    duration.years ? formatDurationPart(duration.years, "year") : "",
    duration.months ? formatDurationPart(duration.months, "month") : "",
    duration.days ? formatDurationPart(duration.days, "day") : "",
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "0 days";
}

function formatWeeksText(weeks: number, days: number) {
  const weekText = formatDurationPart(weeks, "week");
  if (!days) return weekText;

  return `${weekText} and ${formatDurationPart(days, "day")}`;
}

function computeDiff() {
  diff.error = "";
  diff.resultText = "";

  const from = parseDateInput(diff.from);
  const to = parseDateInput(diff.to);

  if (!from || !to) {
    diff.error = "Please select both dates.";
    return;
  }

  const d = daysBetween(from, to);
  const abs = Math.abs(d);

  const weeks = Math.floor(abs / 7);
  const remDays = abs % 7;

  const calendar = calendarDurationBetween(from, to);
  const calendarText = formatDurationText(calendar);

  const totalDaysText = new Intl.NumberFormat("en-US").format(abs);

  const totalMonths = calendar.years * 12 + calendar.months;
  const monthText = `${formatDurationPart(totalMonths, "month")} and ${formatDurationPart(calendar.days, "day")}`;

  diff.resultText =
    `Duration\n` +
    `${calendarText}\n\n` +
    `That is ${totalDaysText} days total\n\n` +
    `Also equal to\n` +
    `${formatWeeksText(weeks, remDays)}\n` +
    `${monthText}`;
}

function resetDiff() {
  diff.from = "";
  diff.to = "";
  diff.resultText = "";
  diff.error = "";
}

/** --- Workdays --- */
const work = reactive({
  from: "",
  to: "",
  resultText: "",
  error: "",
});

function computeWorkdays() {
  work.error = "";
  work.resultText = "";

  const from = parseDateInput(work.from);
  const to = parseDateInput(work.to);
  if (!from || !to) {
    work.error = "Please select both dates.";
    return;
  }

  const start = from.getTime() <= to.getTime() ? from : to;
  const end = from.getTime() <= to.getTime() ? to : from;

  let totalDays = 0;
  let weekdays = 0;
  let weekends = 0;

  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    totalDays++;
    if (isWeekend(cur)) weekends++;
    else weekdays++;
    cur.setDate(cur.getDate() + 1);
  }

  work.resultText =
    `Range: ${formatDate(start)} → ${formatDate(end)}\n` +
    `Total days (inclusive): ${totalDays}\n` +
    `Workdays (Mon–Fri): ${weekdays}\n` +
    `Weekend days: ${weekends}`;
}

function resetWork() {
  work.from = "";
  work.to = "";
  work.resultText = "";
  work.error = "";
}
</script>
