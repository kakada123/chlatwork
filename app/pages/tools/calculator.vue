<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-lg font-bold">Date Calculator</h1>
      <p class="text-sm text-gray-500">
        Add/subtract dates, find differences, and count workdays (Mon–Fri).
      </p>
    </div>

    <!-- Tabs (inline, no component needed) -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in tabs"
        :key="t.key"
        @click="tab = t.key"
        class="rounded-xl px-3 py-2 text-sm font-semibold border"
        :class="
          tab === t.key
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white hover:bg-gray-50'
        "
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 1) Add/Subtract -->
    <section
      v-if="tab === 'add'"
      class="rounded-2xl border bg-white p-4 shadow-sm space-y-4"
    >
      <h2 class="text-sm font-semibold">Add / Subtract</h2>

      <div class="grid gap-3 md:grid-cols-3">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Base date
          </label>
          <input
            v-model="add.base"
            type="date"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Operation
          </label>
          <select
            v-model="add.op"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          >
            <option value="plus">+</option>
            <option value="minus">-</option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Amount
          </label>
          <input
            v-model.number="add.amount"
            type="number"
            min="0"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="e.g. 10"
          />
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Unit
          </label>
          <select
            v-model="add.unit"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
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
            class="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Calculate
          </button>
          <button
            @click="resetAdd()"
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
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
      class="rounded-2xl border bg-white p-4 shadow-sm space-y-4"
    >
      <h2 class="text-sm font-semibold">Difference between 2 dates</h2>

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            From
          </label>
          <input
            v-model="diff.from"
            type="date"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            To
          </label>
          <input
            v-model="diff.to"
            type="date"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <button
          @click="computeDiff()"
          class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Calculate
        </button>
        <button
          @click="resetDiff()"
          class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
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
      class="rounded-2xl border bg-white p-4 shadow-sm space-y-4"
    >
      <h2 class="text-sm font-semibold">Workdays (Mon–Fri) between 2 dates</h2>

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            From
          </label>
          <input
            v-model="work.from"
            type="date"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            To
          </label>
          <input
            v-model="work.to"
            type="date"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <button
          @click="computeWorkdays()"
          class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Calculate
        </button>
        <button
          @click="resetWork()"
          class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          Clear
        </button>
      </div>

      <ResultBox
        :error="work.error"
        :text="work.resultText"
        @copy="copyText(work.resultText)"
      />

      <p class="text-xs text-gray-500">
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

  const monthsApprox = abs / 30.4375;
  const yearsApprox = abs / 365.25;

  diff.resultText =
    `Days: ${d}\n` +
    `Absolute: ${abs} days (${weeks} weeks ${remDays} days)\n` +
    `Approx: ${monthsApprox.toFixed(2)} months, ${yearsApprox.toFixed(
      2
    )} years`;
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
