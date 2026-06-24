<script setup lang="ts">
type ExpenseShareState =
  | "idle"
  | "busy"
  | "copied"
  | "shared"
  | "ready"
  | "failed";

const props = defineProps<{
  shareState: ExpenseShareState;
}>();

const emit = defineEmits<{
  (e: "reset"): void;
  (e: "share"): void;
}>();

const shareLabel = computed(() => {
  if (props.shareState === "busy") return "Preparing link";
  if (props.shareState === "copied") return "Link copied";
  if (props.shareState === "shared") return "Link shared";
  if (props.shareState === "ready") return "Link ready";
  if (props.shareState === "failed") return "Link unavailable";

  return "Share link";
});

const isShareConfirmed = computed(() =>
  ["copied", "shared", "ready"].includes(props.shareState),
);
</script>

<template>
  <div
    class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
  >
    <div>
      <h1 class="text-xl font-bold leading-tight">Expense Tracker</h1>
      <p class="mt-2 max-w-xl text-gray-600 dark:text-white/60">
        Track your spending with budget + insights. No signup, just vibes.
      </p>
    </div>

    <div class="flex flex-col gap-2 sm:items-end">
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          class="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white sm:w-auto"
          type="button"
          @click="emit('reset')"
        >
          Reset
        </button>

        <button
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100 sm:w-auto"
          type="button"
          :aria-busy="shareState === 'busy'"
          :aria-label="shareLabel"
          :disabled="shareState === 'busy'"
          @click="emit('share')"
        >
          <svg
            v-if="!isShareConfirmed"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a2.5 2.5 0 0 0 0-1.39l7-4.11A2.99 2.99 0 1 0 14 5a2.9 2.9 0 0 0 .05.52l-7 4.11a3 3 0 1 0 0 4.74l7.05 4.11c-.03.17-.05.34-.05.52a3 3 0 1 0 3-2.92Z"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
            />
          </svg>

          <span class="text-sm font-medium">
            {{ shareLabel }}
          </span>
        </button>
      </div>

    </div>
  </div>
</template>
