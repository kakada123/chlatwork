<script setup lang="ts">
import { Flag, Pause, Play, RotateCcw, Timer } from "lucide-vue-next";
import {
  createStopwatch,
  elapsedStopwatchTime,
  formatStopwatchTime,
  pauseStopwatch,
  recordStopwatchLap,
  resetStopwatch,
  startStopwatch,
} from "~/lib/stopwatch";

useSeoMeta({
  title: "Online Stopwatch with Lap Times - ChlatWork",
  description:
    "Measure elapsed time with a free online stopwatch. Start, pause, resume, reset, and record split and total lap times.",
  ogTitle: "Online Stopwatch - ChlatWork",
  ogDescription: "A simple stopwatch with lap times, right in your browser.",
});

const stopwatch = reactive(createStopwatch());
const elapsedMs = ref(0);
const running = computed(() => stopwatch.startedAt !== null);
const hasSession = computed(
  () => running.value || elapsedMs.value > 0 || stopwatch.laps.length > 0,
);
const status = computed(() =>
  running.value ? "Running" : hasSession.value ? "Paused" : "Ready",
);
const recentLaps = computed(() => [...stopwatch.laps].reverse());
let frame: number | null = null;

function updateDisplay() {
  elapsedMs.value = elapsedStopwatchTime(stopwatch, performance.now());
  frame = requestAnimationFrame(updateDisplay);
}

function stopDisplayUpdates() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
}

function toggleStopwatch() {
  if (running.value) {
    pauseStopwatch(stopwatch, performance.now());
    elapsedMs.value = stopwatch.elapsedMs;
    stopDisplayUpdates();
  } else {
    startStopwatch(stopwatch, performance.now());
    updateDisplay();
  }
}

function addLap() {
  recordStopwatchLap(stopwatch, performance.now());
}

function reset() {
  stopDisplayUpdates();
  resetStopwatch(stopwatch);
  elapsedMs.value = 0;
}

function handleKeydown(event: KeyboardEvent) {
  if (
    (event.code !== "Space" && event.key !== " ") ||
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  )
    return;
  const target = event.target as HTMLElement | null;
  // Focused controls keep native Space behavior, avoiding a second toggle from their click.
  if (
    target?.isContentEditable ||
    target?.closest?.(
      "button, a[href], input, textarea, select, summary, [tabindex]:not([tabindex='-1'])",
    )
  )
    return;
  event.preventDefault();
  if (!event.repeat) toggleStopwatch();
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  stopDisplayUpdates();
});
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 text-slate-950 dark:text-white">
    <header>
      <div class="mb-3 flex items-center gap-2 text-sky-700 dark:text-cyan-200">
        <Timer class="size-5" aria-hidden="true" />
        <span class="text-xs font-bold uppercase tracking-widest"
          >Date &amp; Time</span
        >
      </div>
      <h1 class="text-2xl font-bold sm:text-3xl">Stopwatch</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-white/60">
        Track your time. Pause when you need to, and capture every lap.
      </p>
    </header>

    <section
      aria-label="Stopwatch controls"
      class="rounded-3xl border border-slate-200 bg-white px-4 py-8 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-10"
    >
      <p
        role="status"
        class="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/60"
      >
        <span
          class="mr-1.5 inline-block size-2 rounded-full"
          :class="running ? 'bg-emerald-500' : 'bg-slate-400'"
          aria-hidden="true"
        />
        {{ status }}
      </p>
      <p
        role="timer"
        aria-live="off"
        aria-label="Elapsed time"
        class="my-5 font-mono text-[clamp(1.5rem,6.5vw,4rem)] font-semibold leading-tight tracking-tight tabular-nums"
      >
        {{ formatStopwatchTime(elapsedMs) }}
      </p>
      <p class="text-xs text-slate-400 dark:text-white/40">
        Hours : Minutes : Seconds . Hundredths
      </p>

      <div class="mx-auto mt-8 grid max-w-md grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100"
          @click="toggleStopwatch"
        >
          <component
            :is="running ? Pause : Play"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          {{ running ? "Pause" : hasSession ? "Resume" : "Start" }}
        </button>
        <button
          type="button"
          :disabled="!running"
          class="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
          @click="addLap"
        >
          <Flag class="size-4 shrink-0" aria-hidden="true" />
          Lap
        </button>
        <button
          type="button"
          :disabled="!hasSession"
          class="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
          @click="reset"
        >
          <RotateCcw class="size-4 shrink-0" aria-hidden="true" />
          Reset
        </button>
      </div>
      <p class="mt-4 text-xs text-slate-500 dark:text-white/50">
        Press <kbd class="font-semibold">Space</kbd> to start, pause, or resume.
      </p>
    </section>

    <section
      aria-labelledby="stopwatch-laps-heading"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div
        class="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-white/10 sm:px-6"
      >
        <h2 id="stopwatch-laps-heading" class="text-sm font-bold">Lap times</h2>
        <span role="status" class="text-xs text-slate-500 dark:text-white/50"
          >{{ stopwatch.laps.length }} recorded</span
        >
      </div>
      <div v-if="recentLaps.length" class="max-h-80 overflow-auto">
        <table class="w-full text-left text-xs sm:text-sm">
          <caption class="sr-only">
            Lap splits and total elapsed times, newest first
          </caption>
          <thead
            class="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-white/60"
          >
            <tr>
              <th scope="col" class="px-3 py-3 font-medium sm:px-6">Lap</th>
              <th scope="col" class="px-3 py-3 text-right font-medium sm:px-6">
                Split
              </th>
              <th scope="col" class="px-3 py-3 text-right font-medium sm:px-6">
                Total
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/5">
            <tr v-for="lap in recentLaps" :key="lap.number">
              <th
                scope="row"
                class="px-3 py-3 font-medium text-slate-500 dark:text-white/60 sm:px-6"
              >
                {{ String(lap.number).padStart(2, "0") }}
              </th>
              <td
                class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums sm:px-6"
              >
                {{ formatStopwatchTime(lap.splitMs) }}
              </td>
              <td
                class="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums sm:px-6"
              >
                {{ formatStopwatchTime(lap.totalMs) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p
        v-else
        class="px-6 py-10 text-center text-sm text-slate-500 dark:text-white/50"
      >
        Start the stopwatch, then tap Lap to record a split.
      </p>
    </section>

    <p class="text-center text-xs leading-6 text-slate-400 dark:text-white/40">
      Keep this page open. Resetting, refreshing, or leaving the page clears
      your session.
    </p>
  </div>
</template>
